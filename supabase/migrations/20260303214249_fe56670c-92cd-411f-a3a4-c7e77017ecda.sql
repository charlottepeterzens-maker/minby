
-- Access tier enum
CREATE TYPE public.access_tier AS ENUM ('close', 'inner', 'outer');

-- Friend access tiers: assign a tier to each friend
CREATE TABLE public.friend_access_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  friend_user_id UUID NOT NULL,
  tier access_tier NOT NULL DEFAULT 'outer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, friend_user_id)
);

ALTER TABLE public.friend_access_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage their friend tiers"
  ON public.friend_access_tiers FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Life sections: customizable categories on a profile
CREATE TABLE public.life_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📝',
  min_tier access_tier NOT NULL DEFAULT 'outer',
  section_type TEXT NOT NULL DEFAULT 'posts',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.life_sections ENABLE ROW LEVEL SECURITY;

-- Owner full access
CREATE POLICY "Owner can manage own sections"
  ON public.life_sections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Security definer to check tier access
CREATE OR REPLACE FUNCTION public.has_tier_access(_owner_id UUID, _viewer_id UUID, _min_tier access_tier)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friend_access_tiers
    WHERE owner_id = _owner_id
      AND friend_user_id = _viewer_id
      AND (
        CASE _min_tier
          WHEN 'close' THEN tier = 'close'
          WHEN 'inner' THEN tier IN ('close', 'inner')
          WHEN 'outer' THEN tier IN ('close', 'inner', 'outer')
        END
      )
  )
$$;

-- Others can view sections if they have the right tier
CREATE POLICY "Friends can view sections by tier"
  ON public.life_sections FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_tier_access(user_id, auth.uid(), min_tier)
  );

-- Life posts: content within sections
CREATE TABLE public.life_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.life_sections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  link_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.life_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own posts"
  ON public.life_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Security definer to check post visibility via section tier
CREATE OR REPLACE FUNCTION public.can_view_life_post(_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM life_posts lp
    JOIN life_sections ls ON ls.id = lp.section_id
    WHERE lp.id = _post_id
      AND (
        ls.user_id = auth.uid()
        OR public.has_tier_access(ls.user_id, auth.uid(), ls.min_tier)
      )
  )
$$;

CREATE POLICY "Friends can view posts by tier"
  ON public.life_posts FOR SELECT
  USING (public.can_view_life_post(id));

-- Period tracker table (structured)
CREATE TABLE public.period_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  flow_level TEXT DEFAULT 'medium',
  symptoms TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.period_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own entries"
  ON public.period_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Friends see period entries via the life_sections tier check
-- We'll handle this at app level by checking the period section's min_tier

-- Workout tracker table (structured)
CREATE TABLE public.workout_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_type TEXT NOT NULL,
  duration_mins INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own workouts"
  ON public.workout_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for life post images
INSERT INTO storage.buckets (id, name, public) VALUES ('life-images', 'life-images', true);

CREATE POLICY "Users can upload own life images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'life-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Life images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'life-images');

CREATE POLICY "Users can delete own life images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'life-images' AND auth.uid()::text = (storage.foldername(name))[1]);
