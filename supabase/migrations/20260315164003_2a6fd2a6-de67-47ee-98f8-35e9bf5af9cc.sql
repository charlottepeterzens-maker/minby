
-- Create group messages table
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Members can view messages in their groups
CREATE POLICY "Members can view group messages"
  ON public.group_messages
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

-- Members can send messages to their groups
CREATE POLICY "Members can send group messages"
  ON public.group_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (is_group_member(group_id) AND auth.uid() = user_id);

-- Users can delete own messages
CREATE POLICY "Users can delete own messages"
  ON public.group_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
