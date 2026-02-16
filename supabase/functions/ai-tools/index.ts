import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "quote-analysis") {
      systemPrompt = "You are a construction procurement expert. Analyze the provided quotes for a construction project. Compare them highlighting pros/cons, value for money, risks, and your recommendation. Be specific and data-driven. Format with markdown headings and bullet points.";
      userPrompt = `Project: ${data.projectTitle}\nDescription: ${data.projectDescription}\nBudget Range: $${data.budgetMin || "N/A"} – $${data.budgetMax || "N/A"}\n\nQuotes to analyze:\n${data.quotes.map((q: any, i: number) => `Quote ${i + 1}: Price $${q.total_price}, Timeline: ${q.timeline || "N/A"}, Materials: ${q.materials || "N/A"}, Notes: ${q.notes || "N/A"}`).join("\n")}`;
    } else if (action === "risk-assessment") {
      systemPrompt = "You are a construction risk assessment expert. Evaluate the risk level of a construction project based on scope, budget, timeline, and other factors. Provide a risk score (Low/Medium/High/Critical), key risk factors, and mitigation recommendations. Use markdown formatting.";
      userPrompt = `Project: ${data.projectTitle}\nDescription: ${data.projectDescription}\nLocation: ${data.location || "N/A"}\nBudget: $${data.budgetMin || "N/A"} – $${data.budgetMax || "N/A"}\nTimeline: ${data.timeline || "N/A"}\nNumber of Quotes: ${data.quoteCount || 0}`;
    } else if (action === "contract-draft") {
      systemPrompt = "You are a construction contract specialist. Generate a professional but concise contract draft based on the project details and winning quote. Include sections for: Parties, Scope of Work, Price & Payment Terms, Timeline, Milestones, Warranties, Dispute Resolution, and Signatures. Use markdown formatting.";
      userPrompt = `Project: ${data.projectTitle}\nDescription: ${data.projectDescription}\nLocation: ${data.location || "N/A"}\nWinning Quote Price: $${data.quotePrice}\nTimeline: ${data.quoteTimeline || "N/A"}\nMaterials: ${data.quoteMaterials || "N/A"}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "No response generated.";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
