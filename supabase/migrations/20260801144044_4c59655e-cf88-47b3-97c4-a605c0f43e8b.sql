CREATE OR REPLACE FUNCTION public.shares_circle_with(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members me
    JOIN public.circle_members other ON other.circle_id = me.circle_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION public.shares_circle_with(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_circle_with(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own and co-member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.shares_circle_with(user_id));