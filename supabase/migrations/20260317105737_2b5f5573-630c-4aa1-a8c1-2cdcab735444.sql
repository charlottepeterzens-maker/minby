DROP POLICY IF EXISTS "Authenticated can add comments" ON public.post_comments;

CREATE POLICY "Authenticated can add comments"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND can_view_life_post(post_id)
);