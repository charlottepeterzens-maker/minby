
-- Track per-member read position in a circle's chat, to power an accurate
-- "unread since you last read this circle's chat" signal on Hem.
ALTER TABLE public.circle_members
  ADD COLUMN last_read_at timestamptz NOT NULL DEFAULT now();

GRANT UPDATE ON public.circle_members TO authenticated;

CREATE POLICY "Users can update own last_read"
  ON public.circle_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
