import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, FolderOpen, BarChart3, Building2, MapPin,
  TrendingUp, CheckCircle2, IndianRupee, ArrowUpRight,
  Layers, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, LineChart, Line
} from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

const STATUS_COLORS: Record<string, string> = {
  open: "hsl(var(--chart-1))",
  awarded: "hsl(var(--chart-3))",
  in_progress: "hsl(var(--chart-2))",
  completed: "hsl(var(--accent))",
  cancelled: "hsl(var(--muted-foreground))",
};

const SPARKLINE_DATA = [
  { v: 30 }, { v: 45 }, { v: 35 }, { v: 55 }, { v: 48 }, { v: 62 }, { v: 58 },
];

function MiniSparkline({ color, data }: { color: string; data: { v: number }[] }) {
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const glassCard = "rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.08)]";

export default function BuilderDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: projs } = await supabase.from("projects").select("*").eq("builder_id", user.id).order("created_at", { ascending: false });
      setProjects(projs || []);
      if (projs && projs.length > 0) {
        const ids = projs.map((p) => p.id);
        const { data: quotes } = await supabase.from("quotes").select("project_id").in("project_id", ids);
        const counts: Record<string, number> = {};
        (quotes || []).forEach((q) => { counts[q.project_id] = (counts[q.project_id] || 0) + 1; });
        setQuoteCounts(counts);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const activeCount = projects.filter((p) => p.status === "open" || p.status === "in_progress" || p.status === "awarded").length;
  const totalQuotes = Object.values(quoteCounts).reduce((a, b) => a + b, 0);
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + (Number(p.budget_max) || 0), 0);
  const avgBudget = projects.length > 0 ? Math.round(totalBudget / projects.length) : 0;
  const completionRate = projects.length > 0 ? Math.round((completedCount / projects.length) * 100) : 0;

  const statusData = Object.entries(
    projects.reduce<Record<string, number>>((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const quoteChartData = projects
    .filter((p) => quoteCounts[p.id])
    .slice(0, 6)
    .map((p) => ({ name: p.title.length > 12 ? p.title.slice(0, 12) + "…" : p.title, quotes: quoteCounts[p.id] || 0 }));

  const budgetDistData = projects.slice(0, 8).map((p) => ({
    name: p.title.length > 10 ? p.title.slice(0, 10) + "…" : p.title,
    budget: Number(p.budget_max) || 0,
  }));

  return (
    <div className="container py-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Builder Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Post projects and manage your construction quotes.</p>
        </div>
        <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80 shadow-[0_4px_16px_-2px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_-2px_hsl(var(--primary)/0.5)] transition-all">
          <Link to="/builder/create-project"><Plus className="mr-2 h-4 w-4" /> New Project</Link>
        </Button>
      </div>

      {/* Top Summary Cards - Bento Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Budget */}
        <Card className={`${glassCard} sm:col-span-2`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <IndianRupee className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Total Budget</span>
                </div>
                <p className="text-4xl font-bold tracking-tight">₹{totalBudget.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    <ArrowUpRight className="h-3 w-3" /> +15%
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </div>
              <MiniSparkline color="hsl(258, 65%, 58%)" data={SPARKLINE_DATA} />
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className={glassCard}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
                    <FolderOpen className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Active</span>
                </div>
                <p className="text-3xl font-bold">{activeCount}</p>
                <span className="text-xs text-muted-foreground">Open & in progress</span>
              </div>
              <MiniSparkline color="hsl(160, 55%, 45%)" data={[{ v: 20 }, { v: 35 }, { v: 25 }, { v: 40 }, { v: 38 }, { v: 50 }, { v: 45 }]} />
            </div>
          </CardContent>
        </Card>

        {/* Quotes Received */}
        <Card className={glassCard}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-chart-3/10">
                    <BarChart3 className="h-4 w-4 text-chart-3" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Quotes</span>
                </div>
                <p className="text-3xl font-bold">{totalQuotes}</p>
                <span className="text-xs text-muted-foreground">From contractors</span>
              </div>
              <MiniSparkline color="hsl(25, 90%, 55%)" data={[{ v: 10 }, { v: 25 }, { v: 18 }, { v: 30 }, { v: 42 }, { v: 35 }, { v: 50 }]} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card className={glassCard}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10">
                <CheckCircle2 className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className="h-1.5 flex-1" />
              <span className="text-xs font-medium text-muted-foreground">{completionRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-5/10">
                <IndianRupee className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Budget</p>
                <p className="text-2xl font-bold">₹{avgBudget.toLocaleString()}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Per project average</span>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">All time submissions</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Bento Grid */}
      {projects.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Project Status Donut */}
          <Card className={glassCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                Project Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--card))" label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 32px -8px rgba(0,0,0,0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quotes Bar Chart */}
          <Card className={glassCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                Quotes per Project
              </CardTitle>
            </CardHeader>
            <CardContent className="h-60">
              {quoteChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quoteChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="quotes" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">No quotes received yet</p>
              )}
            </CardContent>
          </Card>

          {/* Budget Distribution */}
          <Card className={glassCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-3" />
                Budget Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-60">
              {budgetDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetDistData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: number) => [`₹${value.toLocaleString()}`, "Budget"]} />
                    <Bar dataKey="budget" fill="hsl(var(--chart-3))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">No budget data</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Projects Grid */}
      <div>
        <h2 className="font-display text-xl font-bold mb-4">Your Projects</h2>
        {loading ? <p className="text-muted-foreground">Loading...</p> : projects.length === 0 ? (
          <Card className={glassCard}><CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No projects yet. Create your first one!</p>
            <Button asChild className="mt-4 bg-gradient-to-r from-primary to-primary/80 shadow-[0_4px_16px_-2px_hsl(var(--primary)/0.4)]">
              <Link to="/builder/create-project"><Plus className="mr-2 h-4 w-4" /> Create Project</Link>
            </Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <Card className={`${glassCard} hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full group`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] || "hsl(var(--border))" }} />
                        <h3 className="font-display font-semibold leading-tight group-hover:text-primary transition-colors">{p.title}</h3>
                      </div>
                      <Badge variant={p.status === "open" ? "default" : p.status === "completed" ? "outline" : "secondary"} className="shrink-0 ml-2 rounded-full text-[10px]">{p.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                      {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
                      {(p.budget_min || p.budget_max) && (
                        <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />
                          {p.budget_min && `₹${Number(p.budget_min).toLocaleString()}`}
                          {p.budget_min && p.budget_max && " – "}
                          {p.budget_max && `₹${Number(p.budget_max).toLocaleString()}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium text-primary">{quoteCounts[p.id] || 0} quote(s)</span>
                    </div>
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
