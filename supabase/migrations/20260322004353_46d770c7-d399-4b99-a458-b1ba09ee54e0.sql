
CREATE TABLE public.group_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group memories"
ON public.group_memories FOR SELECT TO authenticated
USING (is_group_member(group_id));

CREATE POLICY "Members can add memories"
ON public.group_memories FOR INSERT TO authenticated
WITH CHECK (is_group_member(group_id) AND auth.uid() = user_id);

CREATE POLICY "Owner can delete own memories"
ON public.group_memories FOR DELETE TO authenticated
USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
