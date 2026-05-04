
-- 1) group_memberships: only owners can add members (members can still leave; owner trigger still inserts owner row)
DROP POLICY IF EXISTS "Members can add members" ON public.group_memberships;
CREATE POLICY "Owners can add members"
ON public.group_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_group_owner(group_id) AND user_id <> auth.uid()
);

-- 2) tip_comments: restrict SELECT to viewers who have access to the parent tip
DROP POLICY IF EXISTS "Authenticated can view tip comments" ON public.tip_comments;
CREATE POLICY "Viewers with tip access can view comments"
ON public.tip_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tips ut
    WHERE ut.id = tip_comments.tip_id
      AND (ut.user_id = auth.uid() OR public.has_tier_access(ut.user_id, auth.uid(), 'outer'::access_tier))
  )
);

-- Also ensure new comments target visible tips
DROP POLICY IF EXISTS "Users can create own comments" ON public.tip_comments;
CREATE POLICY "Users can create own comments"
ON public.tip_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_tips ut
    WHERE ut.id = tip_comments.tip_id
      AND (ut.user_id = auth.uid() OR public.has_tier_access(ut.user_id, auth.uid(), 'outer'::access_tier))
  )
);

-- 3) friend_requests: tighten "Invited user can create accepted friendship" to require the invite link
-- to already be claimed by the inviting user (prevents race + bypass)
DROP POLICY IF EXISTS "Invited user can create accepted friendship" ON public.friend_requests;
CREATE POLICY "Invited user can create accepted friendship"
ON public.friend_requests
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'accepted'
  AND to_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.invite_links
    WHERE invite_links.created_by = friend_requests.from_user_id
      AND invite_links.used_by = auth.uid()
      AND invite_links.expires_at > now()
  )
);
