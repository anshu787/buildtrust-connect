import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const notificationSchema = z.object({
  type: z.enum(["escrow_deposit", "escrow_release"]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
  recipientUserId: z.string().uuid().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input with zod
    const rawBody = await req.json();
    const parseResult = notificationSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, title, message, metadata, recipientUserId } = parseResult.data;

    // If sending to another user, verify they share a project relationship
    let targetUserId = user.id;
    if (recipientUserId && recipientUserId !== user.id) {
      // Check if users share a project (sender is builder & recipient is contractor, or vice versa)
      const { data: sharedProject } = await supabase
        .from("projects")
        .select("id")
        .or(
          `and(builder_id.eq.${user.id}),and(builder_id.eq.${recipientUserId})`
        )
        .limit(1);

      // Also check via quotes for contractor-builder relationship
      const { data: sharedQuote } = await supabase
        .from("quotes")
        .select("id, project_id, projects!inner(builder_id)")
        .or(
          `and(contractor_id.eq.${user.id}),and(contractor_id.eq.${recipientUserId})`
        )
        .limit(1);

      // Verify actual relationship: user and recipient must be on the same project
      let hasRelationship = false;

      if (sharedQuote && sharedQuote.length > 0) {
        for (const q of sharedQuote) {
          const proj = q.projects as any;
          // Builder sending to contractor or contractor sending to builder
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

    // Insert notification
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

    // Try to send email if RESEND_API_KEY is configured
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendKey) {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(targetUserId);
      const userEmail = userData?.user?.email;

      if (userEmail) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "BuildChain <notifications@resend.dev>",
              to: [userEmail],
              subject: title,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #f97316;">${title}</h2>
                  <p>${message}</p>
                  ${metadata?.txHash ? `<p><a href="https://sepolia.etherscan.io/tx/${metadata.txHash}" style="color: #f97316;">View on Etherscan →</a></p>` : ""}
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="color: #999; font-size: 12px;">BuildChain Escrow Notification</p>
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
