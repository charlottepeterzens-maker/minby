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

async function createJwt(
  endpoint: string,
  publicKey: string,
  privateKeyBase64: string
): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud,
    exp: now + 12 * 3600,
    sub: "mailto:push@minby.lovable.app",
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import private key
  const privateKeyBytes = base64UrlToUint8Array(privateKeyBase64);
  const publicKeyBytes = base64UrlToUint8Array(publicKey);

  // Build JWK from raw keys
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: btoa(String.fromCharCode(...publicKeyBytes.slice(1, 33)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    y: btoa(String.fromCharCode(...publicKeyBytes.slice(33, 65)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    d: privateKeyBase64,
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const sigBytes = new Uint8Array(signature);
  let sigBase64: string;
  if (sigBytes.length === 64) {
    sigBase64 = btoa(String.fromCharCode(...sigBytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } else {
    // DER format - extract r and s
    const r = sigBytes.slice(4, 4 + sigBytes[3]);
    const s = sigBytes.slice(4 + sigBytes[3] + 2);
    const rPad = new Uint8Array(32);
    const sPad = new Uint8Array(32);
    rPad.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    sPad.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));
    const raw = new Uint8Array(64);
    raw.set(rPad);
    raw.set(sPad, 32);
    sigBase64 = btoa(String.fromCharCode(...raw))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  return `${unsignedToken}.${sigBase64}`;
}

async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const clientPublicKey = base64UrlToUint8Array(p256dhBase64);
  const clientAuth = base64UrlToUint8Array(authBase64);

  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF-based key derivation (RFC 8291)
  const encoder = new TextEncoder();

  // PRK = HKDF-Extract(clientAuth, sharedSecret)
  const authInfo = encoder.encode("Content-Encoding: auth\0");
  const prkKey = await crypto.subtle.importKey("raw", clientAuth, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, sharedSecret));

  // IKM for content encryption
  const keyInfo = new Uint8Array([
    ...encoder.encode("WebPush: info\0"),
    ...clientPublicKey,
    ...localPublicKeyRaw,
  ]);
  const ikmKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const ikm = new Uint8Array(await crypto.subtle.sign("HMAC", ikmKey, new Uint8Array([...keyInfo, 1])));

  // Derive CEK and nonce using salt
  const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prkForContent = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));

  const cekInfo = new Uint8Array([...encoder.encode("Content-Encoding: aes128gcm\0"), 1]);
  const nonceInfo = new Uint8Array([...encoder.encode("Content-Encoding: nonce\0"), 1]);

  const prkContentKey = await crypto.subtle.importKey("raw", prkForContent, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const cekFull = new Uint8Array(await crypto.subtle.sign("HMAC", prkContentKey, cekInfo));
  const nonceFull = new Uint8Array(await crypto.subtle.sign("HMAC", prkContentKey, nonceInfo));

  const cek = cekFull.slice(0, 16);
  const nonce = nonceFull.slice(0, 12);

  // Encrypt with AES-128-GCM
  const contentKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  
  // Add padding delimiter
  const paddedPayload = new Uint8Array([...encoder.encode(payload), 2]);
  
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      contentKey,
      paddedPayload
    )
  );

  // Build aes128gcm header: salt (16) + rs (4) + keyIdLen (1) + keyId (65)
  const rs = new DataView(new ArrayBuffer(4));
  rs.setUint32(0, 4096);
  const header = new Uint8Array([
    ...salt,
    ...new Uint8Array(rs.buffer),
    localPublicKeyRaw.length,
    ...localPublicKeyRaw,
  ]);

  const ciphertext = new Uint8Array([...header, ...encrypted]);

  return { ciphertext, salt, localPublicKey: localPublicKeyRaw };
}

serve(async (req) => {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: authError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, title, body } = await req.json();

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for target user using service role
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions } = await serviceSupabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: title || "Minby",
      body: body || "",
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      data: { url: "/profile" },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const jwt = await createJwt(sub.endpoint, vapidPublicKey, vapidPrivateKey);
        const { ciphertext } = await encryptPayload(payload, sub.p256dh, sub.auth);

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
          sent++;
        } else {
          const text = await response.text();
          errors.push(`${response.status}: ${text}`);
          // Remove expired subscriptions
          if (response.status === 404 || response.status === 410) {
            await serviceSupabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
        // Consume body if not already
        if (!response.bodyUsed) await response.text();
      } catch (err) {
        errors.push(err.message);
      }
    }

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
