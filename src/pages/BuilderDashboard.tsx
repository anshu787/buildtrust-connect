import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, BarChart3, Building2, MapPin, DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
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

  // Chart data
  const statusData = Object.entries(
    projects.reduce<Record<string, number>>((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const quoteChartData = projects
    .filter((p) => quoteCounts[p.id])
    .slice(0, 6)
    .map((p) => ({ name: p.title.length > 12 ? p.title.slice(0, 12) + "…" : p.title, quotes: quoteCounts[p.id] || 0 }));

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Builder Dashboard</h1>
          <p className="text-muted-foreground">Post projects and manage your construction quotes.</p>
        </div>
        <Button asChild><Link to="/builder/create-project"><Plus className="mr-2 h-4 w-4" /> New Project</Link></Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Projects</CardTitle><FolderOpen className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{activeCount}</div><p className="text-xs text-muted-foreground mt-1">Open & in progress</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Quotes Received</CardTitle><BarChart3 className="h-4 w-4 text-chart-2" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totalQuotes}</div><p className="text-xs text-muted-foreground mt-1">From contractors</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle><CheckCircle2 className="h-4 w-4 text-chart-3" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{completedCount}</div><p className="text-xs text-muted-foreground mt-1">Projects finished</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Budget</CardTitle><DollarSign className="h-4 w-4 text-chart-4" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">${totalBudget.toLocaleString()}</div><p className="text-xs text-muted-foreground mt-1">Combined max budget</p></CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      {projects.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Project Status</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Quotes per Project</CardTitle></CardHeader>
            <CardContent className="h-52">
              {quoteChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quoteChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Bar dataKey="quotes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">No quotes received yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project completion progress */}
      {projects.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Completion Rate</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{completedCount} of {projects.length} projects completed</span>
              <span className="font-medium">{projects.length > 0 ? Math.round((completedCount / projects.length) * 100) : 0}%</span>
            </div>
            <Progress value={projects.length > 0 ? (completedCount / projects.length) * 100 : 0} className="h-2" />
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
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full border-l-4" style={{ borderLeftColor: STATUS_COLORS[p.status] || "hsl(var(--border))" }}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-display font-semibold leading-tight">{p.title}</h3>
                      <Badge variant={p.status === "open" ? "default" : p.status === "completed" ? "outline" : "secondary"} className="shrink-0 ml-2">{p.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                      {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
                      {(p.budget_min || p.budget_max) && (
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />
                          {p.budget_min && `$${Number(p.budget_min).toLocaleString()}`}
                          {p.budget_min && p.budget_max && " – "}
                          {p.budget_max && `$${Number(p.budget_max).toLocaleString()}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
