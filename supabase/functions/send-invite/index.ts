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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    // Verify caller
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if email is already registered
    const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    const alreadyRegistered = existingUsers.users.some(
      (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (alreadyRegistered) {
      return new Response(
        JSON.stringify({
          error: "already_registered",
          message: "Den här personen har redan ett konto på Minby",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender's display name
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const senderName = senderProfile?.display_name || "En vän";

    // Generate invite link via Supabase Auth
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: email.trim(),
      options: {
        data: {
          invited_by: user.id,
          invited_by_name: senderName,
          personal_message: message || null,
        },
        redirectTo: "https://minby.lovable.app/auth",
      },
    });

    if (linkError) throw linkError;

    const inviteLink = linkData?.properties?.action_link;
    if (!inviteLink) throw new Error("No invite link generated");

    // Build HTML email
    const personalMessageHtml = message
      ? `<p style="font-size:15px;color:#555;margin:16px 0;padding:12px 16px;background:#f9f7f4;border-radius:8px;border-left:3px solid #e8c87a;font-style:italic;">"${escapeHtml(message)}"</p>`
      : "";

    const htmlBody = `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <tr><td style="padding:36px 32px 24px;text-align:center;">
          <h1 style="font-size:22px;color:#2d2a26;margin:0 0 8px;">Du har blivit inbjuden till Minby ✨</h1>
          <p style="font-size:15px;color:#6b6560;margin:0;">${escapeHtml(senderName)} vill dela sin vardag med dig</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 12px;">
            Hej! Du har fått en personlig inbjudan till <strong>Minby</strong> – appen för äkta kontakt med de som betyder mest.
          </p>
          ${personalMessageHtml}
          <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px;">
            Klicka på knappen nedan för att skapa ditt konto och komma igång.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${inviteLink}" style="display:inline-block;background:#2d2a26;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                Skapa mitt konto
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;text-align:center;border-top:1px solid #f0ede8;">
          <p style="font-size:12px;color:#aaa;margin:0;">Minby – din vardag, dina vänner</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Minby <hej@minby.app>",
        to: [email.trim()],
        subject: `${senderName} har bjudit in dig till Minby`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", resendRes.status, errBody);
      throw new Error(`Resend failed: ${resendRes.status}`);
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
