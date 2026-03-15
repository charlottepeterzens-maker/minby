
-- Create group_polls table
CREATE TABLE public.group_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_votes table
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.group_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

-- RLS for group_polls
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group polls"
  ON public.group_polls FOR SELECT TO authenticated
  USING (is_group_member(group_id));

CREATE POLICY "Members can create group polls"
  ON public.group_polls FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id) AND auth.uid() = user_id);

CREATE POLICY "Creator can delete own polls"
  ON public.group_polls FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS for poll_votes
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view poll votes"
  ON public.poll_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_polls gp
    WHERE gp.id = poll_votes.poll_id AND is_group_member(gp.group_id)
  ));

CREATE POLICY "Members can vote on polls"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_polls gp
      WHERE gp.id = poll_votes.poll_id AND is_group_member(gp.group_id)
    )
  );

CREATE POLICY "Users can change own vote"
  ON public.poll_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for poll_votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_polls;
