import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEST_EMAILS = [
  "emma.lindgren.minby@gmail.com",
  "sara.karlsson.minby@gmail.com",
  "karin.nilsson.minby@gmail.com",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerUserId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- CLEANUP: delete old test users completely ---
    const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers();
    const oldTestUsers = allUsers?.filter((u) => TEST_EMAILS.includes(u.email ?? "")) ?? [];

    for (const oldUser of oldTestUsers) {
      const uid = oldUser.id;
      // Delete from all public tables (order matters for FK)
      await adminClient.from("hangout_responses").delete().eq("user_id", uid);
      await adminClient.from("hangout_comments").delete().eq("user_id", uid);
      await adminClient.from("hangout_tagged_friends").delete().or(`tagged_by.eq.${uid},tagged_user_id.eq.${uid}`);
      await adminClient.from("hangout_availability").delete().eq("user_id", uid);
      await adminClient.from("post_reactions").delete().eq("user_id", uid);
      await adminClient.from("post_comments").delete().eq("user_id", uid);
      await adminClient.from("tip_comments").delete().eq("user_id", uid);
      await adminClient.from("saved_tips").delete().eq("user_id", uid);
      await adminClient.from("user_tips").delete().eq("user_id", uid);
      await adminClient.from("life_posts").delete().eq("user_id", uid);
      await adminClient.from("life_sections").delete().eq("user_id", uid);
      await adminClient.from("friend_access_tiers").delete().or(`owner_id.eq.${uid},friend_user_id.eq.${uid}`);
      await adminClient.from("friend_requests").delete().or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);
      await adminClient.from("notifications").delete().or(`user_id.eq.${uid},from_user_id.eq.${uid}`);
      await adminClient.from("message_reactions").delete().eq("user_id", uid);
      await adminClient.from("group_messages").delete().eq("user_id", uid);
      await adminClient.from("group_memberships").delete().eq("user_id", uid);
      await adminClient.from("group_memories").delete().eq("user_id", uid);
      await adminClient.from("poll_votes").delete().eq("user_id", uid);
      await adminClient.from("push_subscriptions").delete().eq("user_id", uid);
      await adminClient.from("workout_entries").delete().eq("user_id", uid);
      await adminClient.from("period_entries").delete().eq("user_id", uid);
      await adminClient.from("profiles").delete().eq("user_id", uid);
      // Delete the auth user
      await adminClient.auth.admin.deleteUser(uid);
    }

    // --- CREATE new test users ---
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
    const daysFromNow = (d: number) => {
      const date = new Date(now.getTime() + d * 86400000);
      return date.toISOString().split("T")[0];
    };

    const testUsers = [
      {
        email: "emma.lindgren.minby@gmail.com",
        password: "minby123",
        display_name: "Emma",
        bio: "Mamma, löpare och evigt sugen på äventyr",
        sections: [
          { name: "Barnen", emoji: "👶" },
          { name: "Löpning", emoji: "🏃" },
        ],
        posts: [
          { content: "Sam tappade sin första tand idag! Tandfén kommer ikväll 🧚", sectionIdx: 0, daysAgo: 2 },
          { content: "Sprang 8 km i morse utan att dö. Räknas det som framsteg?", sectionIdx: 1, daysAgo: 4 },
          { content: "Midsommarklänningen är köpt. Nu är sommaren officiellt räddad.", sectionIdx: 0, daysAgo: 6 },
        ],
        hangouts: [
          { entry_type: "activity", activities: ["Kallbada"], custom_note: "Om det är soligt!", daysFromNow: 3 },
          { entry_type: "activity", activities: ["Kallbada"], custom_note: "Om det är soligt!", daysFromNow: 7 },
          { entry_type: "activity", activities: ["Kallbada"], custom_note: "Om det är soligt!", daysFromNow: 10 },
        ],
        tips: [
          { title: "Bovar och brott", category: "lyssna", comment: "Bästa podden för löprundan" },
          { title: "Resan till Milen", category: "läsa", comment: "Grät på tunnelbanan" },
        ],
      },
      {
        email: "sara.karlsson.minby@gmail.com",
        password: "minby123",
        display_name: "Sara",
        bio: "Jobbar för mycket men skrattar ännu mer",
        sections: [
          { name: "Jobbet", emoji: "💼" },
          { name: "Familjen", emoji: "👨‍👩‍👧" },
        ],
        posts: [
          { content: "Äntligen fick jag gehör för det projektet jag jobbat på i tre månader. Lagom stor seger för en tisdag.", sectionIdx: 0, daysAgo: 1 },
          { content: "Middagen lyckades. Barnen åt grönsaker utan att klaga. Markera detta datum i historien.", sectionIdx: 1, daysAgo: 3 },
          { content: "Hemma efter konferens. Sängen var aldrig godare.", sectionIdx: 0, daysAgo: 5 },
        ],
        hangouts: [
          { entry_type: "default", activities: [], custom_note: "Lunch eller fika?", daysFromNow: 5 },
        ],
        tips: [
          { title: "The Bear", category: "titta", comment: "Ser ut som ett stresstest men är faktiskt underbart" },
          { title: "Ottolenghi Simple", category: "mat", comment: "Halvtimme och middag klar" },
        ],
      },
      {
        email: "karin.nilsson.minby@gmail.com",
        password: "minby123",
        display_name: "Karin",
        bio: "Älskar långsamma söndagar och snabba beslut",
        sections: [
          { name: "Kärlek", emoji: "❤️" },
          { name: "Vardagen", emoji: "☀️" },
        ],
        posts: [
          { content: "Tio år idag. Fortfarande den bäste.", sectionIdx: 0, daysAgo: 1 },
          { content: "Hittade ett nytt café på Linnégatan. Kardemummabulle som förändrar livet.", sectionIdx: 1, daysAgo: 3 },
          { content: "Sommarplaneringen är igång. Gotland eller Österlen?", sectionIdx: 1, daysAgo: 5 },
        ],
        hangouts: [
          { entry_type: "confirmed", activities: [], custom_note: "Middag hemma hos mig – ta med något att dricka", daysFromNow: 4 },
        ],
        tips: [
          { title: "Aesop Resurrection", category: "vardagslyx", comment: "Dyrt men värt varje krona" },
          { title: "Yellowface", category: "läsa", comment: "Läste ut på en natt" },
        ],
      },
    ];

    const createdUserIds: string[] = [];

    for (const tu of testUsers) {
      // Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: tu.email,
        password: tu.password,
        email_confirm: true,
        user_metadata: { display_name: tu.display_name },
      });

      if (authError) throw authError;
      const userId = authData.user!.id;
      createdUserIds.push(userId);

      // Update profile
      await adminClient
        .from("profiles")
        .update({ bio: tu.bio, display_name: tu.display_name })
        .eq("user_id", userId);

      // Friend request + access tiers (bidirectional)
      await adminClient.from("friend_requests").insert({
        from_user_id: callerUserId,
        to_user_id: userId,
        status: "accepted",
      });
      await adminClient.from("friend_access_tiers").upsert(
        { owner_id: callerUserId, friend_user_id: userId, tier: "outer" },
        { onConflict: "owner_id,friend_user_id" }
      );
      await adminClient.from("friend_access_tiers").upsert(
        { owner_id: userId, friend_user_id: callerUserId, tier: "outer" },
        { onConflict: "owner_id,friend_user_id" }
      );

      // Life sections
      const sectionIds: string[] = [];
      for (let i = 0; i < tu.sections.length; i++) {
        const sec = tu.sections[i];
        const { data: newSec } = await adminClient
          .from("life_sections")
          .insert({ user_id: userId, name: sec.name, emoji: sec.emoji, sort_order: i })
          .select("id")
          .single();
        sectionIds.push(newSec!.id);
      }

      // Life posts
      for (const post of tu.posts) {
        await adminClient.from("life_posts").insert({
          user_id: userId,
          content: post.content,
          section_id: sectionIds[post.sectionIdx],
          created_at: daysAgo(post.daysAgo),
        });
      }

      // Hangout availability
      for (const h of tu.hangouts) {
        await adminClient.from("hangout_availability").insert({
          user_id: userId,
          entry_type: h.entry_type,
          activities: h.activities,
          custom_note: h.custom_note,
          date: daysFromNow(h.daysFromNow),
        });
      }

      // User tips
      for (let i = 0; i < tu.tips.length; i++) {
        const tip = tu.tips[i];
        await adminClient.from("user_tips").insert({
          user_id: userId,
          title: tip.title,
          category: tip.category,
          comment: tip.comment,
          sort_order: i,
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        user_ids: createdUserIds,
        names: ["Emma", "Sara", "Karin"],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
