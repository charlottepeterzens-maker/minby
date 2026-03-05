
-- 1. Post reactions table
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.life_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.post_reactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can add reactions" ON public.post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON public.post_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Friend requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Authenticated can send requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = from_user_id AND status = 'pending');

CREATE POLICY "Recipient can update request" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = to_user_id);

CREATE POLICY "Sender can delete request" ON public.friend_requests
  FOR DELETE USING (auth.uid() = from_user_id);

-- Add unique constraint on hangout_availability for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hangout_availability_user_id_date_key'
  ) THEN
    ALTER TABLE public.hangout_availability ADD CONSTRAINT hangout_availability_user_id_date_key UNIQUE(user_id, date);
  END IF;
END $$;
