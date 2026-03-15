import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userId = user.id;

    // Delete user data from all tables (cascade will handle some, but be explicit)
    await Promise.all([
      adminClient.from("hangout_comments").delete().eq("user_id", userId),
      adminClient.from("hangout_tagged_friends").delete().eq("tagged_by", userId),
      adminClient.from("post_reactions").delete().eq("user_id", userId),
      adminClient.from("life_posts").delete().eq("user_id", userId),
      adminClient.from("life_sections").delete().eq("user_id", userId),
      adminClient.from("hangout_availability").delete().eq("user_id", userId),
      adminClient.from("workout_entries").delete().eq("user_id", userId),
      adminClient.from("period_entries").delete().eq("user_id", userId),
      adminClient.from("notifications").delete().eq("user_id", userId),
      adminClient.from("friend_access_tiers").delete().eq("owner_id", userId),
      adminClient.from("friend_requests").delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
      adminClient.from("poll_votes").delete().eq("user_id", userId),
      adminClient.from("group_messages").delete().eq("user_id", userId),
      adminClient.from("rsvps").delete().eq("user_id", userId),
      adminClient.from("user_roles").delete().eq("user_id", userId),
    ]);

    // Delete group memberships and owned groups
    await adminClient.from("group_memberships").delete().eq("user_id", userId);
    
    // Delete owned groups (cascades memberships, messages, polls, plans)
    const { data: ownedGroups } = await adminClient.from("friend_groups").select("id").eq("owner_id", userId);
    if (ownedGroups && ownedGroups.length > 0) {
      for (const group of ownedGroups) {
        await adminClient.from("group_memberships").delete().eq("group_id", group.id);
        await adminClient.from("group_messages").delete().eq("group_id", group.id);
        await adminClient.from("group_polls").delete().eq("group_id", group.id);
        const { data: plans } = await adminClient.from("plans").select("id").eq("group_id", group.id);
        if (plans) {
          for (const plan of plans) {
            await adminClient.from("rsvps").delete().eq("plan_id", plan.id);
          }
          await adminClient.from("plans").delete().eq("group_id", group.id);
        }
        await adminClient.from("friend_groups").delete().eq("id", group.id);
      }
    }

    // Delete profile
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // Delete storage files
    const buckets = ["avatars", "life-images"];
    for (const bucket of buckets) {
      const { data: files } = await adminClient.storage.from(bucket).list(userId);
      if (files && files.length > 0) {
        await adminClient.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
      }
    }

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
