import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, BarChart3, Building2, MapPin, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

export default function BuilderDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: projs } = await supabase
        .from("projects")
        .select("*")
        .eq("builder_id", user.id)
        .order("created_at", { ascending: false });
      setProjects(projs || []);

      // Fetch quote counts per project
      if (projs && projs.length > 0) {
        const ids = projs.map((p) => p.id);
        const { data: quotes } = await supabase
          .from("quotes")
          .select("project_id")
          .in("project_id", ids);
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Builder Dashboard</h1>
            <p className="text-muted-foreground">Post projects and manage your construction quotes.</p>
          </div>
          <Button asChild><Link to="/builder/create-project"><Plus className="mr-2 h-4 w-4" /> New Project</Link></Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quotes Received</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalQuotes}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{completedCount}</div></CardContent>
          </Card>
        </div>

        <h2 className="font-display text-xl font-bold mb-4">Your Projects</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No projects yet. Create your first one!</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display font-semibold">{p.title}</h3>
                      <Badge variant={p.status === "open" ? "default" : "secondary"}>{p.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                      {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
                      {(p.budget_min || p.budget_max) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {p.budget_min && `$${Number(p.budget_min).toLocaleString()}`}
                          {p.budget_min && p.budget_max && " – "}
                          {p.budget_max && `$${Number(p.budget_max).toLocaleString()}`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-primary font-medium">{quoteCounts[p.id] || 0} quote(s)</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
