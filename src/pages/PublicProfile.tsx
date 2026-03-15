import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, User, Star, ShieldCheck, Briefcase, MapPin, Calendar,
  IndianRupee, Award, Building2, Hammer
} from "lucide-react";

interface ProfileData {
  user_id: string;
  company_name: string | null;
  contact_info: string | null;
  avatar_url: string | null;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  project_id: string;
}

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const [profileRes, roleRes, reviewsRes, projectsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, company_name, contact_info, avatar_url").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
        supabase.from("reviews").select("*").eq("reviewee_id", userId).order("created_at", { ascending: false }),
        supabase.from("projects").select("*").eq("builder_id", userId).order("created_at", { ascending: false }),
      ]);
      setProfile(profileRes.data as ProfileData | null);
      setRole((roleRes.data as any)?.role || null);
      setReviews((reviewsRes.data as ReviewData[]) || []);
      setProjects((projectsRes.data as ProjectData[]) || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground">Profile not found.</p></div>;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const completedProjects = projects.filter(p => p.status === "completed").length;
  const verifiedBadge = reviews.length >= 1 && Number(avgRating) >= 4;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-chart-2/20 to-chart-3/20" />
        <CardContent className="relative pt-0 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              {profile.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
              <AvatarFallback className="text-2xl"><User className="h-10 w-10" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-display">
                  {profile.company_name || "User"}
                </h1>
                {verifiedBadge && (
                  <Badge variant="outline" className="gap-1 border-accent text-accent">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                )}
                {role && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    {role === "builder" ? <Building2 className="h-3 w-3" /> : <Hammer className="h-3 w-3" />}
                    {role}
                  </Badge>
                )}
              </div>
              {profile.contact_info && (
                <p className="text-sm text-muted-foreground mt-1">{profile.contact_info}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="rounded-xl border bg-muted/30 p-4 text-center">
              <p className="text-2xl font-bold text-primary">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Total Projects</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4 text-center">
              <p className="text-2xl font-bold text-chart-2">{completedProjects}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-chart-3 text-chart-3" />
                <span className="text-2xl font-bold text-chart-3">{avgRating || "—"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{reviews.length} Review{reviews.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="projects" className="gap-1"><Briefcase className="h-3.5 w-3.5" /> Projects</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1"><Star className="h-3.5 w-3.5" /> Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          {projects.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No projects to show.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{p.title}</CardTitle>
                        <Badge
                          variant={p.status === "completed" ? "default" : "secondary"}
                          className="text-[10px] capitalize shrink-0"
                        >
                          {p.status === "completed" && <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />}
                          {p.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>}
                        {(p.budget_min || p.budget_max) && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {p.budget_min ? `₹${Number(p.budget_min).toLocaleString()}` : ""}
                            {p.budget_min && p.budget_max ? " – " : ""}
                            {p.budget_max ? `₹${Number(p.budget_max).toLocaleString()}` : ""}
                          </span>
                        )}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews">
          {reviews.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No reviews yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "fill-chart-3 text-chart-3" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
