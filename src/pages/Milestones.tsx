import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import {
  CheckCircle, Clock, Loader2, Send, XCircle, AlertCircle,
  ArrowRight, IndianRupee, Wallet, FileCheck, HardHat, ShieldCheck,
  ChevronDown, ChevronUp
} from "lucide-react";
import { sendNotification } from "@/lib/notifications";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type Milestone = Tables<"milestones">;

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-5 w-5 text-muted-foreground" />,
  submitted: <Send className="h-5 w-5 text-chart-3" />,
  approved: <CheckCircle className="h-5 w-5 text-accent" />,
  rejected: <XCircle className="h-5 w-5 text-destructive" />,
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  submitted: "outline",
  approved: "default",
  rejected: "destructive",
};

const glassCard = "rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.08)]";

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Builder Creates Project",
    description: "Builder posts a project with milestones and budget in ₹.",
    icon: <HardHat className="h-5 w-5" />,
    forRole: "both",
  },
  {
    step: 2,
    title: "Contractor Submits Quote",
    description: "Contractor reviews the project, submits a quote with pricing.",
    icon: <FileCheck className="h-5 w-5" />,
    forRole: "both",
  },
  {
    step: 3,
    title: "Builder Awards & Starts Project",
    description: "Builder accepts a quote, awards the project, and clicks 'Start Project'.",
    icon: <CheckCircle className="h-5 w-5" />,
    forRole: "both",
  },
  {
    step: 4,
    title: "Contractor Completes Work & Submits Milestone",
    description: "After completing work, contractor clicks 'Submit for Review' on each milestone.",
    icon: <Send className="h-5 w-5" />,
    forRole: "contractor",
  },
  {
    step: 5,
    title: "Builder Reviews & Approves Milestone",
    description: "Builder verifies the work and clicks 'Approve' (or 'Reject' with feedback).",
    icon: <ShieldCheck className="h-5 w-5" />,
    forRole: "builder",
  },
  {
    step: 6,
    title: "Builder Releases Funds via Escrow",
    description: "After approval, builder goes to Escrow Dashboard to deposit & release Sepolia ETH to the contractor's wallet.",
    icon: <Wallet className="h-5 w-5" />,
    forRole: "both",
  },
];

