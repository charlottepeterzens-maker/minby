import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const dayName = today.toLocaleDateString("sv-SE", { weekday: "long" });

    const systemPrompt = `Du är en hjälpsam assistent som tolkar svenska fritextmeddelanden om hangouts/träffar.

Dagens datum: ${todayStr} (${dayName}).

Analysera texten och extrahera:
1. intent: en kort, personlig fras i första person som fångar känslan (t.ex. "Jag är ledig", "Jag vill ses", "Jag vill göra något", "Jag har en plan"). Max 5 ord. Naturlig ton, inga utropstecken.
2. activity: om en specifik aktivitet nämns (spa, lunch, promenad, fika, middag, etc). Annars null.
3. dates: en array av ALLA datum som nämns i texten, i ISO-format (YYYY-MM-DD). Tolka "idag", "imorgon", "fredag", "helgen" relativt till dagens datum. Om flera datum nämns (t.ex. "kan 27/5, 3/6 eller 14/6"), returnera ALLA som separata element i arrayen. Om inget datum nämns, returnera en tom array [].
4. date_display: en mänskligt läsbar version av det FÖRSTA datumet på svenska (t.ex. "fre 7 februari", "imorgon", "i helgen"). Om inget datum, returnera null.
5. description: användarens text, lätt justerad för läsbarhet men bevarad i anda. Max 100 tecken.
6. entry_type: "available" (ledig/vill ses), "confirmed" (har en plan), eller "activity" (vill göra specifik sak).

VIKTIGT:
- Extrahera ALLA datum som nämns, inte bara det första
- Gissa hellre än att lämna tomt
- Behåll användarens röst och ton
- Inga generiska systemformuleringar
- Om inget datum: dates=[], date_display=null
- Om ingen aktivitet: activity=null`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "parse_hangout",
                description:
                  "Parse a Swedish free-text hangout message into structured data",
                parameters: {
                  type: "object",
                  properties: {
                    intent: {
                      type: "string",
                      description:
                        'Short first-person intent phrase, e.g. "Jag är ledig"',
                    },
                    activity: {
                      type: ["string", "null"],
                      description:
                        "Specific activity if mentioned, e.g. lunch, spa, promenad. null if none.",
                    },
                    dates: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Array of ALL mentioned dates in ISO format YYYY-MM-DD. Empty array if no dates mentioned.",
                    },
                    date_display: {
                      type: ["string", "null"],
                      description:
                        'Human-readable Swedish date for the first date, e.g. "fre 7 februari". null if none.',
                    },
                    description: {
                      type: "string",
                      description:
                        "User's text, lightly adjusted for readability. Max 100 chars.",
                    },
                    entry_type: {
                      type: "string",
                      enum: ["available", "confirmed", "activity"],
                      description: "Type of hangout entry",
                    },
                  },
                  required: [
                    "intent",
                    "activity",
                    "dates",
                    "date_display",
                    "description",
                    "entry_type",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "parse_hangout" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Backwards compatibility: also provide single `date` field from first element
    if (parsed.dates && parsed.dates.length > 0) {
      parsed.date = parsed.dates[0];
    } else if (!parsed.dates) {
      // If AI returned old format with single date, convert
      parsed.dates = parsed.date ? [parsed.date] : [];
    } else {
      parsed.date = null;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-hangout error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
