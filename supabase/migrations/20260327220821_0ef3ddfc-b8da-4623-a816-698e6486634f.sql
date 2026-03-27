
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages they can see (group members)
CREATE POLICY "Members can view message reactions"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_messages gm
    WHERE gm.id = message_reactions.message_id
    AND is_group_member(gm.group_id)
  )
);

-- Users can add reactions to messages in their groups
CREATE POLICY "Members can add message reactions"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM group_messages gm
    WHERE gm.id = message_reactions.message_id
    AND is_group_member(gm.group_id)
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
