
-- 1. Create profile_settings table for sensitive owner-only data
CREATE TABLE IF NOT EXISTS public.profile_settings (
  user_id uuid PRIMARY KEY,
  notification_settings jsonb NOT NULL DEFAULT '{"hangout_new": true, "hangout_yes": true, "group_invite": true, "life_comment": true, "group_message": true, "hangout_maybe": true, "hangout_comment": true, "daily_digest_time": "07:30", "daily_digest_enabled": false}'::jsonb,
  muted_users jsonb NOT NULL DEFAULT '[]'::jsonb,
  notification_permission_asked boolean NOT NULL DEFAULT false,
  friend_request_notifications boolean NOT NULL DEFAULT true,
  meetup_notifications boolean NOT NULL DEFAULT true,
  update_notifications boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own settings"
  ON public.profile_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own settings"
  ON public.profile_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own settings"
  ON public.profile_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own settings"
  ON public.profile_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Migrate existing data from profiles to profile_settings
INSERT INTO public.profile_settings (user_id, notification_settings, muted_users, notification_permission_asked, friend_request_notifications, meetup_notifications, update_notifications)
SELECT user_id, notification_settings, muted_users, notification_permission_asked, friend_request_notifications, meetup_notifications, update_notifications
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Drop the now-migrated columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS notification_settings,
  DROP COLUMN IF EXISTS muted_users,
  DROP COLUMN IF EXISTS notification_permission_asked,
  DROP COLUMN IF EXISTS friend_request_notifications,
  DROP COLUMN IF EXISTS meetup_notifications,
  DROP COLUMN IF EXISTS update_notifications;

-- Trigger to keep profile_settings.updated_at fresh
CREATE TRIGGER profile_settings_updated_at
  BEFORE UPDATE ON public.profile_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile_settings row when a new profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_settings (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_create_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_settings();

-- 2. Helper RPC so apps can check if person A muted person B without exposing the list
CREATE OR REPLACE FUNCTION public.is_muted_by(_owner_id uuid, _candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_settings
    WHERE user_id = _owner_id
      AND muted_users ? _candidate_id::text
  )
$$;

-- 3. life-images bucket: drop overly-permissive public SELECT, replace with friend/owner check
DROP POLICY IF EXISTS "Life images are publicly viewable" ON storage.objects;

CREATE POLICY "Owner or friend can view life images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'life-images'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_tier_access(((storage.foldername(name))[1])::uuid, auth.uid(), 'outer'::access_tier)
    )
  );

-- 4. Tighten invite-based friendship insert: require user already claimed the invite
DROP POLICY IF EXISTS "Invited user can create accepted friendship" ON public.friend_requests;

CREATE POLICY "Invited user can create accepted friendship"
  ON public.friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'accepted'
    AND to_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.invite_links
      WHERE created_by = friend_requests.from_user_id
        AND used_by = auth.uid()
        AND expires_at > now()
    )
  );

-- 5. Lock down SECURITY DEFINER functions: only authenticated may execute
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_tier_access(uuid, uuid, access_tier) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_life_post(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_muted_by(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tier_access(uuid, uuid, access_tier) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_life_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_muted_by(uuid, uuid) TO authenticated;
