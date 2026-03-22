import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, members, groupName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const memberNames = (members || []).map((m: { display_name: string }) => m.display_name).join(", ");
    const chatLog = (messages || [])
      .slice(-30)
      .map((m: { sender: string; content: string }) => `${m.sender}: ${m.content}`)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Du är en assistent som sammanfattar gruppchattkonversationer för en vänskapsapp. 
Gruppen heter "${groupName}" och medlemmarna är: ${memberNames}.

Ge en kort, varm sammanfattning med max 4 punkter. Fokusera BARA på:
- Datum som diskuteras
- Aktiviteter som nämns  
- Vem som kan/inte kan
- Konkreta beslut

Svara ALLTID som JSON med denna struktur:
{
  "bullets": ["punkt 1", "punkt 2"],
  "action": "en kort uppmaning om det finns något att besluta, annars null",
  "planSuggestion": { "title": "aktivitet", "dateText": "datum" } eller null
}

Håll det kort, mänskligt och direkt. Inga tekniska termer. Skriv på svenska.`
          },
          {
            role: "user",
            content: `Sammanfatta denna konversation:\n\n${chatLog}`
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Try to parse as JSON
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { bullets: [content], action: null, planSuggestion: null };
    } catch {
      parsed = { bullets: [content], action: null, planSuggestion: null };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
