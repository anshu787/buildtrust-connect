import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Lock, Unlock, Shield } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import NFTCertificateDisplay from "@/components/NFTCertificateDisplay";
import OnChainEscrow from "@/components/OnChainEscrow";
import WalletConnect from "@/components/WalletConnect";

type Project = Tables<"projects">;
type Milestone = Tables<"milestones">;

export default function EscrowDashboard() {
  const { user, role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Fetch wallet address
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("user_id", user.id)
        .single();
      setWalletAddress(profile?.wallet_address || null);

      let projs: Project[] = [];
      if (role === "builder") {
        const { data } = await supabase.from("projects").select("*").eq("builder_id", user.id).in("status", ["awarded", "in_progress", "completed"]);
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
    fetchData();
  }, [user, role]);

  // Derive NFT certificates from completed milestones
  const allMilestones = Object.entries(milestones).flatMap(([projId, ms]) => {
    const proj = projects.find((p) => p.id === projId);
    return ms.map((m) => ({ ...m, projectTitle: proj?.title || "Unknown" }));
  });

  const nftCertificates = allMilestones
    .filter((m) => m.status === "approved" || m.status === "completed")
    .map((m) => ({
      id: m.id,
      projectTitle: m.projectTitle,
      milestoneTitle: m.title,
      completedAt: m.updated_at,
      status: walletAddress ? ("ready" as const) : ("pending" as const),
    }));

  // Derive escrow items from milestones with amounts
  const escrowItems = allMilestones
    .filter((m) => m.amount && Number(m.amount) > 0)
    .map((m) => ({
      id: m.id,
      milestoneTitle: m.title,
      projectTitle: m.projectTitle,
      amount: Number(m.amount),
      status: (m.status === "approved" || m.status === "completed"
        ? "released"
        : m.status === "in_progress"
        ? "pending_release"
        : "locked") as "locked" | "pending_release" | "released" | "disputed",
      lockedAt: m.created_at,
      releasedAt: m.status === "approved" ? m.updated_at : undefined,
    }));

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Escrow Dashboard</h1>
      </div>
      <p className="text-muted-foreground mb-8">Track milestone-based fund locks, releases, and blockchain certificates.</p>

      {/* Wallet Connection */}
      <div className="mb-6">
        <WalletConnect
          userId={user!.id}
          walletAddress={walletAddress}
          onConnected={setWalletAddress}
        />
      </div>

      {/* On-Chain Escrow */}
      <div className="mb-6">
        <OnChainEscrow escrows={escrowItems} walletConnected={!!walletAddress} />
      </div>

      {/* NFT Certificates */}
      <div className="mb-6">
        <NFTCertificateDisplay certificates={nftCertificates} walletConnected={!!walletAddress} />
      </div>

      {/* Traditional Escrow View */}
      {projects.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No projects with escrow activity yet.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {projects.map((p) => {
            const ms = milestones[p.id] || [];
            const totalFunds = ms.reduce((s, m) => s + Number(m.amount || 0), 0);
            const releasedFunds = ms.filter((m) => m.status === "approved").reduce((s, m) => s + Number(m.amount || 0), 0);
            const lockedFunds = totalFunds - releasedFunds;
            const pct = totalFunds > 0 ? Math.round((releasedFunds / totalFunds) * 100) : 0;

            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="font-display">{p.title}</CardTitle>
                  <CardDescription>{p.location || "No location"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3 mb-4">
                    <div className="rounded-lg border p-4 text-center">
                      <Lock className="h-5 w-5 mx-auto text-destructive mb-1" />
                      <p className="text-xs text-muted-foreground">Locked</p>
                      <p className="text-xl font-bold">${lockedFunds.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <Unlock className="h-5 w-5 mx-auto text-accent mb-1" />
                      <p className="text-xs text-muted-foreground">Released</p>
                      <p className="text-xl font-bold">${releasedFunds.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <Shield className="h-5 w-5 mx-auto text-primary mb-1" />
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">${totalFunds.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fund Release Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                  {ms.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {ms.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                          <span>{m.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">${Number(m.amount || 0).toLocaleString()}</span>
                            <Badge variant={m.status === "approved" ? "default" : "secondary"}>
                              {m.status === "approved" ? "Released" : "Locked"}
                            </Badge>
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
