import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const userId = user.id;

    // Delete owned circles (cascades members, messages, invites, meetings)
    await admin.from("circles").delete().eq("created_by", userId);
    // Leave any circles the user is member of
    await admin.from("circle_members").delete().eq("user_id", userId);
    // Delete user-owned content
    await admin.from("photos").delete().eq("owner_id", userId);
    await admin.from("tips").delete().eq("owner_id", userId);
    await admin.from("profiles").delete().eq("user_id", userId);

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
