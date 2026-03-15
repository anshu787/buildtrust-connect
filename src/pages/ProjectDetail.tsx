import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Loader2, MapPin, Calendar, IndianRupee, CheckCircle,
  Play, Flag, Star, ShieldCheck, Award
} from "lucide-react";
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

interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  open: { label: "Open", variant: "default", color: "hsl(var(--chart-1))" },
  awarded: { label: "Awarded", variant: "secondary", color: "hsl(var(--chart-3))" },
  in_progress: { label: "In Progress", variant: "secondary", color: "hsl(var(--chart-2))" },
  completed: { label: "Completed", variant: "outline", color: "hsl(var(--accent))" },
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const { data: proj } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
    setProject(proj);
    if (proj) {
      const [quotesRes, milestonesRes, filesRes, reviewsRes] = await Promise.all([
        supabase.from("quotes").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("milestones").select("*").eq("project_id", id).order("order_index"),
        supabase.from("project_files").select("*").eq("project_id", id).order("created_at"),
        supabase.from("reviews").select("*").eq("project_id", id),
      ]);
      setQuotes(quotesRes.data || []);
      setMilestones(milestonesRes.data || []);
      setFiles((filesRes.data as ProjectFile[]) || []);
      setReviews((reviewsRes.data as Review[]) || []);
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
    fetchData();
  };

  const handleStatusTransition = async (newStatus: string) => {
    const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", id!);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Project marked as ${newStatus.replace("_", " ")}!` });
    setProject((p) => p ? { ...p, status: newStatus } : p);
  };

  const handleSubmitReview = async () => {
    if (!user || !project) return;
    setSubmittingReview(true);
    const acceptedQuote = quotes.find((q) => q.status === "accepted");
    const revieweeId = isBuilder ? acceptedQuote?.contractor_id : project.builder_id;
    if (!revieweeId) { setSubmittingReview(false); return; }

    const { error } = await supabase.from("reviews").insert({
      project_id: project.id,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating: reviewRating,
      comment: reviewComment || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review submitted!" });
      setReviewOpen(false);
      setReviewComment("");
      setReviewRating(5);
      fetchData();
    }
    setSubmittingReview(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!project) return <div className="flex items-center justify-center p-12"><p>Project not found.</p></div>;

  const isBuilder = role === "builder" && user?.id === project.builder_id;
  const isAcceptedContractor = quotes.some((q) => q.contractor_id === user?.id && q.status === "accepted");
  const hasReviewed = reviews.some((r) => r.reviewer_id === user?.id);
  const canReview = project.status === "completed" && (isBuilder || isAcceptedContractor) && !hasReviewed;
  const statusConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.open;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="container max-w-4xl py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>

      {/* Project Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-display text-2xl">{project.title}</CardTitle>
              <CardDescription className="mt-1">{project.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {project.status === "completed" && (
                <Badge variant="outline" className="gap-1 border-accent text-accent">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
              <Badge
                variant={statusConf.variant}
                className="capitalize"
                style={{ borderColor: statusConf.color }}
              >
                {statusConf.label}
              </Badge>
            </div>
          </div>

          {/* Workflow Actions */}
          {isBuilder && (
            <div className="flex gap-2 mt-4">
              {project.status === "awarded" && (
                <Button size="sm" onClick={() => handleStatusTransition("in_progress")} className="gap-1">
                  <Play className="h-3 w-3" /> Start Project
                </Button>
              )}
              {project.status === "in_progress" && (
                <Button size="sm" onClick={() => handleStatusTransition("completed")} className="gap-1">
                  <Flag className="h-3 w-3" /> Mark Completed
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {project.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {project.location}</span>}
            {project.timeline && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {project.timeline}</span>}
            {(project.budget_min || project.budget_max) && (
              <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4" />
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

      {/* Project Files */}
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
                    <Badge variant="outline" className="text-xs">₹{Number(m.amount).toLocaleString()}</Badge>
                  )}
                  <Badge variant={m.status === "completed" ? "default" : "secondary"} className="text-xs">{m.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quotes */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">{isBuilder ? `Quotes Received (${quotes.length})` : "Your Quotes"}</h2>
        {role === "contractor" && project.status === "open" && <Button asChild><Link to={`/projects/${id}/submit-quote`}>Submit Quote</Link></Button>}
      </div>
      {quotes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No quotes yet.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Total Price</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Status</TableHead>
                {isBuilder && project.status === "open" && <TableHead>Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-semibold">₹{Number(q.total_price).toLocaleString()}</TableCell>
                  <TableCell>{q.timeline || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{q.materials || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={q.status === "accepted" ? "default" : q.status === "rejected" ? "destructive" : "secondary"}>
                      {q.status}
                    </Badge>
                  </TableCell>
                  {isBuilder && project.status === "open" && (
                    <TableCell>
                      <Button size="sm" onClick={() => handleAward(q.id)}>
                        <CheckCircle className="mr-1 h-3 w-3" /> Award
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Reviews & Ratings Section */}
      {(project.status === "completed" || reviews.length > 0) && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <Award className="h-5 w-5 text-chart-3" /> Reviews & Ratings
                {avgRating && (
                  <Badge variant="outline" className="ml-2 gap-1 text-chart-3 border-chart-3/30">
                    <Star className="h-3 w-3 fill-chart-3 text-chart-3" /> {avgRating}
                  </Badge>
                )}
              </CardTitle>
              {canReview && (
                <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Star className="h-3 w-3" /> Leave Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rate this {isBuilder ? "Contractor" : "Builder"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <p className="text-sm font-medium mb-2">Rating</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setReviewRating(s)} className="p-1 transition-transform hover:scale-110">
                              <Star className={`h-7 w-7 ${s <= reviewRating ? "fill-chart-3 text-chart-3" : "text-muted-foreground/30"}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Comment (optional)</p>
                        <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience..." />
                      </div>
                      <Button onClick={handleSubmitReview} disabled={submittingReview} className="w-full">
                        {submittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Submit Review
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg border p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {r.reviewer_id === project.builder_id ? "B" : "C"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{r.reviewer_id === project.builder_id ? "Builder" : "Contractor"}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-chart-3 text-chart-3" : "text-muted-foreground/20"}`} />
                          ))}
                        </div>
                        {r.reviewer_id === project.builder_id && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 border-accent text-accent">
                            <ShieldCheck className="h-2.5 w-2.5" /> Verified
                          </Badge>
                        )}
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
