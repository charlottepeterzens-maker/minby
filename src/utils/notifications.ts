import { supabase } from "@/integrations/supabase/client";

/**
 * Helper to send a notification via the edge function.
 * This handles both in-app notifications and push notifications.
 * It also supports summarization of duplicate notifications within 5 minutes.
 */
export async function sendNotification({
  recipientUserId,
  fromUserId,
  type,
  referenceId,
  message,
}: {
  recipientUserId: string;
  fromUserId: string;
  type: string;
  referenceId: string;
  message: string;
}) {
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: { recipientUserId, fromUserId, type, referenceId, message },
    });
  } catch {
    // Fallback: insert in-app notification directly
    await supabase.from("notifications").insert({
      user_id: recipientUserId,
      from_user_id: fromUserId,
      type,
      reference_id: referenceId,
      title: message,
      body: null,
    });
  }
}
