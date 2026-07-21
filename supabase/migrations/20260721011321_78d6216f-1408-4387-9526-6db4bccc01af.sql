
-- 1. DROP gamla tabeller
DROP TABLE IF EXISTS public.friend_access_tiers CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.friend_groups CASCADE;
DROP TABLE IF EXISTS public.group_memberships CASCADE;
DROP TABLE IF EXISTS public.group_memories CASCADE;
DROP TABLE IF EXISTS public.group_messages CASCADE;
DROP TABLE IF EXISTS public.group_polls CASCADE;
DROP TABLE IF EXISTS public.hangout_availability CASCADE;
DROP TABLE IF EXISTS public.hangout_comments CASCADE;
DROP TABLE IF EXISTS public.hangout_responses CASCADE;
DROP TABLE IF EXISTS public.hangout_tagged_friends CASCADE;
DROP TABLE IF EXISTS public.life_posts CASCADE;
DROP TABLE IF EXISTS public.life_sections CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.period_entries CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.poll_votes CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.post_reactions CASCADE;
DROP TABLE IF EXISTS public.profile_settings CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.rsvps CASCADE;
DROP TABLE IF EXISTS public.saved_tips CASCADE;
DROP TABLE IF EXISTS public.tip_comments CASCADE;
DROP TABLE IF EXISTS public.user_tips CASCADE;
DROP TABLE IF EXISTS public.workout_entries CASCADE;
DROP TABLE IF EXISTS public.invite_links CASCADE;
DROP TABLE IF EXISTS public.app_translations CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

DROP FUNCTION IF EXISTS public.is_group_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_group_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_muted_by(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_profile_settings() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_group() CASCADE;
DROP FUNCTION IF EXISTS public.has_tier_access(uuid, uuid, access_tier) CASCADE;
DROP FUNCTION IF EXISTS public.notify_hangout_match() CASCADE;
DROP FUNCTION IF EXISTS public.can_view_life_post(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP TYPE IF EXISTS public.access_tier CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS notification_settings,
  DROP COLUMN IF EXISTS notification_permission_asked,
  DROP COLUMN IF EXISTS muted_users;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- CIRCLES
CREATE TABLE public.circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hero_image_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT ALL ON public.circles TO service_role;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.circle_members TO authenticated;
GRANT ALL ON public.circle_members TO service_role;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_circle_member(_circle_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = _circle_id AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Members can view their circles" ON public.circles
  FOR SELECT TO authenticated USING (public.is_circle_member(id) OR created_by = auth.uid());
CREATE POLICY "Users can create circles" ON public.circles
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner can update circles" ON public.circles
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner can delete circles" ON public.circles
  FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Members can view co-members" ON public.circle_members
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Users can join (self)" ON public.circle_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave (self)" ON public.circle_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_circle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.circle_members (circle_id, user_id) VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_circle_created AFTER INSERT ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_circle();
CREATE TRIGGER update_circles_updated_at BEFORE UPDATE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- CIRCLE INVITES
CREATE TABLE public.circle_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.circle_invites TO authenticated;
GRANT ALL ON public.circle_invites TO service_role;
ALTER TABLE public.circle_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invites" ON public.circle_invites
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Members can create invites" ON public.circle_invites
  FOR INSERT TO authenticated WITH CHECK (public.is_circle_member(circle_id) AND created_by = auth.uid());
CREATE POLICY "Members can revoke invites" ON public.circle_invites
  FOR DELETE TO authenticated USING (public.is_circle_member(circle_id));

-- CIRCLE AI SUMMARY
CREATE TABLE public.circle_ai_summary (
  circle_id uuid PRIMARY KEY REFERENCES public.circles(id) ON DELETE CASCADE,
  content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.circle_ai_summary TO authenticated;
GRANT ALL ON public.circle_ai_summary TO service_role;
ALTER TABLE public.circle_ai_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view AI summary" ON public.circle_ai_summary
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));

-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text,
  kind text NOT NULL DEFAULT 'text',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Members can post messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (public.is_circle_member(circle_id) AND user_id = auth.uid());
CREATE POLICY "Authors can update own messages" ON public.messages
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authors can delete own messages" ON public.messages
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_messages_circle_created ON public.messages (circle_id, created_at DESC);

-- MEETINGS
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_date date,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view meetings" ON public.meetings
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Members can create meetings" ON public.meetings
  FOR INSERT TO authenticated WITH CHECK (public.is_circle_member(circle_id) AND created_by = auth.uid());
CREATE POLICY "Creator can update meetings" ON public.meetings
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator can delete meetings" ON public.meetings
  FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.meeting_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('yes','no')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_responses TO authenticated;
GRANT ALL ON public.meeting_responses TO service_role;
ALTER TABLE public.meeting_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view responses" ON public.meeting_responses
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_circle_member(m.circle_id))
  );
