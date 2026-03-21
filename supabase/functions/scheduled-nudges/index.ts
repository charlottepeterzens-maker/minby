import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const results = { trigger1: 0, trigger2: 0 };

    // ===== TRIGGER 1: No post within 48h of registration =====
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    // Find users who registered between 48h and 72h ago (window to avoid re-checking old users)
    const cutoff72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

    const { data: newUsers } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .lte("created_at", cutoff48h)
      .gte("created_at", cutoff72h);

    if (newUsers && newUsers.length > 0) {
      for (const u of newUsers) {
        // Check if already sent this nudge
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", u.user_id)
          .eq("type", "nudge_first_post")
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Check if user has any posts or hangouts
        const { count: postCount } = await supabase
          .from("life_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", u.user_id);

        const { count: hangoutCount } = await supabase
          .from("hangout_availability")
          .select("*", { count: "exact", head: true })
          .eq("user_id", u.user_id);

        if ((postCount || 0) === 0 && (hangoutCount || 0) === 0) {
          await supabase.from("notifications").insert({
            user_id: u.user_id,
            from_user_id: null,
            type: "nudge_first_post",
            reference_id: null,
            title: "Din by väntar",
            body: "Vad hände i din vardag idag? Dela något med din krets.",
          });

          // Send push via the existing function
          try {
            await sendPush(supabase, u.user_id, "Din by väntar", "Vad hände i din vardag idag? Dela något med din krets.");
          } catch { /* best effort */ }

          results.trigger1++;
        }
      }
    }

    // ===== TRIGGER 2: No hangout activity in 7 days =====
    const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    // Only check users who have been registered for at least 7 days
    const { data: olderUsers } = await supabase
      .from("profiles")
      .select("user_id")
      .lte("created_at", cutoff7d);

    if (olderUsers && olderUsers.length > 0) {
      for (const u of olderUsers) {
        // Check if already sent this nudge
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", u.user_id)
          .eq("type", "nudge_hangout")
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Check if user or any of their friends created a hangout in last 7 days
        const { count: ownHangouts } = await supabase
          .from("hangout_availability")
          .select("*", { count: "exact", head: true })
          .eq("user_id", u.user_id)
          .gte("created_at", cutoff7d);

        if ((ownHangouts || 0) > 0) continue;

        // Check friends' hangouts
        const { data: friends } = await supabase
          .from("friend_access_tiers")
          .select("owner_id")
          .eq("friend_user_id", u.user_id);

        let friendHangoutFound = false;
        if (friends && friends.length > 0) {
          const friendIds = friends.map(f => f.owner_id);
          const { count: friendHangouts } = await supabase
            .from("hangout_availability")
            .select("*", { count: "exact", head: true })
            .in("user_id", friendIds)
            .gte("created_at", cutoff7d);

          if ((friendHangouts || 0) > 0) friendHangoutFound = true;
        }

        if (!friendHangoutFound) {
          await supabase.from("notifications").insert({
            user_id: u.user_id,
            from_user_id: null,
            type: "nudge_hangout",
            reference_id: null,
            title: "Ni sa 'vi måste ses'",
            body: "Vill du föreslå något den här veckan? Det tar bara en minut.",
          });

          try {
            await sendPush(supabase, u.user_id, "Ni sa 'vi måste ses'", "Vill du föreslå något den här veckan? Det tar bara en minut.");
          } catch { /* best effort */ }

          results.trigger2++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scheduled-nudges error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Send web push directly to a user's subscriptions */
async function sendPush(supabase: any, userId: string, title: string, body: string) {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    data: { url: "/feed" },
  });

  // Import crypto helpers inline for push encryption
  // For scheduled nudges, we call the send-push-notification function instead
  // to reuse the existing VAPID/encryption logic
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      recipientUserId: userId,
      fromUserId: null,
      type: "nudge",
      referenceId: null,
      message: body,
    }),
  });
}
