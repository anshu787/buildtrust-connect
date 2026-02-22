import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Award, IndianRupee, TrendingUp, Clock, CheckCircle2, XCircle, ArrowUpRight, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
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
  const avgQuote = quotes.length > 0 ? Math.round(totalQuoted / quotes.length) : 0;

  const statusData = [
    { name: "Pending", value: pendingCount },
    { name: "Accepted", value: acceptedCount },
    { name: "Rejected", value: rejectedCount },
  ].filter((d) => d.value > 0);

  // Quote value distribution
  const quoteValueData = quotes.slice(0, 8).map((q, i) => ({
    name: `Q${i + 1}`,
    value: Number(q.total_price),
    status: q.status,
  }));

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Contractor Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse projects, submit quotes, and track your work.</p>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link to="/contractor/browse"><Search className="mr-2 h-4 w-4" /> Browse Projects</Link>
        </Button>
      </div>

      {/* Revenue Banner */}
      <Card className="bg-gradient-to-r from-chart-3/10 via-chart-3/5 to-transparent border-chart-3/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Quoted Value</p>
              <p className="text-4xl font-bold tracking-tight mt-1">₹{totalQuoted.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Across {quotes.length} submissions</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-chart-3">₹{acceptedValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Won Value</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">₹{avgQuote.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Avg Quote</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-chart-2/5 rounded-bl-full" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10"><Clock className="h-5 w-5 text-chart-2" /></div>
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
            </div>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Awaiting response</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-chart-3/5 rounded-bl-full" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10"><Award className="h-5 w-5 text-chart-3" /></div>
              <span className="text-sm font-medium text-muted-foreground">Awarded</span>
            </div>
            <div className="text-3xl font-bold">{acceptedCount}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-chart-3"><ArrowUpRight className="h-3 w-3" /> Projects won</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><IndianRupee className="h-5 w-5 text-primary" /></div>
              <span className="text-sm font-medium text-muted-foreground">Won Value</span>
            </div>
            <div className="text-3xl font-bold">₹{acceptedValue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Accepted quotes</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-chart-4/5 rounded-bl-full" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10"><Target className="h-5 w-5 text-chart-4" /></div>
              <span className="text-sm font-medium text-muted-foreground">Win Rate</span>
            </div>
            <div className="text-3xl font-bold">{winRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">{acceptedCount} of {quotes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Win Rate */}
      {quotes.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Quote Status</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--card))" label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase()] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Win Rate Progress</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-56 gap-4">
              <div className="relative flex items-center justify-center">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${winRate * 2.51} 251`} />
                </svg>
                <span className="absolute text-2xl font-bold">{winRate}%</span>
              </div>
              <p className="text-sm text-muted-foreground">{acceptedCount} won out of {quotes.length} submitted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Quote Values</CardTitle></CardHeader>
            <CardContent className="h-56">
              {quoteValueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quoteValueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: number) => [`₹${value.toLocaleString()}`, "Amount"]} />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
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
          <Card><CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No quotes submitted yet. Browse projects to get started!</p>
            <Button asChild className="mt-4"><Link to="/contractor/browse"><Search className="mr-2 h-4 w-4" /> Browse Projects</Link></Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <Link key={q.id} to={`/projects/${q.project_id}`}>
                <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${STATUS_COLORS[q.status]}20` }}>
                        {q.status === "accepted" ? <CheckCircle2 className="h-5 w-5 text-chart-3" /> : q.status === "rejected" ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-chart-2" />}
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">₹{Number(q.total_price).toLocaleString()}</p>
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
