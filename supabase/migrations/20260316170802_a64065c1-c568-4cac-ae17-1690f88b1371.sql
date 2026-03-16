
-- Fix 1: Tighten notifications INSERT policy to prevent spoofing
DROP POLICY "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (from_user_id IS NULL OR from_user_id = auth.uid())
  );

-- Fix 2: Scope post_reactions SELECT to authenticated + can_view_life_post
DROP POLICY "Anyone can view reactions" ON public.post_reactions;
CREATE POLICY "Viewers can see reactions on visible posts"
  ON public.post_reactions FOR SELECT
  TO authenticated
  USING (public.can_view_life_post(post_id));

-- Also tighten INSERT and DELETE on post_reactions to authenticated
DROP POLICY "Authenticated can add reactions" ON public.post_reactions;
CREATE POLICY "Authenticated can add reactions"
  ON public.post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can remove own reactions" ON public.post_reactions;
CREATE POLICY "Users can remove own reactions"
  ON public.post_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix 3: Make life-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'life-images';
