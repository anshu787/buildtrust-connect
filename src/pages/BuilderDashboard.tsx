import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, BarChart3, Building2, MapPin, DollarSign, TrendingUp, Clock, CheckCircle2, IndianRupee, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

const STATUS_COLORS: Record<string, string> = {
  open: "hsl(var(--primary))",
  in_progress: "hsl(var(--chart-2))",
  completed: "hsl(var(--chart-3))",
  cancelled: "hsl(var(--muted-foreground))",
};

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

  const activeCount = projects.filter((p) => p.status === "open" || p.status === "in_progress").length;
  const totalQuotes = Object.values(quoteCounts).reduce((a, b) => a + b, 0);
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + (Number(p.budget_max) || 0), 0);
  const avgBudget = projects.length > 0 ? Math.round(totalBudget / projects.length) : 0;

  const statusData = Object.entries(
    projects.reduce<Record<string, number>>((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const quoteChartData = projects
    .filter((p) => quoteCounts[p.id])
    .slice(0, 6)
    .map((p) => ({ name: p.title.length > 12 ? p.title.slice(0, 12) + "…" : p.title, quotes: quoteCounts[p.id] || 0 }));

  // Budget distribution data
  const budgetDistData = projects.slice(0, 8).map((p) => ({
    name: p.title.length > 10 ? p.title.slice(0, 10) + "…" : p.title,
    budget: Number(p.budget_max) || 0,
  }));

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Builder Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Post projects and manage your construction quotes.</p>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link to="/builder/create-project"><Plus className="mr-2 h-4 w-4" /> New Project</Link>
        </Button>
      </div>

      {/* Top Revenue Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Project Value</p>
              <p className="text-4xl font-bold tracking-tight mt-1">₹{totalBudget.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Combined max budget across {projects.length} projects</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">{totalQuotes}</p>
                <p className="text-xs text-muted-foreground">Quotes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><FolderOpen className="h-5 w-5 text-primary" /></div>
              <span className="text-sm font-medium text-muted-foreground">Active Projects</span>
            </div>
            <div className="text-3xl font-bold">{activeCount}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-chart-3">
              <ArrowUpRight className="h-3 w-3" /> Open & in progress
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-chart-2/5 rounded-bl-full" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10"><BarChart3 className="h-5 w-5 text-chart-2" /></div>
              <span className="text-sm font-medium text-muted-foreground">Quotes Received</span>
            </div>
            <div className="text-3xl font-bold">{totalQuotes}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">From contractors</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-chart-3/5 rounded-bl-full" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10"><CheckCircle2 className="h-5 w-5 text-chart-3" /></div>
              <span className="text-sm font-medium text-muted-foreground">Completed</span>
            </div>
            <div className="text-3xl font-bold">{completedCount}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-chart-3"><ArrowUpRight className="h-3 w-3" /> Projects finished</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-chart-4/5 rounded-bl-full" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10"><IndianRupee className="h-5 w-5 text-chart-4" /></div>
              <span className="text-sm font-medium text-muted-foreground">Avg Budget</span>
            </div>
            <div className="text-3xl font-bold">₹{avgBudget.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">Per project</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      {projects.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Project Status Donut */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Project Status</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--card))" label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quotes Bar Chart */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Quotes per Project</CardTitle></CardHeader>
            <CardContent className="h-56">
              {quoteChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quoteChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="quotes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">No quotes received yet</p>
              )}
            </CardContent>
          </Card>

          {/* Budget Distribution */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Budget Distribution</CardTitle></CardHeader>
            <CardContent className="h-56">
              {budgetDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetDistData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: number) => [`₹${value.toLocaleString()}`, "Budget"]} />
                    <Bar dataKey="budget" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">No budget data</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Completion Progress */}
      {projects.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">Completion Rate</p>
                <p className="text-xs text-muted-foreground">{completedCount} of {projects.length} projects completed</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-bold text-primary">{projects.length > 0 ? Math.round((completedCount / projects.length) * 100) : 0}%</span>
              </div>
            </div>
            <Progress value={projects.length > 0 ? (completedCount / projects.length) * 100 : 0} className="h-2.5" />
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      <div>
        <h2 className="font-display text-xl font-bold mb-4">Your Projects</h2>
        {loading ? <p className="text-muted-foreground">Loading...</p> : projects.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No projects yet. Create your first one!</p>
            <Button asChild className="mt-4"><Link to="/builder/create-project"><Plus className="mr-2 h-4 w-4" /> Create Project</Link></Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] || "hsl(var(--border))" }} />
                        <h3 className="font-display font-semibold leading-tight group-hover:text-primary transition-colors">{p.title}</h3>
                      </div>
                      <Badge variant={p.status === "open" ? "default" : p.status === "completed" ? "outline" : "secondary"} className="shrink-0 ml-2">{p.status}</Badge>
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
                    <div className="flex items-center gap-2 pt-2 border-t">
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
