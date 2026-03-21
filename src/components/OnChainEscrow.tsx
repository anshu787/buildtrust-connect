import { useState } from "react";
import { BrowserProvider, Contract, parseEther } from "ethers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Lock, Unlock, ArrowUpRight, Clock, CheckCircle2, AlertCircle, Wallet, Send, ExternalLink, Loader2,
} from "lucide-react";
import {
  ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, SEPOLIA_CHAIN_ID_HEX,
  uuidToBytes32, isContractConfigured,
} from "@/lib/escrowContract";
import { sendEscrowNotification } from "@/lib/notifications";

interface EscrowItem {
  id: string;
  milestoneTitle: string;
  projectTitle: string;
  amount: number;
  status: "locked" | "pending_release" | "released" | "disputed";
  lockedAt?: string;
  releasedAt?: string;
}

interface DepositOption {
  milestoneId: string;
  milestoneTitle: string;
  projectTitle: string;
  projectId: string;
  amount: number;
  contractorWallet: string;
}

interface Props {
  escrows: EscrowItem[];
  walletConnected: boolean;
  depositOptions?: DepositOption[];
  isBuilder?: boolean;
}

const statusConfig: Record<string, { icon: typeof Lock; label: string; color: string }> = {
  locked: { icon: Lock, label: "Locked", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  pending_release: { icon: Clock, label: "Pending Release", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  released: { icon: Unlock, label: "Released", color: "bg-green-500/10 text-green-700 border-green-200" },
  disputed: { icon: AlertCircle, label: "Disputed", color: "bg-red-500/10 text-red-700 border-red-200" },
};

async function getContract(signer = false) {
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error("MetaMask not found");
  const provider = new BrowserProvider(ethereum);
  if (signer) {
    const s = await provider.getSigner();
    return new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, s);
  }
  return new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);
}

