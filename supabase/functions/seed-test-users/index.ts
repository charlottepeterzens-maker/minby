import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NAMES = [
  "Elin Bergström",
  "Sara Lindqvist",
  "Maja Nyström",
  "Klara Öberg",
  "Ida Sundell",
  "Nora Hellström",
  "Tove Ekman",
  "Alva Rydberg",
  "Signe Falk",
  "Vera Almqvist",
];

const CIRCLES: { name: string; size: number }[] = [
  { name: "Tisdagsklubben", size: 3 },
  { name: "Grannarna på Ringvägen", size: 3 },
  { name: "Bokcirkeln", size: 4 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const me = userData.user.id;

    // 1. Create (or reuse) 10 test users
    const stamp = Date.now();
    const ids: string[] = [];
    for (const name of NAMES) {
      const slug = name.toLowerCase().replace(/[^a-zà-ö]+/g, ".").replace(/[àáâä]/g, "a");
      const email = `${slug}.${stamp}@minby.test`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (error || !data.user) throw new Error(error?.message ?? "create user failed");
      ids.push(data.user.id);
      await admin.from("profiles").update({ display_name: name }).eq("user_id", data.user.id);
    }

    // 2. Create circles and add members
    const created: { id: string; name: string; members: number }[] = [];
    let cursor = 0;
    for (const c of CIRCLES) {
      const { data: circle, error: cErr } = await admin
        .from("circles")
        .insert({ name: c.name, created_by: me })
        .select("id, name")
        .single();
      if (cErr || !circle) throw new Error(cErr?.message ?? "create circle failed");

      const memberIds = ids.slice(cursor, cursor + c.size);
      cursor += c.size;
      const rows = [{ circle_id: circle.id, user_id: me }, ...memberIds.map((u) => ({ circle_id: circle.id, user_id: u }))];
      const { error: mErr } = await admin.from("circle_members").upsert(rows, { onConflict: "circle_id,user_id" });
      if (mErr) throw new Error(mErr.message);

      created.push({ id: circle.id, name: circle.name, members: memberIds.length + 1 });
    }

    return new Response(JSON.stringify({ users: ids.length, circles: created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
