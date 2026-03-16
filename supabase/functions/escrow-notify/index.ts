import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const notificationSchema = z.object({
  type: z.enum([
    "escrow_deposit",
    "escrow_release",
    "new_quote",
    "quote_accepted",
    "milestone_approved",
    "project_awarded",
    "project_completed",
    "new_message",
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
  recipientUserId: z.string().uuid().optional(),
});

const EMAIL_SUBJECTS: Record<string, string> = {
  escrow_deposit: "💰 Escrow Deposit Confirmed",
  escrow_release: "✅ Escrow Funds Released",
  new_quote: "📋 New Quote Received",
  quote_accepted: "🎉 Your Quote Was Accepted!",
  milestone_approved: "✅ Milestone Approved",
  project_awarded: "🏆 Project Awarded",
  project_completed: "🎊 Project Completed",
  new_message: "💬 New Message",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json();
    const parseResult = notificationSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, title, message, metadata, recipientUserId } = parseResult.data;

    let targetUserId = user.id;
    if (recipientUserId && recipientUserId !== user.id) {
      const { data: sharedQuote } = await supabase
        .from("quotes")
        .select("id, project_id, projects!inner(builder_id)")
        .or(
          `and(contractor_id.eq.${user.id}),and(contractor_id.eq.${recipientUserId})`
        )
        .limit(1);

      let hasRelationship = false;
      if (sharedQuote && sharedQuote.length > 0) {
        for (const q of sharedQuote) {
          const proj = q.projects as any;
          if (
            (proj?.builder_id === user.id && q.contractor_id === recipientUserId) ||
            (proj?.builder_id === recipientUserId && q.contractor_id === user.id)
          ) {
            hasRelationship = true;
            break;
          }
        }
      }

      if (!hasRelationship) {
        return new Response(
          JSON.stringify({ error: "Cannot send notification to unrelated user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetUserId = recipientUserId;
    }

    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id: targetUserId,
        type,
        title,
        message,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create notification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendKey) {
      const { data: userData } = await supabase.auth.admin.getUserById(targetUserId);
      const userEmail = userData?.user?.email;

      if (userEmail) {
        try {
          const emailSubject = EMAIL_SUBJECTS[type] || title;
          const accentColor = type.includes("escrow") ? "#f97316" : "#7c3aed";

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "ConQuote <notifications@resend.dev>",
              to: [userEmail],
              subject: emailSubject,
              html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden;">
                  <div style="background: ${accentColor}; padding: 24px 32px;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">${emailSubject}</h1>
                  </div>
                  <div style="padding: 32px;">
                    <h2 style="color: #1a1a2e; margin-top: 0;">${title}</h2>
                    <p style="color: #555; line-height: 1.6;">${message}</p>
                    ${metadata?.txHash ? `<p><a href="https://sepolia.etherscan.io/tx/${metadata.txHash}" style="color: ${accentColor}; font-weight: 600;">View on Etherscan →</a></p>` : ""}
                    ${metadata?.projectId ? `<p><a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/projects/${metadata.projectId}" style="color: ${accentColor}; font-weight: 600;">View Project →</a></p>` : ""}
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    <p style="color: #999; font-size: 12px;">ConQuote Connect — Smart Construction Quotations</p>
                  </div>
                </div>
              `,
            }),
          });

          if (emailRes.ok) {
            emailSent = true;
            await supabase
              .from("notifications")
              .update({ email_sent: true })
              .eq("id", notification.id);
          }
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification, emailSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
