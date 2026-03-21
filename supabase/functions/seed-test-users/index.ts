import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Verify caller
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

    // Admin client for creating users
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
    const daysFromNow = (d: number) => {
      const date = new Date(now.getTime() + d * 86400000);
      return date.toISOString().split("T")[0]; // date only for hangout
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
      // Check if user already exists by looking up profile
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("display_name", tu.display_name)
        .ilike("bio", tu.bio.substring(0, 20) + "%")
        .maybeSingle();

      let userId: string;

      if (existingProfile) {
        userId = existingProfile.user_id;
      } else {
        // Create auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: tu.email,
          password: tu.password,
          email_confirm: true,
          user_metadata: { display_name: tu.display_name },
        });

        if (authError) {
          // User might exist in auth but not profile
          if (authError.message?.includes("already been registered")) {
            const { data: { users } } = await adminClient.auth.admin.listUsers();
            const existing = users?.find((u) => u.email === tu.email);
            if (!existing) throw new Error(`Cannot find existing user ${tu.email}`);
            userId = existing.id;
          } else {
            throw authError;
          }
        } else {
          userId = authData.user!.id;
        }

        // Update profile with bio
        await adminClient
          .from("profiles")
          .update({ bio: tu.bio, display_name: tu.display_name })
          .eq("user_id", userId);
      }

      createdUserIds.push(userId);

      // Friend requests (bidirectional)
      const { data: existingFr } = await adminClient
        .from("friend_requests")
        .select("id")
        .or(`and(from_user_id.eq.${callerUserId},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${callerUserId})`)
        .maybeSingle();

      if (!existingFr) {
        await adminClient.from("friend_requests").insert({
          from_user_id: callerUserId,
          to_user_id: userId,
          status: "accepted",
        });
      }

      // Friend access tiers (both directions)
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
        const { data: existingSec } = await adminClient
          .from("life_sections")
          .select("id")
          .eq("user_id", userId)
          .eq("name", sec.name)
          .maybeSingle();

        if (existingSec) {
          sectionIds.push(existingSec.id);
        } else {
          const { data: newSec } = await adminClient
            .from("life_sections")
            .insert({ user_id: userId, name: sec.name, emoji: sec.emoji, sort_order: i })
            .select("id")
            .single();
          sectionIds.push(newSec!.id);
        }
      }

      // Life posts
      const { data: existingPosts } = await adminClient
        .from("life_posts")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (!existingPosts?.length) {
        for (const post of tu.posts) {
          await adminClient.from("life_posts").insert({
            user_id: userId,
            content: post.content,
            section_id: sectionIds[post.sectionIdx],
            created_at: daysAgo(post.daysAgo),
          });
        }
      }

      // Hangout availability
      const { data: existingHangouts } = await adminClient
        .from("hangout_availability")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (!existingHangouts?.length) {
        for (const h of tu.hangouts) {
          await adminClient.from("hangout_availability").insert({
            user_id: userId,
            entry_type: h.entry_type,
            activities: h.activities,
            custom_note: h.custom_note,
            date: daysFromNow(h.daysFromNow),
          });
        }
      }

      // User tips
      const { data: existingTips } = await adminClient
        .from("user_tips")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (!existingTips?.length) {
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
