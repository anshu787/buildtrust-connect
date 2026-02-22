import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type Milestone = Tables<"milestones">;

export default function Milestones() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      let projs: Project[] = [];
      if (role === "builder") {
        const { data } = await supabase.from("projects").select("*").eq("builder_id", user.id).in("status", ["awarded", "in_progress"]);
        projs = data || [];
      } else {
        const { data: quotes } = await supabase.from("quotes").select("project_id").eq("contractor_id", user.id).eq("status", "accepted");
        if (quotes && quotes.length > 0) {
          const ids = quotes.map((q) => q.project_id);
          const { data } = await supabase.from("projects").select("*").in("id", ids);
          projs = data || [];
        }
      }
      setProjects(projs);

      if (projs.length > 0) {
        const ids = projs.map((p) => p.id);
        const { data: ms } = await supabase.from("milestones").select("*").in("project_id", ids).order("order_index");
        const grouped: Record<string, Milestone[]> = {};
        (ms || []).forEach((m) => {
          if (!grouped[m.project_id]) grouped[m.project_id] = [];
          grouped[m.project_id].push(m);
        });
        setMilestones(grouped);
      }
      setLoading(false);
    };
    fetch();
  }, [user, role]);

  const approveMilestone = async (milestoneId: string, projectId: string) => {
    const { error } = await supabase.from("milestones").update({ status: "approved" }).eq("id", milestoneId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Milestone approved!" });
    // Refresh
    const { data } = await supabase.from("milestones").select("*").eq("project_id", projectId).order("order_index");
    setMilestones((prev) => ({ ...prev, [projectId]: data || [] }));
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-bold mb-2">Milestone Tracker</h1>
      <p className="text-muted-foreground mb-8">Track and manage project milestones and progress.</p>

      {projects.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No awarded projects with milestones yet.</CardContent></Card>
      ) : (
        <div className="space-y-8">
          {projects.map((p) => {
            const ms = milestones[p.id] || [];
            const approved = ms.filter((m) => m.status === "approved").length;
            const pct = ms.length > 0 ? Math.round((approved / ms.length) * 100) : 0;

            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display">{p.title}</CardTitle>
                      <CardDescription>{p.location}</CardDescription>
                    </div>
                    <Badge variant="secondary">{pct}% Complete</Badge>
                  </div>
                  <Progress value={pct} className="mt-3" />
                </CardHeader>
                <CardContent>
                  {ms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No milestones defined yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {ms.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            {m.status === "approved" ? (
                              <CheckCircle className="h-5 w-5 text-accent" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{m.title}</p>
                              {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {m.amount && <span className="text-sm font-medium">₹{Number(m.amount).toLocaleString()}</span>}
                            <Badge variant={m.status === "approved" ? "default" : "secondary"}>{m.status}</Badge>
                            {role === "builder" && m.status !== "approved" && (
                              <Button size="sm" onClick={() => approveMilestone(m.id, p.id)}>Approve</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
