import { useState, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Unplug, Copy, Check, Globe } from "lucide-react";
import { SEPOLIA_CHAIN_ID, SEPOLIA_CHAIN_ID_HEX } from "@/lib/escrowContract";

interface WalletConnectProps {
  userId: string;
  walletAddress: string | null;
  onConnected: (address: string | null) => void;
}

async function ensureSepoliaNetwork() {
  const ethereum = (window as any).ethereum;
  if (!ethereum) return;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    // Chain not added — add it
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia Testnet",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    }
  }
}

export default function WalletConnect({ userId, walletAddress, onConnected }: WalletConnectProps) {
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask browser extension to connect your wallet.",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    try {
      await ensureSepoliaNetwork();

      const provider = new BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      const { error } = await supabase
        .from("profiles")
        .update({ wallet_address: address })
        .eq("user_id", userId);

      if (error) throw error;

      onConnected(address);
      toast({ title: "Wallet connected (Sepolia)", description: `${address.slice(0, 6)}...${address.slice(-4)}` });
    } catch (err: any) {
      toast({ title: "Connection failed", description: err?.message || "Could not connect wallet", variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  }, [userId, onConnected, toast]);

  const disconnectWallet = useCallback(async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ wallet_address: null })
      .eq("user_id", userId);

    if (!error) {
      onConnected(null);
      toast({ title: "Wallet disconnected" });
    }
  }, [userId, onConnected, toast]);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (walletAddress) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
          <Wallet className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Connected Wallet</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-700">
              <Globe className="h-3 w-3" /> Sepolia
            </span>
          </div>
          <p className="text-sm font-mono font-medium truncate">{walletAddress}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyAddress}>
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={disconnectWallet}>
          <Unplug className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={connectWallet} disabled={connecting} variant="outline" className="w-full gap-2">
      {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
      Connect MetaMask (Sepolia Testnet)
    </Button>
  );
}
