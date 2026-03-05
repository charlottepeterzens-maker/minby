
-- Comments on hangout availability entries
CREATE TABLE public.hangout_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  availability_id UUID NOT NULL REFERENCES public.hangout_availability(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hangout_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view comments
CREATE POLICY "Authenticated can view hangout comments"
  ON public.hangout_comments FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can add comments
CREATE POLICY "Authenticated can add hangout comments"
  ON public.hangout_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own comments
CREATE POLICY "Users can delete own hangout comments"
  ON public.hangout_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tagged friends on hangout availability entries
CREATE TABLE public.hangout_tagged_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  availability_id UUID NOT NULL REFERENCES public.hangout_availability(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL,
  tagged_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(availability_id, tagged_user_id)
);

ALTER TABLE public.hangout_tagged_friends ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view tagged friends
CREATE POLICY "Authenticated can view tagged friends"
  ON public.hangout_tagged_friends FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can tag friends
CREATE POLICY "Authenticated can tag friends"
  ON public.hangout_tagged_friends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tagged_by);

-- Tagger or availability owner can remove tags
CREATE POLICY "Tagger or owner can remove tags"
  ON public.hangout_tagged_friends FOR DELETE
  TO authenticated
  USING (
    auth.uid() = tagged_by 
    OR auth.uid() = (SELECT user_id FROM public.hangout_availability WHERE id = availability_id)
  );
