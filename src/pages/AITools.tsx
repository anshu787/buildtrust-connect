import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Brain, FileText, Shield, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type Quote = Tables<"quotes">;

const tools = [
  { id: "quote-analysis", title: "Quote Analysis", icon: Brain, description: "AI compares submitted quotes highlighting pros, cons, value, and risks." },
  { id: "risk-assessment", title: "Risk Assessment", icon: Shield, description: "AI evaluates project risk based on scope, budget, and timeline." },
  { id: "contract-draft", title: "Contract Draft", icon: FileText, description: "AI generates a contract draft from project and winning quote details." },
];

export default function AITools() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      if (role === "builder") {
        const { data } = await supabase.from("projects").select("*").eq("builder_id", user.id).order("created_at", { ascending: false });
        setProjects(data || []);
      } else {
        const { data: qs } = await supabase.from("quotes").select("project_id").eq("contractor_id", user.id);
        if (qs && qs.length > 0) {
          const ids = [...new Set(qs.map((q) => q.project_id))];
          const { data } = await supabase.from("projects").select("*").in("id", ids);
          setProjects(data || []);
        }
      }
      setLoadingProjects(false);
    };
    fetch();
  }, [user, role]);

  useEffect(() => {
    if (!selectedProject) return;
    const fetch = async () => {
      const { data } = await supabase.from("quotes").select("*").eq("project_id", selectedProject);
      setQuotes(data || []);
    };
    fetch();
  }, [selectedProject]);

  const runTool = async () => {
    if (!selectedProject || !selectedTool) {
      toast({ title: "Select a project and tool first", variant: "destructive" });
      return;
    }
    const project = projects.find((p) => p.id === selectedProject);
    if (!project) return;

    setLoading(true);
    setResult("");

    let payload: any = { action: selectedTool, data: {} };

    if (selectedTool === "quote-analysis") {
      if (quotes.length === 0) { toast({ title: "No quotes to analyze", variant: "destructive" }); setLoading(false); return; }
      payload.data = {
        projectTitle: project.title,
        projectDescription: project.description,
        budgetMin: project.budget_min,
        budgetMax: project.budget_max,
        quotes: quotes.map((q) => ({ total_price: q.total_price, timeline: q.timeline, materials: q.materials, notes: q.notes, quote_pdf_url: q.quote_pdf_url })),
      };
    } else if (selectedTool === "risk-assessment") {
      payload.data = {
        projectTitle: project.title,
        projectDescription: project.description,
        location: project.location,
        budgetMin: project.budget_min,
        budgetMax: project.budget_max,
        timeline: project.timeline,
        quoteCount: quotes.length,
      };
    } else if (selectedTool === "contract-draft") {
      const accepted = quotes.find((q) => q.status === "accepted");
      if (!accepted) { toast({ title: "No accepted quote found for this project", variant: "destructive" }); setLoading(false); return; }
      payload.data = {
        projectTitle: project.title,
        projectDescription: project.description,
        location: project.location,
        quotePrice: accepted.total_price,
        quoteTimeline: accepted.timeline,
        quoteMaterials: accepted.materials,
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke("ai-tools", { body: payload });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
      } else {
        setResult(data?.result || "No result.");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-bold mb-2">AI-Powered Tools</h1>
      <p className="text-muted-foreground mb-8">Use AI to analyze quotes, assess risks, and draft contracts.</p>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {tools.map((t) => (
          <Card
            key={t.id}
            className={`cursor-pointer transition-all ${selectedTool === t.id ? "border-primary shadow-md" : "hover:border-primary/30"}`}
            onClick={() => setSelectedTool(t.id)}
          >
            <CardContent className="p-5">
              <t.icon className={`h-8 w-8 mb-3 ${selectedTool === t.id ? "text-primary" : "text-muted-foreground"}`} />
              <h3 className="font-display font-semibold mb-1">{t.title}</h3>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="font-display text-lg">Select Project</CardTitle>
          <CardDescription>Choose a project to run the AI tool on.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="sm:w-[300px]">
              <SelectValue placeholder={loadingProjects ? "Loading..." : "Select a project"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runTool} disabled={loading || !selectedProject || !selectedTool}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
            Run Analysis
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              {tools.find((t) => t.id === selectedTool)?.title} Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">{result}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
