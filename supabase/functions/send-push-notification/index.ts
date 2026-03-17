import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64 + padding);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createVapidJwt(
  endpoint: string,
  publicKeyBase64: string,
  privateKeyBase64: string
): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud, exp: now + 12 * 3600, sub: "mailto:push@minby.lovable.app" };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const publicKeyBytes = base64UrlToUint8Array(publicKeyBase64);
  const jwk = {
    kty: "EC", crv: "P-256",
    x: uint8ToBase64Url(publicKeyBytes.slice(1, 33)),
    y: uint8ToBase64Url(publicKeyBytes.slice(33, 65)),
    d: privateKeyBase64,
  };

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsignedToken));
  const sigBytes = new Uint8Array(signature);

  let sigBase64: string;
  if (sigBytes.length === 64) {
    sigBase64 = uint8ToBase64Url(sigBytes);
  } else {
    const r = sigBytes.slice(4, 4 + sigBytes[3]);
    const s = sigBytes.slice(4 + sigBytes[3] + 2);
    const raw = new Uint8Array(64);
    const rPad = new Uint8Array(32);
    const sPad = new Uint8Array(32);
    rPad.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    sPad.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));
    raw.set(rPad); raw.set(sPad, 32);
    sigBase64 = uint8ToBase64Url(raw);
  }
  return `${unsignedToken}.${sigBase64}`;
}

async function encryptPayload(
  payload: string, p256dhBase64: string, authBase64: string
): Promise<Uint8Array> {
  const clientPublicKey = base64UrlToUint8Array(p256dhBase64);
  const clientAuth = base64UrlToUint8Array(authBase64);
  const encoder = new TextEncoder();

  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  const clientKey = await crypto.subtle.importKey("raw", clientPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, localKeyPair.privateKey, 256));

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK
  const prkKey = await crypto.subtle.importKey("raw", clientAuth, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, sharedSecret));

  // IKM
  const keyInfo = new Uint8Array([...encoder.encode("WebPush: info\0"), ...clientPublicKey, ...localPublicKeyRaw]);
  const ikmKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const ikm = new Uint8Array(await crypto.subtle.sign("HMAC", ikmKey, new Uint8Array([...keyInfo, 1])));

  // Derive CEK + nonce
  const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prkContent = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));
  const prkContentKey = await crypto.subtle.importKey("raw", prkContent, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  const cekFull = new Uint8Array(await crypto.subtle.sign("HMAC", prkContentKey, new Uint8Array([...encoder.encode("Content-Encoding: aes128gcm\0"), 1])));
  const nonceFull = new Uint8Array(await crypto.subtle.sign("HMAC", prkContentKey, new Uint8Array([...encoder.encode("Content-Encoding: nonce\0"), 1])));

  const contentKey = await crypto.subtle.importKey("raw", cekFull.slice(0, 16), { name: "AES-GCM" }, false, ["encrypt"]);
  const paddedPayload = new Uint8Array([...encoder.encode(payload), 2]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceFull.slice(0, 12) }, contentKey, paddedPayload));

  const rs = new DataView(new ArrayBuffer(4));
  rs.setUint32(0, 4096);
  return new Uint8Array([...salt, ...new Uint8Array(rs.buffer), localPublicKeyRaw.length, ...localPublicKeyRaw, ...encrypted]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await userSupabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub;

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { recipientUserId, fromUserId, type, referenceId, message } = await req.json();

    // Validate that fromUserId matches the authenticated user
    if (fromUserId && fromUserId !== callerUserId) {
      return new Response(JSON.stringify({ error: "Cannot spoof sender identity" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipientUserId || !type || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user notification settings
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("notification_settings")
      .eq("user_id", recipientUserId)
      .single();

    const settings = (profile?.notification_settings as Record<string, unknown>) || {};
    
    // Map type to settings key
    const settingsKey = type.replace("hangout_", "hangout_").replace("group_", "group_").replace("life_", "life_");
    if (settings[settingsKey] === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled_by_user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for summarization: same type + reference_id within 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await serviceSupabase
      .from("notifications")
      .select("id, title")
      .eq("user_id", recipientUserId)
      .eq("type", type)
      .eq("reference_id", referenceId)
      .eq("read", false)
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    let notificationId: string;

    if (existing && existing.length > 0) {
      // Summarize: count how many notifications of this type exist for this reference
      const { count } = await serviceSupabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", recipientUserId)
        .eq("type", type)
        .eq("reference_id", referenceId)
        .eq("read", false)
        .gte("created_at", fiveMinAgo);

      const total = (count || 1) + 1;
      // Build summary message
      let summaryMessage = message;
      if (total > 1) {
        // Extract activity from the message if possible
        const activityMatch = message.match(/på (.+?)!/);
        const activity = activityMatch ? activityMatch[1] : "din dejt";
        summaryMessage = `${total} vänner vill hänga med på ${activity}!`;
      }

      await serviceSupabase
        .from("notifications")
        .update({ title: summaryMessage })
        .eq("id", existing[0].id);

      notificationId = existing[0].id;
    } else {
      // Create new notification
      const { data: newNotif } = await serviceSupabase
        .from("notifications")
        .insert({
          user_id: recipientUserId,
          from_user_id: fromUserId || null,
          type,
          reference_id: referenceId,
          title: message,
          body: null,
        })
        .select("id")
        .single();

      notificationId = newNotif?.id || "";
    }

    // Send push notification
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ notificationId, push: "no_vapid_keys" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions } = await serviceSupabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipientUserId);

    let pushSent = 0;
    if (subscriptions && subscriptions.length > 0) {
      const pushPayload = JSON.stringify({
        title: "Minby",
        body: message,
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
        data: { url: "/profile" },
      });

      for (const sub of subscriptions) {
        try {
          const jwt = await createVapidJwt(sub.endpoint, vapidPublicKey, vapidPrivateKey);
          const ciphertext = await encryptPayload(pushPayload, sub.p256dh, sub.auth);

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              TTL: "86400",
              Urgency: "high",
            },
            body: ciphertext,
          });

          if (response.ok || response.status === 201) {
            pushSent++;
          } else {
            if (response.status === 404 || response.status === 410) {
              await serviceSupabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
          if (!response.bodyUsed) await response.text();
        } catch {
          // Push is best-effort
        }
      }
    }

    return new Response(
      JSON.stringify({ notificationId, pushSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
