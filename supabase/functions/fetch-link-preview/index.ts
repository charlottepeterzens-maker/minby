import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLOCKED_HOSTS = [
  "169.254.",
  "10.",
  "192.168.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "127.",
  "0.0.0.0",
  "metadata.google.internal",
  "[::1]",
  "localhost",
];

const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_IMAGE_BYTES = 10_000_000;

const HTML_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36";

const IMAGE_USER_AGENT = HTML_USER_AGENT;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function safeHost(url: URL) {
  return (
    url.protocol.startsWith("http") &&
    !BLOCKED_HOSTS.some(
      (blocked) =>
        url.hostname === blocked || url.hostname.startsWith(blocked)
    )
  );
}

function normalizeUrl(url: string): URL {
  const trimmed = url.trim();

  const formatted = trimmed.startsWith("http")
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(formatted);

  if (!safeHost(parsed)) {
    throw new Error("Forbidden URL");
  }

  return parsed;
}

function decodeEntities(text: string) {
  if (!text) return text;

  let out = text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    );

  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    laquo: "«",
    raquo: "»",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    aring: "å",
    auml: "ä",
    ouml: "ö",
    Aring: "Å",
    Auml: "Ä",
    Ouml: "Ö",
  };

  return out.replace(
    /&([a-zA-Z]+);/g,
    (match, entity) => named[entity] ?? match
  );
}

function cleanTitle(
  rawTitle: string | null,
  siteName: string | null
): string | null {
  if (!rawTitle) return null;

  let title = decodeEntities(rawTitle)
    .replace(/\s+/g, " ")
    .trim();

  const separators = [
    " — ",
    " – ",
    " | ",
    " • ",
    " :: ",
    " - ",
  ];

  for (const separator of separators) {
    const index = title.lastIndexOf(separator);

    if (index < 8) continue;

    const head = title.slice(0, index).trim();
    const tail = title.slice(index + separator.length).trim();

    if (
      (siteName &&
        tail.toLowerCase() === siteName.toLowerCase()) ||
      (tail.length <= 30 && !/[.!?]$/.test(tail))
    ) {
      title = head;
      break;
    }
  }

  return title || null;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": HTML_USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "sv,en;q=0.9",
    },
  });

  if (!response.ok) {
    return null;
  }

  if (!safeHost(new URL(response.url))) {
    throw new Error("Unsafe redirect");
  }

  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("No response body");
  }

  const chunks: Uint8Array[] = [];
  let bytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    bytes += value.byteLength;

    if (bytes > MAX_RESPONSE_BYTES) {
      reader.cancel();
      throw new Error("HTML too large");
    }

    chunks.push(value);
  }

  const merged = new Uint8Array(bytes);

  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return {
    html: new TextDecoder().decode(merged),
    finalUrl: response.url,
  };
}
function getMetaContent(html: string, property: string): string | null {
  for (const attr of ["property", "name"]) {
    const regex = new RegExp(
      `<meta[^>]+${attr}=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    );

    const match = html.match(regex);

    if (match?.[1]) {
      return decodeEntities(match[1]).trim();
    }

    const reverseRegex = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${property}["']`,
      "i"
    );

    const reverseMatch = html.match(reverseRegex);

    if (reverseMatch?.[1]) {
      return decodeEntities(reverseMatch[1]).trim();
    }
  }

  return null;
}

function getLinkHref(html: string, rel: string): string | null {
  const regex = new RegExp(
    `<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["']`,
    "i"
  );

  const match = html.match(regex);

  if (match?.[1]) {
    return decodeEntities(match[1]).trim();
  }

  const reverseRegex = new RegExp(
    `<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${rel}["']`,
    "i"
  );

  const reverseMatch = html.match(reverseRegex);

  return reverseMatch?.[1]
    ? decodeEntities(reverseMatch[1]).trim()
    : null;
}

function absoluteUrl(
  url: string | null,
  base: string
): string | null {
  if (!url) return null;

  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

function extractMetadata(
  html: string,
  baseUrl: string
) {
  const siteName =
    getMetaContent(html, "og:site_name");

  const rawTitle =
    getMetaContent(html, "og:title") ||
    getMetaContent(html, "twitter:title") ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
    null;

  const title = cleanTitle(rawTitle, siteName);

  const description =
    getMetaContent(html, "og:description") ||
    getMetaContent(html, "twitter:description") ||
    getMetaContent(html, "description");

  const image =
    absoluteUrl(
      getMetaContent(html, "og:image:secure_url") ||
        getMetaContent(html, "og:image:url") ||
        getMetaContent(html, "og:image") ||
        getMetaContent(html, "twitter:image") ||
        getMetaContent(html, "twitter:image:src"),
      baseUrl
    );

  const favicon =
    absoluteUrl(
      getLinkHref(html, "icon") ||
        getLinkHref(html, "shortcut icon") ||
        getLinkHref(html, "apple-touch-icon") ||
        getLinkHref(html, "mask-icon") ||
        getLinkHref(html, "image_src"),
      baseUrl
    );

  return {
    title,
    description,
    siteName,
    image,
    favicon,
  };
}
