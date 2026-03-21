import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, User, Search, Building2, Hammer, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserProfile {
  user_id: string;
  company_name: string | null;
  avatar_url: string | null;
  roles: string[];
  avg_rating: number | null;
  review_count: number;
}

export default function UserDirectory() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, company_name, avatar_url");

      if (!profilesData) { setLoading(false); return; }

      // Fetch roles and reviews for all users
      const userIds = profilesData.map(p => p.user_id);
      const [rolesRes, reviewsRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        supabase.from("reviews").select("reviewee_id, rating").in("reviewee_id", userIds),
      ]);

      const roleMap: Record<string, string[]> = {};
      (rolesRes.data || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        if (!roleMap[r.user_id].includes(r.role)) {
          roleMap[r.user_id].push(r.role);
        }
      });

      const reviewMap: Record<string, { total: number; count: number }> = {};
      (reviewsRes.data || []).forEach((r: any) => {
        if (!reviewMap[r.reviewee_id]) reviewMap[r.reviewee_id] = { total: 0, count: 0 };
        reviewMap[r.reviewee_id].total += r.rating;
        reviewMap[r.reviewee_id].count += 1;
      });

      const combined: UserProfile[] = profilesData.map(p => ({
        user_id: p.user_id,
        company_name: p.company_name,
        avatar_url: p.avatar_url,
        roles: roleMap[p.user_id] || [],
        avg_rating: reviewMap[p.user_id] ? reviewMap[p.user_id].total / reviewMap[p.user_id].count : null,
        review_count: reviewMap[p.user_id]?.count || 0,
      }));

      setProfiles(combined);
      setLoading(false);
    };
    fetchProfiles();
  }, []);

  const filtered = profiles.filter(p => {
    if (filterRole && !p.roles.includes(filterRole)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.company_name || "").toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="font-display text-3xl font-bold mb-2">User Directory</h1>
      <p className="text-muted-foreground mb-6">Browse builders and contractors on the platform.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterRole === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterRole(null)}
          >
            All
          </Button>
          <Button
            variant={filterRole === "builder" ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setFilterRole("builder")}
          >
            <Building2 className="h-3 w-3" /> Builders
          </Button>
          <Button
            variant={filterRole === "contractor" ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setFilterRole("contractor")}
          >
            <Hammer className="h-3 w-3" /> Contractors
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No users found.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(p => {
            const verified = p.review_count >= 1 && (p.avg_rating || 0) >= 4;
            return (
              <Link key={p.user_id} to={`/user/${p.user_id}`}>
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {p.avatar_url ? <AvatarImage src={p.avatar_url} /> : null}
                      <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{p.company_name || "User"}</p>
                        {verified && (
                          <Badge variant="outline" className="gap-0.5 text-[10px] border-accent text-accent">
                            <ShieldCheck className="h-2.5 w-2.5" /> Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {p.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="gap-0.5 text-[10px] capitalize">
                            {role === "builder" ? <Building2 className="h-2.5 w-2.5" /> : <Hammer className="h-2.5 w-2.5" />}
                            {role}
                          </Badge>
                        ))}
                        {p.avg_rating && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-chart-3 text-chart-3" />
                            {p.avg_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
