DROP POLICY IF EXISTS "Friends can view availability" ON public.hangout_availability;
CREATE POLICY "Friends can view availability"
ON public.hangout_availability
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    visibility <> 'private'
    AND public.has_tier_access(user_id, auth.uid(), 'outer'::public.access_tier)
  )
);

DROP POLICY IF EXISTS "Friends can view hangout comments" ON public.hangout_comments;
CREATE POLICY "Friends can view hangout comments"
ON public.hangout_comments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.hangout_availability ha
    WHERE ha.id = hangout_comments.availability_id
      AND (
        ha.user_id = auth.uid()
        OR public.has_tier_access(ha.user_id, auth.uid(), 'outer'::public.access_tier)
      )
  )
);

DROP POLICY IF EXISTS "Friends can view tagged friends" ON public.hangout_tagged_friends;
CREATE POLICY "Friends can view tagged friends"
ON public.hangout_tagged_friends
FOR SELECT
TO authenticated
USING (
  auth.uid() = tagged_user_id
  OR auth.uid() = tagged_by
  OR EXISTS (
    SELECT 1
    FROM public.hangout_availability ha
    WHERE ha.id = hangout_tagged_friends.availability_id
      AND (
        ha.user_id = auth.uid()
        OR public.has_tier_access(ha.user_id, auth.uid(), 'outer'::public.access_tier)
      )
  )
);