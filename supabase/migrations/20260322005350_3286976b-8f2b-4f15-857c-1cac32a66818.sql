
-- Allow any group member to add other members (not just owner)
DROP POLICY IF EXISTS "Owner can add members" ON public.group_memberships;
CREATE POLICY "Members can add members"
ON public.group_memberships FOR INSERT TO authenticated
WITH CHECK (
  is_group_member(group_id) AND user_id <> auth.uid()
);
