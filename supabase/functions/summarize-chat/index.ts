import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { circle_id } = await req.json();
    if (!circle_id) {
      return new Response(JSON.stringify({ error: "circle_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("body, user_id, created_at, kind")
      .eq("circle_id", circle_id)
      .order("created_at", { ascending: false })
      .limit(60);
    if (msgErr) throw msgErr;
    const list = (msgs ?? []).reverse().filter((m) => m.body);
    if (list.length < 3) {
      return new Response(JSON.stringify({ error: "För få meddelanden att sammanfatta ännu." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userIds = Array.from(new Set(list.map((m) => m.user_id).filter(Boolean))) as string[];
    const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
    const nameMap = new Map((profs ?? []).map((p) => [p.user_id, p.display_name ?? "Någon"]));
    const transcript = list.map((m) => `${nameMap.get(m.user_id!) ?? "Någon"}: ${m.body}`).join("\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: "Du sammanfattar chatthistorik för en liten vänkrets på svenska. Skriv 2–4 korta meningar med varm, personlig ton. Lyft fram konkreta planer, känslor och det viktigaste som händer. Skriv inte i punktlista." },
          { role: "user", content: `Sammanfatta senaste chatten:\n\n${transcript}` },
        ],
      }),
    });
    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "För många förfrågningar just nu. Prova igen om en stund." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI-krediterna är slut." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI error: ${aiRes.status} ${t}`);
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Tomt AI-svar");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: upErr } = await admin
      .from("circle_ai_summary")
      .upsert({ circle_id, content, generated_at: new Date().toISOString() }, { onConflict: "circle_id" });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ content, generated_at: new Date().toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("summarize-chat error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Fel" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
