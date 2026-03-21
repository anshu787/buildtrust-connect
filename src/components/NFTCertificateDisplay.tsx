import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, ExternalLink, Shield, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface NFTCertificate {
  id: string;
  projectTitle: string;
  milestoneTitle: string;
  completedAt: string;
  status: "minted" | "pending" | "ready";
  tokenId?: string;
  contractAddress?: string;
}

interface Props {
  certificates: NFTCertificate[];
  walletConnected: boolean;
}

export default function NFTCertificateDisplay({ certificates, walletConnected }: Props) {
  const { toast } = useToast();
  const [mintingId, setMintingId] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    minted: "bg-green-500/10 text-green-700 border-green-200",
    pending: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    ready: "bg-blue-500/10 text-blue-700 border-blue-200",
  };

  const handleMint = async (cert: NFTCertificate) => {
    setMintingId(cert.id);
    // Simulate minting delay for demo
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setMintingId(null);
    toast({
      title: "NFT Minting — Demo Mode",
      description: `In production, "${cert.milestoneTitle}" would be minted as an ERC-721 NFT on-chain. This requires deploying an NFT smart contract (e.g., ERC-721) to Sepolia. The certificate would then be viewable on OpenSea Testnet and serve as verified proof of completed work.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <CardTitle className="font-display text-xl">NFT Certificates</CardTitle>
        </div>
        <CardDescription>
          Milestone completion certificates stored on-chain as NFTs for verified proof of work.
          In production, contractors can showcase these on their public profile and OpenSea as proof of completed milestones.
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
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4"
              >
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-[3rem]" />

                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{cert.milestoneTitle}</p>
                    <p className="text-xs text-muted-foreground">{cert.projectTitle}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={statusColors[cert.status]}>
                        {cert.status === "minted" ? "Minted" : cert.status === "pending" ? "Minting..." : "Ready to Mint"}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(cert.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {cert.tokenId && (
                      <p className="mt-1 text-[10px] font-mono text-muted-foreground">
                        Token #{cert.tokenId}
                      </p>
                    )}
                  </div>
                  {cert.status === "ready" && walletConnected && (
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
                  {cert.status === "minted" && cert.contractAddress && (
                    <Button size="sm" variant="ghost" className="shrink-0" asChild>
                      <a
                        href={`https://etherscan.io/token/${cert.contractAddress}?a=${cert.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}