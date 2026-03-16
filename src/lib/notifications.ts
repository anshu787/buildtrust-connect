import { supabase } from "@/integrations/supabase/client";

type NotificationType =
  | "escrow_deposit"
  | "escrow_release"
  | "new_quote"
  | "quote_accepted"
  | "milestone_approved"
  | "project_awarded"
  | "project_completed"
  | "new_message";

interface NotifyParams {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  recipientUserId?: string;
}

export async function sendNotification(params: NotifyParams) {
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

// Backward-compatible alias
export const sendEscrowNotification = sendNotification;
