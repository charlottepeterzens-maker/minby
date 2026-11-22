import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT");

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface MessageRow {
  id: string;
  circle_id: string;
  user_id: string | null;
  body: string | null;
  kind: string;
  payload: { title?: string } | null;
}

const notificationText = (kind: string, senderName: string, body: string | null, payload: MessageRow["payload"]) => {
  if (kind === "meeting_proposal") return `${senderName} föreslår att ses: ${payload?.title ?? ""}`;
  return `${senderName}: ${body ?? ""}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error("VAPID secrets not configured");
    }

    const { message_id } = await req.json();
    if (!message_id) {
      return new Response(JSON.stringify({ error: "message_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: message, error: msgErr } = await admin
      .from("messages")
      .select("id, circle_id, user_id, body, kind, payload")
      .eq("id", message_id)
      .maybeSingle();
    if (msgErr) throw msgErr;
    if (!message || !["text", "meeting_proposal"].includes(message.kind)) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: circle }, { data: senderProfile }, { data: members }] = await Promise.all([
      admin.from("circles").select("name").eq("id", message.circle_id).maybeSingle(),
      message.user_id
        ? admin.from("profiles").select("display_name").eq("user_id", message.user_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("circle_members")
        .select("user_id, notify_level")
        .eq("circle_id", message.circle_id)
        .neq("user_id", message.user_id ?? ""),
    ]);

    const senderName = senderProfile?.display_name ?? "Någon";
    const circleName = circle?.name ?? "Minby";
    const text = notificationText(message.kind, senderName, message.body, message.payload);

    const recipientIds = (members ?? []).map((m) => m.user_id);
    const { data: recipientProfiles } = recipientIds.length
      ? await admin.from("profiles").select("user_id, display_name").in("user_id", recipientIds)
      : { data: [] as { user_id: string; display_name: string | null }[] };
    const nameByUser = new Map((recipientProfiles ?? []).map((p) => [p.user_id, p.display_name ?? ""]));

    const eligibleIds = (members ?? [])
      .filter((m) => {
        if (m.notify_level === "silent") return false;
        if (m.notify_level === "all") return true;
        // 'important': meeting proposals always, text messages only if the body mentions them
        if (message.kind === "meeting_proposal") return true;
        const name = nameByUser.get(m.user_id);
        if (!name) return false;
        return (message.body ?? "").toLowerCase().includes(`@${name.toLowerCase()}`);
      })
      .map((m) => m.user_id);

    if (!eligibleIds.length) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", eligibleIds);

    const payload = JSON.stringify({
      title: circleName,
      body: text,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      tag: message.circle_id,
      data: { url: `/chat/${message.circle_id}` },
    });

    let sent = 0;
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
        } catch (e) {
          const statusCode = (e as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          } else {
            console.error("push send error", statusCode, e);
          }
        }
      }),
    );

    return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-message-notification error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Fel" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
