-- Data API access (was missing entirely -> tables unreachable)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Helper: is the poll's circle one the current user belongs to?
CREATE OR REPLACE FUNCTION public.can_access_poll(_poll_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = _poll_id AND public.is_circle_member(p.circle_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_poll_open(_poll_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = _poll_id
      AND p.closed = false
      AND (p.closes_at IS NULL OR p.closes_at > now())
  )
$$;

-- polls
DROP POLICY IF EXISTS "Members can view polls" ON public.polls;
DROP POLICY IF EXISTS "Members can create polls" ON public.polls;
DROP POLICY IF EXISTS "Creator can update polls" ON public.polls;
DROP POLICY IF EXISTS "Creator can delete polls" ON public.polls;

CREATE POLICY "Members can view polls"
  ON public.polls FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id));

CREATE POLICY "Members can create polls"
  ON public.polls FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_member(circle_id) AND created_by = auth.uid());

CREATE POLICY "Creator can update polls"
  ON public.polls FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.is_circle_member(circle_id))
  WITH CHECK (created_by = auth.uid() AND public.is_circle_member(circle_id));

CREATE POLICY "Creator can delete polls"
  ON public.polls FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND public.is_circle_member(circle_id));

-- poll_votes
DROP POLICY IF EXISTS "Members can view votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Members can vote (self)" ON public.poll_votes;
DROP POLICY IF EXISTS "Members can change own vote" ON public.poll_votes;
DROP POLICY IF EXISTS "Members can remove own vote" ON public.poll_votes;

CREATE POLICY "Members can view votes"
  ON public.poll_votes FOR SELECT TO authenticated
  USING (public.can_access_poll(poll_id));

CREATE POLICY "Members can vote (self)"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_poll(poll_id)
    AND public.is_poll_open(poll_id)
  );

CREATE POLICY "Members can change own vote"
  ON public.poll_votes FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_poll(poll_id)
    AND public.is_poll_open(poll_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_poll(poll_id)
    AND public.is_poll_open(poll_id)
  );

CREATE POLICY "Members can remove own vote"
  ON public.poll_votes FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_poll(poll_id)
    AND public.is_poll_open(poll_id)
  );