import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MapPin, Calendar, DollarSign, CheckCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import ProjectFileGallery from "@/components/ProjectFileGallery";

type Project = Tables<"projects">;
type Quote = Tables<"quotes">;
type Milestone = Tables<"milestones">;

interface ProjectFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  milestone_id: string | null;
  created_at: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    const { data: proj } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
    setProject(proj);
    if (proj) {
      const [quotesRes, milestonesRes, filesRes] = await Promise.all([
        supabase.from("quotes").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("milestones").select("*").eq("project_id", id).order("order_index"),
        supabase.from("project_files").select("*").eq("project_id", id).order("created_at"),
      ]);
      setQuotes(quotesRes.data || []);
      setMilestones(milestonesRes.data || []);
      setFiles((filesRes.data as ProjectFile[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleAward = async (quoteId: string) => {
    const { error: qErr } = await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteId);
    if (qErr) { toast({ title: "Error", description: qErr.message, variant: "destructive" }); return; }
    await supabase.from("quotes").update({ status: "rejected" }).eq("project_id", id!).neq("id", quoteId);
    await supabase.from("projects").update({ status: "awarded" }).eq("id", id!);
    toast({ title: "Project awarded!" });
    const { data: q } = await supabase.from("quotes").select("*").eq("project_id", id!).order("created_at", { ascending: false });
    setQuotes(q || []);
    setProject((p) => p ? { ...p, status: "awarded" } : p);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!project) return <div className="flex items-center justify-center p-12"><p>Project not found.</p></div>;

  const isBuilder = role === "builder" && user?.id === project.builder_id;

  return (
    <div className="container max-w-4xl py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div><CardTitle className="font-display text-2xl">{project.title}</CardTitle><CardDescription className="mt-1">{project.description}</CardDescription></div>
            <Badge variant={project.status === "open" ? "default" : "secondary"}>{project.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {project.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {project.location}</span>}
            {project.timeline && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {project.timeline}</span>}
            {(project.budget_min || project.budget_max) && (
              <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />
                {project.budget_min && `₹${Number(project.budget_min).toLocaleString()}`}
                {project.budget_min && project.budget_max && " – "}
                {project.budget_max && `₹${Number(project.budget_max).toLocaleString()}`}
              </span>
            )}
            {project.start_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Start: {project.start_date}</span>}
            {project.end_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> End: {project.end_date}</span>}
          </div>
        </CardContent>
      </Card>

      {/* BIM Viewer & Project Files */}
      <div className="mb-8">
        <ProjectFileGallery
          files={files}
          milestones={milestones.map((m) => ({ id: m.id, title: m.title }))}
          canEdit={isBuilder}
          projectId={id!}
          onFileUpdated={fetchData}
        />
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-display text-xl">Milestones ({milestones.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                  {m.amount && (
                    <Badge variant="outline" className="text-xs">
                      ₹{Number(m.amount).toLocaleString()}
                    </Badge>
                  )}
                  <Badge variant={m.status === "completed" ? "default" : "secondary"} className="text-xs">
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">{isBuilder ? `Quotes Received (${quotes.length})` : "Your Quotes"}</h2>
        {role === "contractor" && project.status === "open" && <Button asChild><Link to={`/projects/${id}/submit-quote`}>Submit Quote</Link></Button>}
      </div>
      {quotes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No quotes yet.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Total Price</TableHead><TableHead>Timeline</TableHead><TableHead>Materials</TableHead><TableHead>Status</TableHead>{isBuilder && project.status === "open" && <TableHead>Action</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-semibold">₹{Number(q.total_price).toLocaleString()}</TableCell>
                  <TableCell>{q.timeline || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{q.materials || "—"}</TableCell>
                  <TableCell><Badge variant={q.status === "accepted" ? "default" : q.status === "rejected" ? "destructive" : "secondary"}>{q.status}</Badge></TableCell>
                  {isBuilder && project.status === "open" && <TableCell><Button size="sm" onClick={() => handleAward(q.id)}><CheckCircle className="mr-1 h-3 w-3" /> Award</Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
