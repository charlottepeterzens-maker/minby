
CREATE OR REPLACE FUNCTION public.is_photo_owner(_photo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.photos WHERE id = _photo_id AND owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.can_view_photo(_photo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.photo_visibility pv
    WHERE pv.photo_id = _photo_id AND public.is_circle_member(pv.circle_id)
  )
$$;

DROP POLICY IF EXISTS "Owner or circle-member can view photo" ON public.photos;
CREATE POLICY "Owner or circle-member can view photo" ON public.photos
FOR SELECT USING (owner_id = auth.uid() OR public.can_view_photo(id));

DROP POLICY IF EXISTS "Circle members can view visibility" ON public.photo_visibility;
CREATE POLICY "Circle members can view visibility" ON public.photo_visibility
FOR SELECT USING (public.is_circle_member(circle_id) OR public.is_photo_owner(photo_id));

DROP POLICY IF EXISTS "Owner can share photo to circle" ON public.photo_visibility;
CREATE POLICY "Owner can share photo to circle" ON public.photo_visibility
FOR INSERT WITH CHECK (public.is_photo_owner(photo_id) AND public.is_circle_member(circle_id));

DROP POLICY IF EXISTS "Owner can unshare photo" ON public.photo_visibility;
CREATE POLICY "Owner can unshare photo" ON public.photo_visibility
FOR DELETE USING (public.is_photo_owner(photo_id));
