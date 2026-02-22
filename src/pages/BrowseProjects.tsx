import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Calendar, DollarSign, Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

export default function BrowseProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("projects").select("*").eq("status", "open").order("created_at", { ascending: false });
      setProjects(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) || (p.location && p.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container py-8">
      <div className="mb-6"><h1 className="font-display text-3xl font-bold">Browse Open Projects</h1><p className="text-muted-foreground">Find construction projects to bid on.</p></div>
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by title or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
      {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No open projects found.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2"><h3 className="font-display font-semibold text-lg">{p.title}</h3><Badge>Open</Badge></div>
                {p.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                  {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
                  {p.timeline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.timeline}</span>}
                  {(p.budget_min || p.budget_max) && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{p.budget_min && `₹${Number(p.budget_min).toLocaleString()}`}{p.budget_min && p.budget_max && " – "}{p.budget_max && `₹${Number(p.budget_max).toLocaleString()}`}</span>}
                </div>
                <Button asChild size="sm" className="w-full"><Link to={`/projects/${p.id}`}>View Details</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
