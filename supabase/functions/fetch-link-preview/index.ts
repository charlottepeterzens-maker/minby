import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BLOCKED_HOSTS = ['169.254.', '10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '127.', '0.0.0.0', 'metadata.google.internal', '[::1]', 'localhost'];
const MAX_RESPONSE_BYTES = 1_000_000; // 1 MB HTML
const MAX_IMAGE_BYTES = 5_000_000; // 5 MB image

function safeHost(u: URL) {
  return !BLOCKED_HOSTS.some(b => u.hostname.startsWith(b) || u.hostname === b) && u.protocol.startsWith('http');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const { url, uploadBucket, uploadPrefix } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

    let parsed: URL;
    try { parsed = new URL(formattedUrl); } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!safeHost(parsed)) {
      return new Response(JSON.stringify({ error: 'Forbidden URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ title: null, image: null, storagePath: null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        reader.cancel();
        return new Response(JSON.stringify({ error: 'Response too large' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      chunks.push(value);
    }
    const html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc); merged.set(chunk, acc.length); return merged;
      }, new Uint8Array())
    );

    const decodeEntities = (s: string): string => {
      if (!s) return s;
      let out = s
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
      const named: Record<string, string> = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
        ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
        lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
        auml: 'ä', ouml: 'ö', aring: 'å', Auml: 'Ä', Ouml: 'Ö', Aring: 'Å',
      };
      out = out.replace(/&([a-zA-Z]+);/g, (m, n) => (named[n] ?? m));
      return out;
    };

    const cleanTitle = (raw: string | null, siteName: string | null): string | null => {
      if (!raw) return null;
      let t = decodeEntities(raw).replace(/\s+/g, ' ').trim();
      // Strip common site suffix: "Article — Site", "Article | Site", "Article - Site", "Article :: Site"
      const separators = [' — ', ' – ', ' | ', ' • ', ' :: ', ' - '];
      for (const sep of separators) {
        const idx = t.lastIndexOf(sep);
        if (idx > 8 && idx > t.length / 2) {
          const tail = t.slice(idx + sep.length).trim();
          const head = t.slice(0, idx).trim();
          // Only strip if the tail looks like a site (short, no ending punctuation) or matches siteName
          if (
            (siteName && tail.toLowerCase() === siteName.toLowerCase()) ||
            (tail.length <= 30 && !/[.!?]$/.test(tail))
          ) {
            t = head;
            break;
          }
        }
      }
      return t.replace(/\s+/g, ' ').trim() || null;
    };

    const getMetaContent = (property: string): string | null => {
      for (const attr of ['property', 'name']) {
        const regex = new RegExp(`<meta[^>]+${attr}=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i');
        const match = html.match(regex);
        if (match) return match[1];
        const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${property}["']`, 'i');
        const match2 = html.match(regex2);
        if (match2) return match2[1];
      }
      return null;
    };

    const getLinkHref = (rel: string): string | null => {
      const regex = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']*)["']`, 'i');
      const m = html.match(regex);
      if (m) return m[1];
      const regex2 = new RegExp(`<link[^>]+href=["']([^"']*)["'][^>]+rel=["']${rel}["']`, 'i');
      const m2 = html.match(regex2);
      return m2?.[1] ?? null;
    };

    const rawTitle =
      getMetaContent('og:title') ||
      getMetaContent('twitter:title') ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
      null;
    const siteName = getMetaContent('og:site_name');
    const title = cleanTitle(rawTitle, siteName);

    let image =
      getMetaContent('og:image:secure_url') ||
      getMetaContent('og:image:url') ||
      getMetaContent('og:image') ||
      getMetaContent('twitter:image:src') ||
      getMetaContent('twitter:image') ||
      getLinkHref('image_src') ||
      getLinkHref('apple-touch-icon') ||
      null;
    if (image) image = decodeEntities(image).trim();
    if (image && !image.startsWith('http')) {
      try { image = new URL(image, formattedUrl).href; } catch { /* ignore */ }
    }

    // Optional: download the image and upload to a private storage bucket, return path
    let storagePath: string | null = null;
    if (image && uploadBucket) {
      try {
        const imgUrl = new URL(image);
        if (safeHost(imgUrl)) {
          const imgRes = await fetch(image, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Lovable/1.0)' } });
          if (imgRes.ok) {
            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
            if (contentType.startsWith('image/')) {
              const buf = new Uint8Array(await imgRes.arrayBuffer());
              if (buf.byteLength && buf.byteLength <= MAX_IMAGE_BYTES) {
                const ext = contentType.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') || 'jpg';
                const prefix = typeof uploadPrefix === 'string' && /^[a-zA-Z0-9/_-]+$/.test(uploadPrefix) ? uploadPrefix.replace(/\/$/, '') : userId;
                const path = `${prefix}/link-${crypto.randomUUID()}.${ext}`;
                const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
                const { error: upErr } = await admin.storage.from(uploadBucket).upload(path, buf, { contentType, upsert: false });
                if (!upErr) storagePath = path;
                else console.error('Upload failed:', upErr);
              }
            }
          }
        }
      } catch (e) {
        console.error('Image download/upload error:', e);
      }
    }

    return new Response(
      JSON.stringify({ title, image, storagePath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Link preview error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch link preview' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
