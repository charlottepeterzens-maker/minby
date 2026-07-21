
CREATE OR REPLACE FUNCTION public.is_tip_owner(_tip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tips WHERE id = _tip_id AND owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.can_view_tip(_tip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tip_visibility tv
    WHERE tv.tip_id = _tip_id AND public.is_circle_member(tv.circle_id)
  )
$$;

DROP POLICY IF EXISTS "Owner or circle-member can view tip" ON public.tips;
CREATE POLICY "Owner or circle-member can view tip" ON public.tips
FOR SELECT USING (owner_id = auth.uid() OR public.can_view_tip(id));

DROP POLICY IF EXISTS "Circle members can view tip visibility" ON public.tip_visibility;
CREATE POLICY "Circle members can view tip visibility" ON public.tip_visibility
FOR SELECT USING (public.is_circle_member(circle_id) OR public.is_tip_owner(tip_id));

DROP POLICY IF EXISTS "Owner can share tip to circle" ON public.tip_visibility;
CREATE POLICY "Owner can share tip to circle" ON public.tip_visibility
FOR INSERT WITH CHECK (public.is_tip_owner(tip_id) AND public.is_circle_member(circle_id));

DROP POLICY IF EXISTS "Owner can unshare tip" ON public.tip_visibility;
CREATE POLICY "Owner can unshare tip" ON public.tip_visibility
FOR DELETE USING (public.is_tip_owner(tip_id));
