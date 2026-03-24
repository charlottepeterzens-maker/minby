import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves an avatar reference to a full public URL.
 * Handles: full URLs (returned as-is), relative storage paths (resolved via public bucket URL).
 */
export function resolveAvatarUrl(avatarRef: string | null): string | null {
  if (!avatarRef) return null;
  // Already a full URL
  if (avatarRef.startsWith("http://") || avatarRef.startsWith("https://")) {
    return avatarRef;
  }
  // Relative path – resolve via public avatars bucket
  const { data } = supabase.storage.from("avatars").getPublicUrl(
    avatarRef.startsWith("avatars/") ? avatarRef.slice("avatars/".length) : avatarRef
  );
  return data?.publicUrl || null;
}
