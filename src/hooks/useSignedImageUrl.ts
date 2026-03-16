import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a life-images storage reference (path or legacy public URL) to a signed URL.
 * Returns null while loading or if no image.
 */
export function useSignedImageUrl(imageRef: string | null, ttl = 3600): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageRef) {
      setUrl(null);
      return;
    }

    // Extract the storage path from a full public URL or use as-is
    let path = imageRef;
    const publicPrefix = "/storage/v1/object/public/life-images/";
    const idx = imageRef.indexOf(publicPrefix);
    if (idx !== -1) {
      path = imageRef.substring(idx + publicPrefix.length);
    }

    let cancelled = false;

    supabase.storage
      .from("life-images")
      .createSignedUrl(path, ttl)
      .then(({ data, error }) => {
        if (!cancelled && data?.signedUrl) {
          setUrl(data.signedUrl);
        } else if (!cancelled) {
          // Fallback: try original URL (may work for very old public links)
          setUrl(imageRef);
        }
      });

    return () => { cancelled = true; };
  }, [imageRef, ttl]);

  return url;
}
