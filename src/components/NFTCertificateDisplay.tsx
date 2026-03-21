import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, ExternalLink, Shield, Calendar, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import { NFT_CONTRACT_ADDRESS, NFT_ABI, isNFTContractConfigured } from "@/lib/nftContract";
import { SEPOLIA_CHAIN_ID_HEX } from "@/lib/escrowContract";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NFTCertificate {
  id: string;
  projectId?: string;
  projectTitle: string;
  milestoneTitle: string;
  completedAt: string;
  status: "minted" | "pending" | "ready";
  tokenId?: string;
  contractAddress?: string;
  txHash?: string;
}

interface Props {
  certificates: NFTCertificate[];
  walletConnected: boolean;
}

export default function NFTCertificateDisplay({ certificates, walletConnected }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [mintedMap, setMintedMap] = useState<Record<string, { tokenId: string; txHash: string; contractAddress: string }>>({});

  // Load already-minted certificates from DB
  useEffect(() => {
    const loadMinted = async () => {
      if (certificates.length === 0 || !user) return;
      const milestoneIds = certificates.map((c) => c.id);
      const { data } = await supabase
        .from("nft_certificates")
        .select("milestone_id, token_id, tx_hash, contract_address")
        .in("milestone_id", milestoneIds)
        .eq("minter_user_id", user.id);
      if (data) {
        const map: Record<string, { tokenId: string; txHash: string; contractAddress: string }> = {};
        data.forEach((row: any) => {
          map[row.milestone_id] = {
            tokenId: row.token_id,
            txHash: row.tx_hash,
            contractAddress: row.contract_address,
          };
        });
        setMintedMap(map);
      }
    };
    loadMinted();
  }, [certificates, user]);

  const getEffectiveStatus = (cert: NFTCertificate) => {
    if (mintedMap[cert.id]) return "minted";
    return cert.status;
  };

  const statusColors: Record<string, string> = {
    minted: "bg-green-500/10 text-green-700 border-green-200",
    pending: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    ready: "bg-blue-500/10 text-blue-700 border-blue-200",
  };

  const ensureSepolia = async (provider: BrowserProvider) => {
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: SEPOLIA_CHAIN_ID_HEX }]);
    } catch (e: any) {
      if (e.code === 4902) {
        await provider.send("wallet_addEthereumChain", [{
          chainId: SEPOLIA_CHAIN_ID_HEX,
          chainName: "Sepolia Testnet",
          rpcUrls: ["https://rpc.sepolia.org"],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }]);
      }
    }
  };

  const handleMint = async (cert: NFTCertificate) => {
    if (!isNFTContractConfigured()) {
      toast({
        title: "NFT Contract Not Deployed",
        description: "The NFT smart contract hasn't been deployed yet. Deploy contracts/MilestoneCertificateNFT.sol on Sepolia via Remix, then paste the address in src/lib/nftContract.ts. It must be a separate contract from the Escrow contract.",
        variant: "destructive",
      });
      return;
    }

    if (!(window as any).ethereum) {
      toast({ title: "MetaMask Required", description: "Please install MetaMask to mint NFTs.", variant: "destructive" });
      return;
    }

    setMintingId(cert.id);
    try {
      const provider = new BrowserProvider((window as any).ethereum);
      await ensureSepolia(provider);
      const signer = await provider.getSigner();
      const contract = new Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

      // Check if already minted on-chain
      const alreadyMinted = await contract.isMinted(cert.id);
      if (alreadyMinted) {
        toast({ title: "Already Minted", description: "This milestone already has an NFT certificate on-chain." });
        setMintingId(null);
        return;
      }

      // Mint the certificate
      const tx = await contract.mintCertificate(cert.id, cert.projectTitle, cert.milestoneTitle);
      toast({ title: "Transaction Submitted", description: "Waiting for confirmation on Sepolia..." });

      const receipt = await tx.wait();

      // Extract tokenId from CertificateMinted event
      let tokenId = "0";
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed?.name === "CertificateMinted") {
            tokenId = parsed.args.tokenId.toString();
            break;
          }
        } catch {
          // skip non-matching logs
        }
      }

      // Save to database
      if (user) {
        await supabase.from("nft_certificates").insert({
          milestone_id: cert.id,
          project_id: cert.projectId || cert.id,
          minter_address: await signer.getAddress(),
          token_id: tokenId,
          tx_hash: tx.hash,
          contract_address: NFT_CONTRACT_ADDRESS,
          milestone_title: cert.milestoneTitle,
          project_title: cert.projectTitle,
          minter_user_id: user.id,
        } as any);
      }

      // Update local state keyed by cert.id (role-prefixed)
      setMintedMap((prev) => ({
        ...prev,
        [cert.id]: { tokenId, txHash: tx.hash, contractAddress: NFT_CONTRACT_ADDRESS },
      }));

      toast({
        title: "🎉 NFT Certificate Minted!",
        description: `Token #${tokenId} minted on Sepolia. View it on Etherscan!`,
      });
    } catch (err: any) {
      console.error("Mint error:", err);
      toast({
        title: "Minting Failed",
        description: err?.reason || err?.message || "Transaction was rejected or failed.",
        variant: "destructive",
      });
    } finally {
      setMintingId(null);
    }
  };

  const contractConfigured = isNFTContractConfigured();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <CardTitle className="font-display text-xl">NFT Certificates</CardTitle>
        </div>
        <CardDescription>
          Project completion certificates minted on-chain as ERC-721 NFTs on Sepolia.
          One certificate is issued per completed project as verified proof of work.
          {!contractConfigured && (
            <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
              ⚠️ NFT contract not deployed yet. Deploy <code>contracts/MilestoneCertificateNFT.sol</code> on Sepolia and update the address in <code>src/lib/nftContract.ts</code>.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!walletConnected && (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center mb-4">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Connect your wallet to mint and view NFT certificates.</p>
          </div>
        )}

        {certificates.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            <Award className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No certificates yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete milestones to earn verifiable NFT certificates.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {certificates.map((cert) => {
              const effectiveStatus = getEffectiveStatus(cert);
              const minted = mintedMap[cert.projectId || cert.id];

              return (
                <div
                  key={cert.id}
                  className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4"
                >
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-[3rem]" />

                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${effectiveStatus === "minted" ? "bg-green-500/10" : "bg-primary/10"}`}>
                      {effectiveStatus === "minted" ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <Award className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{cert.milestoneTitle}</p>
                      <p className="text-xs text-muted-foreground">{cert.projectTitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={statusColors[effectiveStatus]}>
                          {effectiveStatus === "minted" ? "✓ Minted" : effectiveStatus === "pending" ? "Connect Wallet" : "Ready to Mint"}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(cert.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {minted && (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[10px] font-mono text-muted-foreground">
                            Token #{minted.tokenId}
                          </p>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${minted.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View on Etherscan <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                    {effectiveStatus === "ready" && walletConnected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
                        disabled={mintingId === cert.id}
                        onClick={() => handleMint(cert)}
                      >
                        {mintingId === cert.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        {mintingId === cert.id ? "Minting..." : "Mint NFT"}
                      </Button>
                    )}
                    {effectiveStatus === "minted" && minted && (
                      <Button size="sm" variant="ghost" className="shrink-0" asChild>
                        <a
                          href={`https://testnets.opensea.io/assets/sepolia/${minted.contractAddress}/${minted.tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on OpenSea Testnet"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
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
}
