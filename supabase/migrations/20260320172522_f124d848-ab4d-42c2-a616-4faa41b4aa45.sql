
-- Make section_id nullable so quick-posts can be created without a section
ALTER TABLE public.life_posts ALTER COLUMN section_id DROP NOT NULL;

-- Update RLS: also allow viewing posts with null section_id (user's own posts)
CREATE OR REPLACE FUNCTION public.can_view_life_post(_post_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM life_posts lp
    LEFT JOIN life_sections ls ON ls.id = lp.section_id
    WHERE lp.id = _post_id
      AND (
        lp.user_id = auth.uid()
        OR (
          ls.id IS NOT NULL 
          AND public.has_tier_access(ls.user_id, auth.uid(), ls.min_tier)
        )
        OR (
          ls.id IS NULL 
          AND EXISTS (
            SELECT 1 FROM friend_access_tiers 
            WHERE owner_id = lp.user_id 
            AND friend_user_id = auth.uid()
          )
        )
      )
  )
$$;
