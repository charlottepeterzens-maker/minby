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
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Verify the user with their token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, message } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the sender's profile name
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const senderName = senderProfile?.display_name || "En vän";

    // Use Supabase auth invite - sends an email with a magic link
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_by: user.id,
        invited_by_name: senderName,
        personal_message: message || null,
      },
      redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`,
    });

    if (inviteError) {
      // If user already exists, that's ok - just inform
      if (inviteError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "already_registered", message: "Den här personen har redan ett konto." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw inviteError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Invite error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to send invite" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
