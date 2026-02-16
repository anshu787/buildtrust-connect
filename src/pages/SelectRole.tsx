import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, HardHat, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roles: { role: AppRole; icon: typeof Building2; title: string; description: string }[] = [
  { role: "builder", icon: Building2, title: "Builder", description: "Post projects, compare quotes, and manage construction milestones." },
  { role: "contractor", icon: HardHat, title: "Contractor", description: "Browse projects, submit quotes, and build your verified portfolio." },
];

export default function SelectRole() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<AppRole | null>(null);

  const handleSelect = async (role: AppRole) => {
    setLoading(role);
    const { error } = await setRole(role);
    setLoading(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate(role === "builder" ? "/builder" : "/contractor");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Choose Your Role</h1>
          <p className="mt-2 text-muted-foreground">Select how you'll use ConQuote Connect</p>
        </div>
        <div className="grid gap-4">
          {roles.map((r) => (
            <Card key={r.role} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => !loading && handleSelect(r.role)}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <r.icon className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-display text-lg">{r.title}</CardTitle>
                  <CardDescription className="mt-1">{r.description}</CardDescription>
                </div>
                <Button variant="outline" disabled={loading !== null}>
                  {loading === r.role ? <Loader2 className="h-4 w-4 animate-spin" /> : "Select"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
