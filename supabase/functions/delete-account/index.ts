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

    // Snapshot storage paths before deleting the rows that record them —
    // once the rows are gone there's no way to find the files again.
    const [{ data: ownedPhotos }, { data: ownedTips }] = await Promise.all([
      admin.from("photos").select("storage_path").eq("owner_id", userId),
      admin.from("tips").select("image_path").eq("owner_id", userId),
    ]);
    const circlePhotoPaths = [
      ...(ownedPhotos ?? []).map((p) => p.storage_path),
      ...(ownedTips ?? []).map((t) => t.image_path).filter((p): p is string => !!p),
    ];

    // Delete owned circles (cascades members, messages, invites, meetings)
    await admin.from("circles").delete().eq("created_by", userId);
    // Leave any circles the user is member of
    await admin.from("circle_members").delete().eq("user_id", userId);
    // Delete user-owned content
    await admin.from("photos").delete().eq("owner_id", userId);
    await admin.from("tips").delete().eq("owner_id", userId);
    await admin.from("profiles").delete().eq("user_id", userId);

    // Clean up storage so deleted content doesn't leave orphaned files behind.
    if (circlePhotoPaths.length) {
      await admin.storage.from("circle-photos").remove(circlePhotoPaths);
    }
    const { data: avatarFiles } = await admin.storage.from("avatars").list(userId);
    if (avatarFiles?.length) {
      await admin.storage.from("avatars").remove(avatarFiles.map((f) => `${userId}/${f.name}`));
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
