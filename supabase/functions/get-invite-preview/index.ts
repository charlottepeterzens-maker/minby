import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ ok: false, status: "invalid" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: invite } = await admin
      .from("circle_invites")
      .select("id, circle_id, created_by, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!invite) {
      return new Response(JSON.stringify({ ok: false, status: "invalid" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ ok: false, status: "expired" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: circle } = await admin
      .from("circles")
      .select("id, name, hero_image_url")
      .eq("id", invite.circle_id)
      .maybeSingle();

    const { data: mems } = await admin
      .from("circle_members")
      .select("user_id")
      .eq("circle_id", invite.circle_id);
    const memberIds = (mems ?? []).map((m: any) => m.user_id);
    let members: { display_name: string | null; avatar_url: string | null }[] = [];
    let member_count = memberIds.length;
    const nameById = new Map<string, string>();
    if (memberIds.length) {
      const { data: profs } = await admin
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", memberIds);
      members = (profs ?? []).map((p: any) => ({
        display_name: p.display_name ?? null,
        avatar_url: p.avatar_url ?? null,
      }));
      (profs ?? []).forEach((p: any) => nameById.set(p.user_id, p.display_name ?? "Någon"));
    }

    const inviterName = invite.created_by ? nameById.get(invite.created_by) ?? "Någon" : "Någon";

    const { data: msgs } = await admin
      .from("messages")
      .select("id, user_id, body, kind, payload, created_at")
      .eq("circle_id", invite.circle_id)
      .order("created_at", { ascending: false })
      .limit(3);
    const recentMessages = (msgs ?? [])
      .slice()
      .reverse()
      .map((m: any) => ({
        id: m.id,
        sender_name: m.user_id ? nameById.get(m.user_id) ?? "Någon" : "Någon",
        kind: m.kind,
        body: m.body,
        meeting_title: m.kind === "meeting_proposal" ? m.payload?.title ?? null : null,
      }));

    return new Response(JSON.stringify({
      ok: true,
      circle_id: circle?.id,
      circle_name: circle?.name ?? "en krets",
      hero_image_url: circle?.hero_image_url ?? null,
      inviter_name: inviterName,
      members: members.slice(0, 8),
      member_count,
      recent_messages: recentMessages,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, status: "invalid", error: String(e) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