export default function Milestones() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);

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

  const refreshMilestones = async (projectId: string) => {
    const { data } = await supabase.from("milestones").select("*").eq("project_id", projectId).order("order_index");
    setMilestones((prev) => ({ ...prev, [projectId]: data || [] }));
  };

  const submitMilestone = async (milestone: Milestone) => {
    setActionLoading(milestone.id);
    const { error } = await supabase.from("milestones").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", milestone.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Milestone submitted for review!" });
      const project = projects.find(p => p.id === milestone.project_id);
      if (project) {
        sendNotification({
          type: "milestone_approved",
          title: "Milestone Submitted for Review",
          message: `Contractor submitted "${milestone.title}" for review on project "${project.title}".`,
          recipientUserId: project.builder_id,
        });
      }
      await refreshMilestones(milestone.project_id);
    }
    setActionLoading(null);
  };

  const approveMilestone = async (milestone: Milestone) => {
    setActionLoading(milestone.id);
    const { error } = await supabase.from("milestones").update({
      status: "approved",
      approved_at: new Date().toISOString(),
    }).eq("id", milestone.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Milestone approved! Go to Escrow to release funds.", description: "Navigate to Escrow Dashboard to deposit & release ETH." });
      sendNotification({
        type: "milestone_approved",
        title: "Milestone Approved",
        message: `"${milestone.title}" has been approved. Funds can now be released via Escrow.`,
        metadata: { project_id: milestone.project_id },
      });
      await refreshMilestones(milestone.project_id);
    }
    setActionLoading(null);
  };

  const rejectMilestone = async (milestone: Milestone) => {
    setActionLoading(milestone.id);
    const { error } = await supabase.from("milestones").update({
      status: "rejected",
      rejection_comment: rejectComment || null,
    }).eq("id", milestone.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Milestone rejected." });
      sendNotification({
        type: "milestone_approved",
        title: "Milestone Rejected",
        message: `"${milestone.title}" was rejected. ${rejectComment ? `Reason: ${rejectComment}` : "Please review and resubmit."}`,
        metadata: { project_id: milestone.project_id },
      });
      await refreshMilestones(milestone.project_id);
    }
    setActionLoading(null);
    setRejectOpen(null);
    setRejectComment("");
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="font-display text-3xl font-bold mb-2">Milestone Tracker</h1>
      <p className="text-muted-foreground mb-4">
        {role === "contractor"
          ? "Submit completed milestones for builder review."
          : "Review and approve submitted milestones, then release funds via Escrow."}
      </p>

      {/* Transaction Flow Guide */}
      <Card className={`${glassCard} mb-8`}>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowWorkflow(!showWorkflow)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              How the Transaction Flow Works
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              {showWorkflow ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showWorkflow && (
          <CardContent>
            <div className="relative">
              {WORKFLOW_STEPS.map((ws, i) => (
                <div key={ws.step} className="flex gap-4 mb-4 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                      ws.forRole === role || ws.forRole === "both"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-muted/50 text-muted-foreground"
                    }`}>
                      {ws.icon}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="w-0.5 h-full min-h-[16px] bg-border mt-1" />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className={`text-sm font-semibold ${
                      ws.forRole === role || ws.forRole === "both" ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      Step {ws.step}: {ws.title}
                      {ws.forRole !== "both" && (
                        <Badge variant="outline" className="ml-2 text-[10px] capitalize">{ws.forRole}</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ws.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Currency Note:</strong> Project budgets & milestones are tracked in <strong>₹ (INR)</strong> off-chain.
                Blockchain escrow uses <strong>Sepolia testnet ETH</strong> for demonstration.
                The ETH amount you deposit is symbolic — it proves the escrow mechanism on-chain while ₹ values track the real contract.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {projects.length === 0 ? (
        <Card className={glassCard}><CardContent className="py-8 text-center text-muted-foreground">No awarded projects with milestones yet.</CardContent></Card>
      ) : (
        <div className="space-y-8">
          {projects.map((p) => {
            const ms = milestones[p.id] || [];
            const approved = ms.filter((m) => m.status === "approved").length;
            const submitted = ms.filter((m) => m.status === "submitted").length;
            const pct = ms.length > 0 ? Math.round((approved / ms.length) * 100) : 0;
            const hasApproved = approved > 0;

            return (
              <Card key={p.id} className={glassCard}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display">{p.title}</CardTitle>
                      <CardDescription>{p.location}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {submitted > 0 && (
                        <Badge variant="outline" className="gap-1 border-chart-3 text-chart-3">
                          <AlertCircle className="h-3 w-3" /> {submitted} pending review
                        </Badge>
                      )}
                      <Badge variant="secondary">{pct}% Complete</Badge>
                    </div>
                  </div>
                  <Progress value={pct} className="mt-3" />

                  {/* Escrow action link for builder after approvals */}
                  {role === "builder" && hasApproved && (
                    <div className="mt-3 flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="gap-1 border-primary/30 text-primary hover:bg-primary/5">
                        <Link to="/escrow">
                          <Wallet className="h-3 w-3" /> Release Funds via Escrow
                        </Link>
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {approved} milestone{approved > 1 ? "s" : ""} approved — ready for fund release
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {ms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No milestones defined yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {ms.map((m) => {
                        const mAny = m as any;
                        return (
                          <div key={m.id} className={`rounded-xl border p-4 transition-all ${m.status === "submitted" ? "border-chart-3/50 bg-chart-3/5" : m.status === "rejected" ? "border-destructive/30 bg-destructive/5" : m.status === "approved" ? "border-accent/30 bg-accent/5" : ""}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/50 text-sm font-bold">
                                  {STATUS_ICON[m.status] || STATUS_ICON.pending}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{m.title}</p>
                                  {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                                  {mAny.rejection_comment && m.status === "rejected" && (
                                    <div className="mt-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
                                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                      <span><strong>Rejection reason:</strong> {mAny.rejection_comment}</span>
                                    </div>
                                  )}
                                  {m.status === "approved" && (
                                    <div className="mt-2 rounded-lg bg-accent/10 p-2.5 text-xs text-accent flex items-start gap-2">
                                      <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                      <span><strong>Approved!</strong> {role === "builder" ? "Head to Escrow Dashboard to release funds." : "Builder will release funds via Escrow."}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {m.amount && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <IndianRupee className="h-3 w-3" />₹{Number(m.amount).toLocaleString()}
                                  </Badge>
                                )}
                                <Badge variant={STATUS_VARIANT[m.status] || "secondary"} className="text-xs capitalize">{m.status}</Badge>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 mt-3">
                              {/* Contractor: Submit for review */}
                              {role === "contractor" && (m.status === "pending" || m.status === "rejected") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  disabled={actionLoading === m.id}
                                  onClick={() => submitMilestone(m)}
                                >
                                  {actionLoading === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                  Submit for Review
                                </Button>
                              )}

                              {/* Builder: Approve */}
                              {role === "builder" && m.status === "submitted" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="gap-1"
                                    disabled={actionLoading === m.id}
                                    onClick={() => approveMilestone(m)}
                                  >
                                    {actionLoading === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                    Approve
                                  </Button>

                                  {/* Builder: Reject */}
                                  <Dialog open={rejectOpen === m.id} onOpenChange={(o) => { setRejectOpen(o ? m.id : null); setRejectComment(""); }}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="destructive" className="gap-1">
                                        <XCircle className="h-3 w-3" /> Reject
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Reject Milestone: {m.title}</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 pt-2">
                                        <Textarea
                                          value={rejectComment}
                                          onChange={(e) => setRejectComment(e.target.value)}
                                          placeholder="Explain why this milestone is being rejected..."
                                        />
                                        <Button
                                          variant="destructive"
                                          className="w-full"
                                          onClick={() => rejectMilestone(m)}
                                          disabled={actionLoading === m.id}
                                        >
                                          {actionLoading === m.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                          Confirm Rejection
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </>
                              )}

                              {/* Builder: Link to Escrow for approved milestones */}
                              {role === "builder" && m.status === "approved" && (
                                <Button asChild size="sm" variant="outline" className="gap-1">
                                  <Link to="/escrow">
                                    <Wallet className="h-3 w-3" /> Go to Escrow
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