CREATE POLICY "Members can respond (self)" ON public.meeting_responses
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_circle_member(m.circle_id))
  );
CREATE POLICY "Members can update own response" ON public.meeting_responses
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members can delete own response" ON public.meeting_responses
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- PHOTOS + VISIBILITY
CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.photo_visibility (
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, circle_id)
);
GRANT SELECT, INSERT, DELETE ON public.photo_visibility TO authenticated;
GRANT ALL ON public.photo_visibility TO service_role;
ALTER TABLE public.photo_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or circle-member can view photo" ON public.photos
  FOR SELECT TO authenticated USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.photo_visibility pv WHERE pv.photo_id = id AND public.is_circle_member(pv.circle_id))
  );
CREATE POLICY "Owner can insert photo" ON public.photos
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can update photo" ON public.photos
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can delete photo" ON public.photos
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Circle members can view visibility" ON public.photo_visibility
  FOR SELECT TO authenticated USING (
    public.is_circle_member(circle_id)
    OR EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_id AND p.owner_id = auth.uid())
  );
CREATE POLICY "Owner can share photo to circle" ON public.photo_visibility
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_id AND p.owner_id = auth.uid())
    AND public.is_circle_member(circle_id)
  );
CREATE POLICY "Owner can unshare photo" ON public.photo_visibility
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_id AND p.owner_id = auth.uid())
  );

-- TIPS + VISIBILITY
CREATE TABLE public.tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text,
  comment text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tips TO authenticated;
GRANT ALL ON public.tips TO service_role;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tip_visibility (
  tip_id uuid NOT NULL REFERENCES public.tips(id) ON DELETE CASCADE,
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  PRIMARY KEY (tip_id, circle_id)
);
GRANT SELECT, INSERT, DELETE ON public.tip_visibility TO authenticated;
GRANT ALL ON public.tip_visibility TO service_role;
ALTER TABLE public.tip_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or circle-member can view tip" ON public.tips
  FOR SELECT TO authenticated USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tip_visibility tv WHERE tv.tip_id = id AND public.is_circle_member(tv.circle_id))
  );
CREATE POLICY "Owner can insert tip" ON public.tips
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can update tip" ON public.tips
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can delete tip" ON public.tips
  FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER update_tips_updated_at BEFORE UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Circle members can view tip visibility" ON public.tip_visibility
  FOR SELECT TO authenticated USING (
    public.is_circle_member(circle_id)
    OR EXISTS (SELECT 1 FROM public.tips t WHERE t.id = tip_id AND t.owner_id = auth.uid())
  );
CREATE POLICY "Owner can share tip to circle" ON public.tip_visibility
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.tips t WHERE t.id = tip_id AND t.owner_id = auth.uid())
    AND public.is_circle_member(circle_id)
  );
CREATE POLICY "Owner can unshare tip" ON public.tip_visibility
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tips t WHERE t.id = tip_id AND t.owner_id = auth.uid())
  );

-- STORAGE POLICIES (buckets skapas separat)
DROP POLICY IF EXISTS "Members can read circle hero" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload circle hero" ON storage.objects;
DROP POLICY IF EXISTS "Members can update circle hero" ON storage.objects;
DROP POLICY IF EXISTS "Owner can read own photos" ON storage.objects;
DROP POLICY IF EXISTS "Members can read shared photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete photos" ON storage.objects;

CREATE POLICY "Members can read circle hero"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'circle-hero' AND public.is_circle_member((split_part(name, '/', 1))::uuid));
CREATE POLICY "Members can upload circle hero"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'circle-hero' AND public.is_circle_member((split_part(name, '/', 1))::uuid));
CREATE POLICY "Members can update circle hero"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'circle-hero' AND public.is_circle_member((split_part(name, '/', 1))::uuid));

CREATE POLICY "Owner can read own photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'circle-photos' AND owner = auth.uid());
CREATE POLICY "Members can read shared photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'circle-photos'
  AND EXISTS (
    SELECT 1 FROM public.photos p
    JOIN public.photo_visibility pv ON pv.photo_id = p.id
    WHERE p.storage_path = name AND public.is_circle_member(pv.circle_id)
  )
);
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'circle-photos' AND owner = auth.uid());
CREATE POLICY "Owner can delete photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'circle-photos' AND owner = auth.uid());
