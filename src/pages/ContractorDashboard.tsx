import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Award, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Quote = Tables<"quotes">;

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

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Contractor Dashboard</h1>
          <p className="text-muted-foreground">Browse projects, submit quotes, and track your work.</p>
        </div>
        <Button asChild><Link to="/contractor/browse"><Search className="mr-2 h-4 w-4" /> Browse Projects</Link></Button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending Quotes</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Awarded Projects</CardTitle><Award className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{acceptedCount}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Quoted</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${quotes.reduce((s, q) => s + Number(q.total_price), 0).toLocaleString()}</div></CardContent></Card>
      </div>
      <h2 className="font-display text-xl font-bold mb-4">My Quotes</h2>
      {loading ? <p className="text-muted-foreground">Loading...</p> : quotes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No quotes submitted yet. Browse projects to get started!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <Link key={q.id} to={`/projects/${q.project_id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">${Number(q.total_price).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{q.timeline || "No timeline"} • {q.notes ? q.notes.slice(0, 60) + "..." : "No notes"}</p>
                  </div>
                  <Badge variant={q.status === "accepted" ? "default" : q.status === "rejected" ? "destructive" : "secondary"}>{q.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
