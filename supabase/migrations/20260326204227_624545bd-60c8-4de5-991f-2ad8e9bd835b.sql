
DROP POLICY "Authenticated can add hangout comments" ON public.hangout_comments;

CREATE POLICY "Authenticated can add hangout comments"
ON public.hangout_comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM hangout_availability ha
      WHERE ha.id = hangout_comments.availability_id
        AND (
          ha.user_id = auth.uid()
          OR (ha.visibility <> 'private' AND has_tier_access(ha.user_id, auth.uid(), 'outer'::access_tier))
        )
    )
  )
);
