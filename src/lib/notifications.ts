import { supabase } from "@/integrations/supabase/client";

interface NotifyParams {
  type: "escrow_deposit" | "escrow_release";
  title: string;
  message: string;
  metadata?: Record<string, any>;
  recipientUserId?: string;
}

export async function sendEscrowNotification(params: NotifyParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await supabase.functions.invoke("escrow-notify", {
      body: params,
    });

    if (response.error) {
      console.error("Notification error:", response.error);
    }

    return response.data;
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}
