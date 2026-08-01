CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  options text[] NOT NULL,
  closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view polls" ON public.polls FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Members can create polls" ON public.polls FOR INSERT TO authenticated WITH CHECK (public.is_circle_member(circle_id) AND created_by = auth.uid());
CREATE POLICY "Creator can update polls" ON public.polls FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator can delete polls" ON public.polls FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view votes" ON public.poll_votes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_votes.poll_id AND public.is_circle_member(p.circle_id)));
CREATE POLICY "Members can vote (self)" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_votes.poll_id AND public.is_circle_member(p.circle_id)));
CREATE POLICY "Members can change own vote" ON public.poll_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members can remove own vote" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());