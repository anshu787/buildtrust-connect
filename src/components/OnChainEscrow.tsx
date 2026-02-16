import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, Unlock, ArrowUpRight, Clock, CheckCircle2, AlertCircle, Wallet } from "lucide-react";

interface EscrowItem {
  id: string;
  milestoneTitle: string;
  projectTitle: string;
  amount: number;
  status: "locked" | "pending_release" | "released" | "disputed";
  lockedAt?: string;
  releasedAt?: string;
}

interface Props {
  escrows: EscrowItem[];
  walletConnected: boolean;
}

const statusConfig: Record<string, { icon: typeof Lock; label: string; color: string }> = {
  locked: { icon: Lock, label: "Locked", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  pending_release: { icon: Clock, label: "Pending Release", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  released: { icon: Unlock, label: "Released", color: "bg-green-500/10 text-green-700 border-green-200" },
  disputed: { icon: AlertCircle, label: "Disputed", color: "bg-red-500/10 text-red-700 border-red-200" },
};

export default function OnChainEscrow({ escrows, walletConnected }: Props) {
  const totalLocked = escrows
    .filter((e) => e.status === "locked" || e.status === "pending_release")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalReleased = escrows
    .filter((e) => e.status === "released")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalValue = escrows.reduce((sum, e) => sum + e.amount, 0);
  const releasePercent = totalValue > 0 ? (totalReleased / totalValue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle className="font-display text-xl">On-Chain Escrow</CardTitle>
        </div>
        <CardDescription>
          Smart contract-managed escrow for secure milestone-based payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!walletConnected && (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Connect your wallet to manage escrow funds.</p>
          </div>
        )}

        {/* Summary Stats */}
        {escrows.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-blue-500/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">Locked</p>
                <p className="text-lg font-bold text-blue-700">${totalLocked.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-green-500/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">Released</p>
                <p className="text-lg font-bold text-green-700">${totalReleased.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">${totalValue.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Release Progress</span>
                <span>{releasePercent.toFixed(0)}%</span>
              </div>
              <Progress value={releasePercent} className="h-2" />
            </div>
          </div>
        )}

        {/* Escrow Items */}
        {escrows.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            <Lock className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No escrow funds</p>
            <p className="text-xs text-muted-foreground mt-1">
              Escrow entries are created when milestones are funded.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {escrows.map((escrow) => {
              const config = statusConfig[escrow.status];
              const StatusIcon = config.icon;

              return (
                <div key={escrow.id} className="rounded-lg border bg-card p-4 hover:bg-accent/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <StatusIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{escrow.milestoneTitle}</p>
                      <p className="text-xs text-muted-foreground">{escrow.projectTitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                        {escrow.lockedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            Locked {new Date(escrow.lockedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">${escrow.amount.toLocaleString()}</p>
                      {escrow.status === "locked" && walletConnected && (
                        <Button size="sm" variant="outline" className="mt-1 text-xs h-7 gap-1">
                          <ArrowUpRight className="h-3 w-3" /> Release
                        </Button>
                      )}
                      {escrow.status === "pending_release" && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-yellow-600">
                          <Clock className="h-3 w-3" /> Confirming...
                        </div>
                      )}
                      {escrow.status === "released" && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Complete
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
