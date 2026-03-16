
-- Tips/favorites table
CREATE TABLE public.user_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  url text,
  image_url text,
  category text NOT NULL DEFAULT 'other',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_tips ENABLE ROW LEVEL SECURITY;

-- Owner can manage own tips
CREATE POLICY "Owner can manage own tips"
  ON public.user_tips FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Friends can view tips (anyone authenticated for now, same as profiles)
CREATE POLICY "Authenticated can view tips"
  ON public.user_tips FOR SELECT
  TO authenticated
  USING (true);

-- Saved tips table
CREATE TABLE public.saved_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_tip_id uuid NOT NULL REFERENCES public.user_tips(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, original_tip_id)
);

ALTER TABLE public.saved_tips ENABLE ROW LEVEL SECURITY;

-- Owner can manage own saved tips
CREATE POLICY "Owner can manage saved tips"
  ON public.saved_tips FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tip owners can see who saved their tips
CREATE POLICY "Tip owners can see saves"
  ON public.saved_tips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tips
      WHERE user_tips.id = saved_tips.original_tip_id
        AND user_tips.user_id = auth.uid()
    )
  );
