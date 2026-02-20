import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Award, DollarSign, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Quote = Tables<"quotes">;

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--chart-2))",
  accepted: "hsl(var(--chart-3))",
  rejected: "hsl(var(--destructive))",
};

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("quotes").select("*").eq("contractor_id", user.id).order("created_at", { ascending: false });
      setQuotes(data || []);
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

  const statusData = [
    { name: "Pending", value: pendingCount },
    { name: "Accepted", value: acceptedCount },
    { name: "Rejected", value: rejectedCount },
  ].filter((d) => d.value > 0);

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Contractor Dashboard</h1>
          <p className="text-muted-foreground">Browse projects, submit quotes, and track your work.</p>
        </div>
        <Button asChild><Link to="/contractor/browse"><Search className="mr-2 h-4 w-4" /> Browse Projects</Link></Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending Quotes</CardTitle><Clock className="h-4 w-4 text-chart-2" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{pendingCount}</div><p className="text-xs text-muted-foreground mt-1">Awaiting response</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Awarded</CardTitle><Award className="h-4 w-4 text-chart-3" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{acceptedCount}</div><p className="text-xs text-muted-foreground mt-1">Projects won</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Quoted</CardTitle><DollarSign className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">${totalQuoted.toLocaleString()}</div><p className="text-xs text-muted-foreground mt-1">All submissions</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Won Value</CardTitle><TrendingUp className="h-4 w-4 text-chart-4" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">${acceptedValue.toLocaleString()}</div><p className="text-xs text-muted-foreground mt-1">Accepted quotes</p></CardContent>
        </Card>
      </div>

      {/* Charts & Win Rate */}
      {quotes.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Quote Status Breakdown</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase()] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Win Rate</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-52 gap-4">
              <div className="text-5xl font-bold text-primary">{winRate}%</div>
              <Progress value={winRate} className="h-3 w-full max-w-xs" />
              <p className="text-sm text-muted-foreground">{acceptedCount} won out of {quotes.length} submitted</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quotes List */}
      <div>
        <h2 className="font-display text-xl font-bold mb-4">My Quotes</h2>
        {loading ? <p className="text-muted-foreground">Loading...</p> : quotes.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No quotes submitted yet. Browse projects to get started!</p>
            <Button asChild className="mt-4"><Link to="/contractor/browse"><Search className="mr-2 h-4 w-4" /> Browse Projects</Link></Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <Link key={q.id} to={`/projects/${q.project_id}`}>
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4" style={{ borderLeftColor: STATUS_COLORS[q.status] || "hsl(var(--border))" }}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        {q.status === "accepted" ? <CheckCircle2 className="h-5 w-5 text-chart-3" /> : q.status === "rejected" ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-chart-2" />}
                      </div>
                      <div>
                        <p className="font-semibold">${Number(q.total_price).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{q.timeline || "No timeline"} • {q.notes ? q.notes.slice(0, 60) + "..." : "No notes"}</p>
                      </div>
                    </div>
                    <Badge variant={q.status === "accepted" ? "default" : q.status === "rejected" ? "destructive" : "secondary"}>{q.status}</Badge>
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
