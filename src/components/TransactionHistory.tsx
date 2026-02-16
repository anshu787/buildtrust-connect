import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserProvider, Contract, formatEther } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowDownLeft, ArrowUpRight, ExternalLink, History, RefreshCw } from "lucide-react";
import {
  ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, isContractConfigured,
} from "@/lib/escrowContract";

interface TxEvent {
  type: "deposit" | "release";
  milestoneId: string;
  depositor?: string;
  payee: string;
  amount: string;
  txHash: string;
  blockNumber: number;
}

export default function TransactionHistory({ walletConnected }: { walletConnected: boolean }) {
  const [events, setEvents] = useState<TxEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const { toast } = useToast();
  const contractRef = useRef<Contract | null>(null);

  const contractReady = isContractConfigured();

  const parseDepositLog = (log: any): TxEvent => ({
    type: "deposit",
    milestoneId: log.args.milestoneId,
    depositor: log.args.depositor,
    payee: log.args.payee,
    amount: formatEther(log.args.amount),
    txHash: log.log?.transactionHash || log.transactionHash || "",
    blockNumber: log.log?.blockNumber || log.blockNumber || 0,
  });

  const parseReleaseLog = (log: any): TxEvent => ({
    type: "release",
    milestoneId: log.args.milestoneId,
    payee: log.args.payee,
    amount: formatEther(log.args.amount),
    txHash: log.log?.transactionHash || log.transactionHash || "",
    blockNumber: log.log?.blockNumber || log.blockNumber || 0,
  });

  const fetchEvents = useCallback(async () => {
    if (!contractReady || typeof window === "undefined" || !(window as any).ethereum) return;

    setLoading(true);
    setError(null);
    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const contract = new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);
      contractRef.current = contract;

      const depositFilter = contract.filters.Deposited();
      const depositLogs = await contract.queryFilter(depositFilter, -10000);

      const releaseFilter = contract.filters.Released();
      const releaseLogs = await contract.queryFilter(releaseFilter, -10000);

      const txEvents: TxEvent[] = [];

      for (const log of depositLogs) {
        if ("args" in log) {
          txEvents.push({
            type: "deposit",
            milestoneId: log.args.milestoneId,
            depositor: log.args.depositor,
            payee: log.args.payee,
            amount: formatEther(log.args.amount),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }
      }

      for (const log of releaseLogs) {
        if ("args" in log) {
          txEvents.push({
            type: "release",
            milestoneId: log.args.milestoneId,
            payee: log.args.payee,
            amount: formatEther(log.args.amount),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }
      }

      txEvents.sort((a, b) => b.blockNumber - a.blockNumber);
      setEvents(txEvents);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [contractReady]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!walletConnected || !contractReady || typeof window === "undefined" || !(window as any).ethereum) return;

    let contract: Contract;

    const setupListeners = async () => {
      try {
        const provider = new BrowserProvider((window as any).ethereum);
        contract = new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);

        contract.on("Deposited", (milestoneId, depositor, payee, amount, event) => {
          const newEvent = parseDepositLog({ args: { milestoneId, depositor, payee, amount }, log: event?.log, transactionHash: event?.log?.transactionHash, blockNumber: event?.log?.blockNumber });
          setEvents((prev) => [newEvent, ...prev]);
          toast({ title: "New Deposit", description: `${formatEther(amount)} ETH deposited to escrow` });
        });

        contract.on("Released", (milestoneId, payee, amount, event) => {
          const newEvent = parseReleaseLog({ args: { milestoneId, payee, amount }, log: event?.log, transactionHash: event?.log?.transactionHash, blockNumber: event?.log?.blockNumber });
          setEvents((prev) => [newEvent, ...prev]);
          toast({ title: "Funds Released", description: `${formatEther(amount)} ETH released` });
        });

        setListening(true);
      } catch (err) {
        console.error("Failed to set up event listeners:", err);
      }
    };

    setupListeners();

    return () => {
      if (contract) {
        contract.removeAllListeners("Deposited");
        contract.removeAllListeners("Released");
      }
      setListening(false);
    };
  }, [walletConnected, contractReady, toast]);

  useEffect(() => {
    if (walletConnected && contractReady) {
      fetchEvents();
    }
  }, [walletConnected, contractReady, fetchEvents]);

  if (!contractReady) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">Transaction History</CardTitle>
            {listening && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          {walletConnected && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchEvents} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
        <CardDescription>On-chain deposit and release events from the escrow contract.</CardDescription>
      </CardHeader>
      <CardContent>
        {!walletConnected ? (
          <p className="text-sm text-muted-foreground text-center py-4">Connect your wallet to view transaction history.</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive text-center py-4">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchEvents}>Retry</Button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No transactions found on this contract yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev, i) => (
              <div key={`${ev.txHash}-${i}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/20 transition-colors">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  ev.type === "deposit" ? "bg-blue-500/10" : "bg-green-500/10"
                }`}>
                  {ev.type === "deposit" ? (
                    <ArrowDownLeft className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      ev.type === "deposit"
                        ? "bg-blue-500/10 text-blue-700 border-blue-200 text-[10px]"
                        : "bg-green-500/10 text-green-700 border-green-200 text-[10px]"
                    }>
                      {ev.type === "deposit" ? "Deposit" : "Release"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Block #{ev.blockNumber}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                    {ev.type === "deposit" ? `To: ${ev.payee}` : `Payee: ${ev.payee}`}
                  </p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <p className="text-sm font-bold">{ev.amount} ETH</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${ev.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
