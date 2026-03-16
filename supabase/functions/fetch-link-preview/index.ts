const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lovable/1.0; +https://lovable.dev)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch: ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await response.text();

    // Extract OG tags
    const getMetaContent = (property: string): string | null => {
      // Try og: and twitter: variants
      for (const attr of ['property', 'name']) {
        const regex = new RegExp(
          `<meta[^>]+${attr}=["']${property}["'][^>]+content=["']([^"']*)["']`,
          'i'
        );
        const match = html.match(regex);
        if (match) return match[1];

        // Also try content before property
        const regex2 = new RegExp(
          `<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${property}["']`,
          'i'
        );
        const match2 = html.match(regex2);
        if (match2) return match2[1];
      }
      return null;
    };

    const title =
      getMetaContent('og:title') ||
      getMetaContent('twitter:title') ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
      null;

    let image =
      getMetaContent('og:image') ||
      getMetaContent('twitter:image') ||
      null;

    // Resolve relative image URLs
    if (image && !image.startsWith('http')) {
      try {
        image = new URL(image, formattedUrl).href;
      } catch {
        // ignore
      }
    }

    return new Response(
      JSON.stringify({ title, image }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Link preview error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
