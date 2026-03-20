import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, FileText, Award, IndianRupee, TrendingUp,
  Clock, CheckCircle2, XCircle, ArrowUpRight, Target,
  Send, Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Quote = Tables<"quotes">;
type Milestone = Tables<"milestones">;

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--chart-3))",
  accepted: "hsl(var(--chart-2))",
  rejected: "hsl(var(--destructive))",
};

function MiniSparkline({ color, data }: { color: string; data: { v: number }[] }) {
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-c-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-c-${color.replace(/[^a-z0-9]/gi, "")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const glassCard = "rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.08)]";

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [quotesRes, reviewsRes] = await Promise.all([
        supabase.from("quotes").select("*").eq("contractor_id", user.id).order("created_at", { ascending: false }),
        supabase.from("reviews").select("rating").eq("reviewee_id", user.id),
      ]);
      const q = quotesRes.data || [];
      setQuotes(q);

      const reviews = reviewsRes.data || [];
      setReviewCount(reviews.length);
      if (reviews.length > 0) {
        setAvgRating(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length);
      }

      // Fetch milestones for accepted projects
      const acceptedProjectIds = q.filter(qq => qq.status === "accepted").map(qq => qq.project_id);
      if (acceptedProjectIds.length > 0) {
        const { data: ms } = await supabase.from("milestones").select("*").in("project_id", acceptedProjectIds).order("order_index");
        setMilestones(ms || []);
      }

      setLoading(false);
    };
    fetch();
  }, [user]);

  const pendingCount = quotes.filter((q) => q.status === "pending").length;
  const acceptedCount = quotes.filter((q) => q.status === "accepted").length;
  const rejectedCount = quotes.filter((q) => q.status === "rejected").length;
  const totalQuoted = quotes.reduce((s, q) => s + Number(q.total_price), 0);
  const acceptedValue = quotes.filter((q) => q.status === "accepted").reduce((s, q) => s + Number(q.total_price), 0);
  const winRate = quotes.length > 0 ? Math.round((acceptedCount / quotes.length) * 100) : 0;
  const avgQuote = quotes.length > 0 ? Math.round(totalQuoted / quotes.length) : 0;

  const msApproved = milestones.filter(m => m.status === "approved").length;
  const msSubmitted = milestones.filter(m => m.status === "submitted").length;
  const msPending = milestones.filter(m => m.status === "pending" || m.status === "rejected").length;

  const statusData = [
    { name: "Pending", value: pendingCount },
    { name: "Accepted", value: acceptedCount },
    { name: "Rejected", value: rejectedCount },
  ].filter((d) => d.value > 0);

  const quoteValueData = quotes.slice(0, 8).map((q, i) => ({
    name: `Q${i + 1}`,
    value: Number(q.total_price),
    status: q.status,
  }));

  return (
    <div className="container py-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Contractor Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse projects, submit quotes, and track your work.</p>
        </div>
        <div className="flex gap-2">
          {msPending > 0 && (
            <Button asChild variant="outline" className="gap-1">
              <Link to="/milestones">
                <Send className="h-4 w-4" /> {msPending} to Submit
              </Link>
            </Button>
          )}
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80 shadow-[0_4px_16px_-2px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_-2px_hsl(var(--primary)/0.5)] transition-all">
            <Link to="/contractor/browse"><Search className="mr-2 h-4 w-4" /> Browse Projects</Link>
          </Button>
        </div>
      </div>

      {/* Top Summary */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={`${glassCard} sm:col-span-2`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <IndianRupee className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Total Quoted</span>
                </div>
                <p className="text-4xl font-bold tracking-tight">₹{totalQuoted.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    <ArrowUpRight className="h-3 w-3" /> {quotes.length} quotes
                  </span>
                </div>
              </div>
              <MiniSparkline color="hsl(258, 65%, 58%)" data={[{ v: 30 }, { v: 45 }, { v: 35 }, { v: 55 }, { v: 48 }, { v: 62 }, { v: 58 }]} />
            </div>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
                    <Award className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Won</span>
                </div>
                <p className="text-3xl font-bold">₹{acceptedValue.toLocaleString()}</p>
                <span className="text-xs text-muted-foreground">{acceptedCount} projects</span>
              </div>
              <MiniSparkline color="hsl(160, 55%, 45%)" data={[{ v: 20 }, { v: 35 }, { v: 25 }, { v: 40 }, { v: 38 }, { v: 50 }, { v: 45 }]} />
            </div>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-chart-3/10">
                    <Target className="h-4 w-4 text-chart-3" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Win Rate</span>
                </div>
                <p className="text-3xl font-bold">{winRate}%</p>
                <span className="text-xs text-muted-foreground">{acceptedCount} of {quotes.length}</span>
              </div>
              <MiniSparkline color="hsl(25, 90%, 55%)" data={[{ v: 10 }, { v: 25 }, { v: 18 }, { v: 30 }, { v: 42 }, { v: 35 }, { v: 50 }]} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Row */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={glassCard}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10">
                <Clock className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10">
                <IndianRupee className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Quote</p>
                <p className="text-2xl font-bold">₹{avgQuote.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10">
                <CheckCircle2 className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Milestones Done</p>
                <p className="text-2xl font-bold">{msApproved}<span className="text-sm text-muted-foreground font-normal">/{milestones.length}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10">
                <Star className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{avgRating ? avgRating.toFixed(1) : "—"}<span className="text-sm text-muted-foreground font-normal"> ({reviewCount})</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {quotes.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className={glassCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" /> Quote Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--card))" label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase()] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className={glassCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" /> Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-56 gap-4">
              <div className="relative flex items-center justify-center">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${winRate * 2.51} 251`} />
                </svg>
                <span className="absolute text-3xl font-bold">{winRate}%</span>
              </div>
              <p className="text-sm text-muted-foreground">{acceptedCount} won of {quotes.length} submitted</p>
            </CardContent>
          </Card>

          <Card className={glassCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-3" /> Quote Values
              </CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              {quoteValueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quoteValueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: number) => [`₹${value.toLocaleString()}`, "Amount"]} />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">No data</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quotes List */}
      <div>
        <h2 className="font-display text-xl font-bold mb-4">My Quotes</h2>
        {loading ? <p className="text-muted-foreground">Loading...</p> : quotes.length === 0 ? (
          <Card className={glassCard}><CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No quotes submitted yet. Browse projects to get started!</p>
            <Button asChild className="mt-4 bg-gradient-to-r from-primary to-primary/80 shadow-[0_4px_16px_-2px_hsl(var(--primary)/0.4)]">
              <Link to="/contractor/browse"><Search className="mr-2 h-4 w-4" /> Browse Projects</Link>
            </Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <Link key={q.id} to={`/projects/${q.project_id}`}>
                <Card className={`${glassCard} hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.15)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${STATUS_COLORS[q.status]}20` }}>
                        {q.status === "accepted" ? <CheckCircle2 className="h-5 w-5 text-chart-2" /> : q.status === "rejected" ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-chart-3" />}
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">₹{Number(q.total_price).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{q.timeline || "No timeline"} • {q.notes ? q.notes.slice(0, 60) + "..." : "No notes"}</p>
                      </div>
                    </div>
                    <Badge variant={q.status === "accepted" ? "default" : q.status === "rejected" ? "destructive" : "secondary"} className="rounded-full">{q.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
