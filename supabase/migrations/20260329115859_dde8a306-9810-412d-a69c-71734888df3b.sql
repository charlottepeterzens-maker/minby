
-- 1. Fix user_tips: restrict SELECT to owner or friends with tier access
DROP POLICY IF EXISTS "Authenticated can view tips" ON public.user_tips;
CREATE POLICY "Friends can view tips" ON public.user_tips
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_tier_access(user_id, auth.uid(), 'outer'::access_tier)
  );

-- 2. Fix post_reactions: add can_view_life_post check to INSERT
DROP POLICY IF EXISTS "Authenticated can add reactions" ON public.post_reactions;
CREATE POLICY "Authenticated can add reactions to visible posts" ON public.post_reactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND can_view_life_post(post_id));

-- 3. Fix hangout_tagged_friends: add access check to INSERT
DROP POLICY IF EXISTS "Authenticated can tag friends" ON public.hangout_tagged_friends;
CREATE POLICY "Authenticated can tag friends with access" ON public.hangout_tagged_friends
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = tagged_by
    AND EXISTS (
      SELECT 1 FROM hangout_availability ha
      WHERE ha.id = availability_id
        AND (
          ha.user_id = auth.uid()
          OR (ha.visibility <> 'private' AND has_tier_access(ha.user_id, auth.uid(), 'outer'::access_tier))
        )
    )
  );
