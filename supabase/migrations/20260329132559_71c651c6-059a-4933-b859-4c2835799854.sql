
ALTER TABLE public.friend_groups ADD COLUMN avatar_url text DEFAULT NULL;

-- Storage bucket for group avatars (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: group members can upload group avatars
CREATE POLICY "Members can upload group avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'group-avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.is_group_member(((storage.foldername(name))[1])::uuid)
);

-- RLS: anyone can view group avatars (public bucket)
CREATE POLICY "Anyone can view group avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'group-avatars');

-- RLS: group owner can update/delete group avatars
CREATE POLICY "Owner can manage group avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND public.is_group_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Owner can update group avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND public.is_group_owner(((storage.foldername(name))[1])::uuid)
);
