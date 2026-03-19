-- Allow any authenticated user to update used_by (to accept an invite)
CREATE POLICY "Authenticated can accept invite"
  ON public.invite_links FOR UPDATE
  TO authenticated
  USING (used_by IS NULL)
  WITH CHECK (used_by = auth.uid());