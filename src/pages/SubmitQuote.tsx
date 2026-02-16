import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function SubmitQuote() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ total_price: "", timeline: "", materials: "", notes: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId) return;
    setSubmitting(true);
    const { error } = await supabase.from("quotes").insert({
      project_id: projectId, contractor_id: user.id, total_price: Number(form.total_price),
      timeline: form.timeline || null, materials: form.materials || null, notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Quote submitted!" }); navigate(`/projects/${projectId}`); }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      <Card>
        <CardHeader><CardTitle className="font-display text-2xl">Submit Quote</CardTitle><CardDescription>Provide your detailed pricing and timeline for this project.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="total_price">Total Price ($) *</Label><Input id="total_price" name="total_price" type="number" value={form.total_price} onChange={handleChange} required placeholder="150000" /></div>
            <div className="space-y-2"><Label htmlFor="timeline">Estimated Timeline</Label><Input id="timeline" name="timeline" value={form.timeline} onChange={handleChange} placeholder="e.g. 4 months" /></div>
            <div className="space-y-2"><Label htmlFor="materials">Materials Breakdown</Label><Textarea id="materials" name="materials" value={form.materials} onChange={handleChange} placeholder="List key materials..." rows={3} /></div>
            <div className="space-y-2"><Label htmlFor="notes">Additional Notes</Label><Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Any additional information..." rows={3} /></div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Quote</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
