import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { ScrollGlobe } from "@/components/ui/landing-page";

export default function Landing() {
  const navigate = useNavigate();

  const sections = [
    {
      id: "hero",
      badge: "ConQuote Connect",
      title: "Build Smarter.",
      subtitle: "Quote Faster.",
      description:
        "The all-in-one platform connecting builders and contractors with AI-powered quoting, BIM visualization, and blockchain-secured milestone payments.",
      align: "left" as const,
      actions: [
        {
          label: "Get Started Free",
          variant: "primary" as const,
          onClick: () => navigate("/auth?mode=signup"),
        },
        {
          label: "Sign In",
          variant: "secondary" as const,
          onClick: () => navigate("/auth"),
        },
      ],
    },
    {
      id: "quoting",
      badge: "Smart Quoting",
      title: "Transparent Procurement",
      description:
        "Builders post projects, contractors bid — compare structured quotes side-by-side. AI-powered risk assessment and auto-generated contract drafts ensure you always pick the right partner.",
      align: "center" as const,
    },
    {
      id: "bim",
      badge: "BIM & 3D",
      title: "Visualize",
      subtitle: "Every Detail",
      description:
        "Upload IFC models, tag milestones visually in 3D, measure walls with vertex-snapping precision, and track real-time construction progress — all inside your browser.",
      align: "left" as const,
      features: [
        {
          title: "3D Model Viewer",
          description: "Full IFC support with pan, zoom, and rotate controls",
        },
        {
          title: "Smart Measurements",
          description: "Vertex-snapping for precise wall and element measuring",
        },
        {
          title: "Milestone Tagging",
          description: "Pin milestones directly onto the 3D model geometry",
        },
      ],
    },
    {
      id: "escrow",
      badge: "Blockchain Escrow",
      title: "Payments You",
      subtitle: "Can Trust",
      description:
        "Milestone-based on-chain escrow ensures funds are released only when work is verified. NFT completion certificates build an immutable reputation for every contractor.",
      align: "center" as const,
      actions: [
        {
          label: "Start Building",
          variant: "primary" as const,
          onClick: () => navigate("/auth?mode=signup"),
        },
        {
          label: "Learn More",
          variant: "secondary" as const,
          onClick: () => navigate("/auth"),
        },
      ],
    },
  ];

  return (
    <div className="relative">
      {/* Fixed header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">ConQuote</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/auth")}
              className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/auth?mode=signup")}
              className="px-4 py-1.5 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <ScrollGlobe sections={sections} />

      {/* Footer */}
      <footer className="relative z-30 border-t border-border/50 bg-background py-6">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground">ConQuote Connect</span>
          </div>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
