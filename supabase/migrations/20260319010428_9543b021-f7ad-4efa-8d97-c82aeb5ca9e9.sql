
CREATE TABLE public.tip_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id uuid REFERENCES public.user_tips(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tip_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own comments"
  ON public.tip_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can view tip comments"
  ON public.tip_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can delete own comments"
  ON public.tip_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
