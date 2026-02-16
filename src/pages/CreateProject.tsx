import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import AppHeader from "@/components/AppHeader";

export default function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    budget_min: "",
    budget_max: "",
    timeline: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from("projects").insert({
      builder_id: user.id,
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      timeline: form.timeline || null,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Project created!" });
      navigate("/builder");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-8">
        <Button variant="ghost" onClick={() => navigate("/builder")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Create New Project</CardTitle>
            <CardDescription>Post a construction project for contractors to bid on.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input id="title" name="title" value={form.title} onChange={handleChange} required placeholder="e.g. 3-Story Residential Building" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={form.description} onChange={handleChange} placeholder="Describe the project scope, requirements, and any special considerations..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Lagos, Nigeria" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_min">Min Budget ($)</Label>
                  <Input id="budget_min" name="budget_min" type="number" value={form.budget_min} onChange={handleChange} placeholder="50000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_max">Max Budget ($)</Label>
                  <Input id="budget_max" name="budget_max" type="number" value={form.budget_max} onChange={handleChange} placeholder="200000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Input id="timeline" name="timeline" value={form.timeline} onChange={handleChange} placeholder="e.g. 6 months" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
