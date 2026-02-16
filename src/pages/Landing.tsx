import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Building2, Shield, Brain, Layers, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Post & Compare Quotes",
    description: "Builders post projects, contractors bid — compare structured quotes side-by-side.",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Smart risk assessment, quote comparison, and auto-generated contract drafts.",
  },
  {
    icon: Layers,
    title: "BIM Integration",
    description: "Upload 3D models, tag milestones visually, and track progress in real-time.",
  },
  {
    icon: Shield,
    title: "Escrow & Blockchain",
    description: "Milestone-based payments with on-chain escrow and NFT completion certificates.",
  },
];

const stats = [
  { value: "100%", label: "Transparent Quotes" },
  { value: "AI", label: "Powered Insights" },
  { value: "3D", label: "BIM Visualization" },
  { value: "NFT", label: "Verified Reputation" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">ConQuote</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?mode=signup">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(25_95%_53%/0.08),transparent_60%)]" />
        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <CheckCircle className="h-3.5 w-3.5" /> Smart Construction Procurement
            </span>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6">
              Build Smarter.
              <br />
              <span className="text-primary">Quote Faster.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              The all-in-one platform connecting builders and contractors with AI-powered quoting, BIM visualization, and blockchain-secured payments.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="text-base px-8 h-12">
                <Link to="/auth?mode=signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base px-8 h-12">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mx-auto mt-20 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything You Need</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              From project posting to payment — one platform for the entire construction procurement lifecycle.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-xl border bg-background p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl bg-secondary p-12 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(25_95%_53%/0.15),transparent_60%)]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-secondary-foreground sm:text-4xl mb-4">
                Ready to Transform Your Procurement?
              </h2>
              <p className="text-secondary-foreground/70 max-w-lg mx-auto mb-8">
                Join builders and contractors already using ConQuote Connect for transparent, AI-powered construction management.
              </p>
              <Button size="lg" asChild className="text-base px-8 h-12">
                <Link to="/auth?mode=signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
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