export default function OnChainEscrow({ escrows, walletConnected, depositOptions = [], isBuilder = true }: Props) {
  const { toast } = useToast();
  const [selectedMilestone, setSelectedMilestone] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [txLoading, setTxLoading] = useState<string | null>(null);

  const selectedOption = depositOptions.find((o) => o.milestoneId === selectedMilestone);

  // Auto-fill amount when milestone is selected
  const handleMilestoneSelect = (milestoneId: string) => {
    setSelectedMilestone(milestoneId);
    const option = depositOptions.find((o) => o.milestoneId === milestoneId);
    if (option && option.amount > 0) {
      // Convert ₹ amount to a rough ETH placeholder (user can adjust)
      setDepositAmount("0.01");
    }
  };

  const contractReady = isContractConfigured();

  const totalLocked = escrows
    .filter((e) => e.status === "locked" || e.status === "pending_release")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalReleased = escrows
    .filter((e) => e.status === "released")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalValue = escrows.reduce((sum, e) => sum + e.amount, 0);
  const releasePercent = totalValue > 0 ? (totalReleased / totalValue) * 100 : 0;

  const handleDeposit = async () => {
    if (!selectedOption || !depositAmount) {
      toast({ title: "Select a milestone and enter amount", variant: "destructive" });
      return;
    }
    if (!selectedOption.contractorWallet) {
      toast({ title: "Contractor has no wallet", description: "The contractor must connect their wallet first.", variant: "destructive" });
      return;
    }
    setTxLoading("deposit");
    try {
      const contract = await getContract(true);
      const milestoneBytes = uuidToBytes32(selectedOption.milestoneId);
      const tx = await contract.deposit(milestoneBytes, selectedOption.contractorWallet, {
        value: parseEther(depositAmount),
      });
      toast({ title: "Transaction sent", description: `TX: ${tx.hash.slice(0, 10)}...` });
      await tx.wait();
      toast({ title: "Deposit confirmed!", description: `${depositAmount} ETH locked in escrow.` });

      // Send notification
      sendEscrowNotification({
        type: "escrow_deposit",
        title: "Escrow Deposit Confirmed",
        message: `${depositAmount} ETH deposited for milestone "${selectedOption.milestoneTitle}" in ${selectedOption.projectTitle}.`,
        metadata: { txHash: tx.hash, milestoneId: selectedOption.milestoneId, amount: depositAmount },
      });

      setSelectedMilestone("");
      setDepositAmount("");
    } catch (err: any) {
      toast({ title: "Deposit failed", description: err?.reason || err?.message || "Transaction rejected", variant: "destructive" });
    } finally {
      setTxLoading(null);
    }
  };

  const handleRelease = async (milestoneId: string) => {
    setTxLoading(milestoneId);
    try {
      const contract = await getContract(true);
      const milestoneBytes = uuidToBytes32(milestoneId);
      const tx = await contract.releaseFunds(milestoneBytes);
      toast({ title: "Release transaction sent", description: `TX: ${tx.hash.slice(0, 10)}...` });
      await tx.wait();
      toast({ title: "Funds released!" });

      // Find escrow details for notification
      const escrow = escrows.find((e) => e.id === milestoneId);
      sendEscrowNotification({
        type: "escrow_release",
        title: "Escrow Funds Released",
        message: `Funds released for milestone "${escrow?.milestoneTitle || milestoneId}" in ${escrow?.projectTitle || "project"}.`,
        metadata: { txHash: tx.hash, milestoneId },
      });
    } catch (err: any) {
      toast({ title: "Release failed", description: err?.reason || err?.message || "Transaction rejected", variant: "destructive" });
    } finally {
      setTxLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle className="font-display text-xl">On-Chain Escrow</CardTitle>
          <Badge variant="outline" className="ml-auto text-[10px] bg-purple-500/10 text-purple-700 border-purple-200">
            Sepolia Testnet
          </Badge>
        </div>
        <CardDescription>
          Smart contract-managed escrow for secure milestone-based payments.
          {contractReady && (
            <a
              href={`https://sepolia.etherscan.io/address/${ESCROW_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-primary hover:underline"
            >
              View Contract <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!contractReady && (
          <div className="rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50 p-4 text-center">
            <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-yellow-800">Contract not configured</p>
            <p className="text-xs text-yellow-700 mt-1">
              Deploy <code className="bg-yellow-100 px-1 rounded">contracts/MilestoneEscrow.sol</code> on Sepolia
              and paste the address in <code className="bg-yellow-100 px-1 rounded">src/lib/escrowContract.ts</code>
            </p>
          </div>
        )}

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
                <p className="text-lg font-bold text-blue-700">₹{totalLocked.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-green-500/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">Released</p>
                <p className="text-lg font-bold text-green-700">₹{totalReleased.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">₹{totalValue.toLocaleString()}</p>
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

        {/* Deposit Form */}
        {walletConnected && contractReady && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Deposit to Escrow
            </p>
            {depositOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No milestones available for deposit. Create a project with milestones first.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Select Milestone</Label>
                    <Select value={selectedMilestone} onValueChange={handleMilestoneSelect}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Choose a milestone..." />
                      </SelectTrigger>
                      <SelectContent>
                        {depositOptions.map((opt) => (
                          <SelectItem key={opt.milestoneId} value={opt.milestoneId} className="text-xs">
                            <span className="font-medium">{opt.milestoneTitle}</span>
                            <span className="text-muted-foreground ml-1">({opt.projectTitle})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount (ETH)</Label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                {selectedOption && (
                  <div className="text-xs text-muted-foreground rounded bg-muted/40 p-2 space-y-1">
                    <p><span className="font-medium">Payee:</span> <span className="font-mono">{selectedOption.contractorWallet || "⚠️ Contractor wallet not connected"}</span></p>
                    <p><span className="font-medium">Milestone budget:</span> ₹{selectedOption.amount.toLocaleString()}</p>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={handleDeposit}
                  disabled={txLoading === "deposit" || !selectedOption}
                  className="w-full gap-2"
                >
                  {txLoading === "deposit" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Deposit ETH to Escrow
                </Button>
              </>
            )}
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
                      <p className="text-sm font-bold">₹{escrow.amount.toLocaleString()}</p>
                      {escrow.status === "locked" && walletConnected && contractReady && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 text-xs h-7 gap-1"
                          disabled={txLoading === escrow.id}
                          onClick={() => handleRelease(escrow.id)}
                        >
                          {txLoading === escrow.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          Release
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
