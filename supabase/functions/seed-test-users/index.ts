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
      await adminClient.from("rsvps").delete().eq("user_id", uid);
      await adminClient.from("profiles").delete().eq("user_id", uid);
      await adminClient.auth.admin.deleteUser(uid);
    }

    // --- CREATE new test users ---
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
    const daysFromNow = (d: number) => {
      const date = new Date(now.getTime() + d * 86400000);
      return date.toISOString().split("T")[0];
    };

    // Public placeholder images (Unsplash via picsum)
    const avatars = [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&h=256&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=face",
    ];

    const postImages = [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1528164344885-47b1492d809b?w=600&h=400&fit=crop",
    ];

    const testUsers = [
      {
        email: "emma.lindgren.minby@gmail.com",
        password: "minby123",
        display_name: "Emma",
        bio: "Mamma, löpare och evigt sugen på äventyr",
        avatar_url: avatars[0],
        sections: [
          { name: "Barnen", emoji: "👶" },
          { name: "Löpning", emoji: "🏃" },
        ],
        posts: [
          { content: "Sam tappade sin första tand idag! Tandfén kommer ikväll 🧚", sectionIdx: 0, daysAgo: 2, image_url: postImages[0] },
          { content: "Sprang 8 km i morse utan att dö. Räknas det som framsteg?", sectionIdx: 1, daysAgo: 4, image_url: null },
          { content: "Midsommarklänningen är köpt. Nu är sommaren officiellt räddad.", sectionIdx: 0, daysAgo: 6, image_url: postImages[1] },
        ],
        hangouts: [
          { entry_type: "activity", activities: ["Kallbada"], custom_note: "Om det är soligt!", daysFromNow: 3 },
          { entry_type: "activity", activities: ["Kallbada"], custom_note: "Om det är soligt!", daysFromNow: 7 },
          { entry_type: "activity", activities: ["Kallbada"], custom_note: "Om det är soligt!", daysFromNow: 10 },
        ],
        tips: [
          { title: "Bovar och brott", category: "lyssna", comment: "Bästa podden för löprundan", url: "https://open.spotify.com/show/2KNLPq8HBGJSy3ZGpP2yNS", image_url: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=400&fit=crop" },
          { title: "Resan till Milen", category: "läsa", comment: "Grät på tunnelbanan", url: "https://www.adlibris.com", image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop" },
        ],
      },
      {
        email: "sara.karlsson.minby@gmail.com",
        password: "minby123",
        display_name: "Sara",
        bio: "Jobbar för mycket men skrattar ännu mer",
        avatar_url: avatars[1],
        sections: [
          { name: "Jobbet", emoji: "💼" },
          { name: "Familjen", emoji: "👨‍👩‍👧" },
        ],
        posts: [
          { content: "Äntligen fick jag gehör för det projektet jag jobbat på i tre månader. Lagom stor seger för en tisdag.", sectionIdx: 0, daysAgo: 1, image_url: null },
          { content: "Middagen lyckades. Barnen åt grönsaker utan att klaga. Markera detta datum i historien.", sectionIdx: 1, daysAgo: 3, image_url: postImages[2] },
          { content: "Hemma efter konferens. Sängen var aldrig godare.", sectionIdx: 0, daysAgo: 5, image_url: null, link_url: "https://www.ticnet.se", link_title: "Konferens & event" },
        ],
        hangouts: [
          { entry_type: "default", activities: [], custom_note: "Lunch eller fika?", daysFromNow: 5 },
        ],
        tips: [
          { title: "The Bear", category: "titta", comment: "Ser ut som ett stresstest men är faktiskt underbart", url: "https://www.disneyplus.com", image_url: "https://images.unsplash.com/photo-1574375927938-d5a98e8d6f20?w=400&h=400&fit=crop" },
          { title: "Ottolenghi Simple", category: "mat", comment: "Halvtimme och middag klar", url: "https://www.adlibris.com", image_url: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&h=400&fit=crop" },
        ],
      },
      {
        email: "karin.nilsson.minby@gmail.com",
        password: "minby123",
        display_name: "Karin",
        bio: "Älskar långsamma söndagar och snabba beslut",
        avatar_url: avatars[2],
        sections: [
          { name: "Kärlek", emoji: "❤️" },
          { name: "Vardagen", emoji: "☀️" },
        ],
        posts: [
          { content: "Tio år idag. Fortfarande den bäste.", sectionIdx: 0, daysAgo: 1, image_url: postImages[3] },
          { content: "Hittade ett nytt café på Linnégatan. Kardemummabulle som förändrar livet.", sectionIdx: 1, daysAgo: 3, image_url: postImages[4] },
          { content: "Sommarplaneringen är igång. Gotland eller Österlen?", sectionIdx: 1, daysAgo: 5, image_url: null, link_url: "https://www.gotland.com", link_title: "Destination Gotland" },
        ],
        hangouts: [
          { entry_type: "confirmed", activities: [], custom_note: "Middag hemma hos mig – ta med något att dricka", daysFromNow: 4 },
        ],
        tips: [
          { title: "Aesop Resurrection", category: "vardagslyx", comment: "Dyrt men värt varje krona", url: "https://www.aesop.com", image_url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop" },
          { title: "Yellowface", category: "läsa", comment: "Läste ut på en natt", url: "https://www.adlibris.com", image_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop" },
        ],
      },
    ];

    const createdUserIds: string[] = [];

    for (const tu of testUsers) {
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: tu.email,
        password: tu.password,
        email_confirm: true,
        user_metadata: { display_name: tu.display_name },
      });

      if (authError) throw authError;
      const userId = authData.user!.id;
      createdUserIds.push(userId);

      // Update profile with avatar
      await adminClient
        .from("profiles")
        .update({ bio: tu.bio, display_name: tu.display_name, avatar_url: tu.avatar_url })
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

      // Life posts (with optional images and links)
      for (const post of tu.posts) {
        await adminClient.from("life_posts").insert({
          user_id: userId,
          content: post.content,
          section_id: sectionIds[post.sectionIdx],
          created_at: daysAgo(post.daysAgo),
          image_url: post.image_url || null,
          link_url: (post as any).link_url || null,
          link_title: (post as any).link_title || null,
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

      // User tips (with urls and images)
      for (let i = 0; i < tu.tips.length; i++) {
        const tip = tu.tips[i];
        await adminClient.from("user_tips").insert({
          user_id: userId,
          title: tip.title,
          category: tip.category,
          comment: tip.comment,
          sort_order: i,
          url: tip.url || null,
          image_url: tip.image_url || null,
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
