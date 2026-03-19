CREATE TABLE public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  token text NOT NULL UNIQUE,
  used_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own invite links"
  ON public.invite_links FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated can create invite links"
  ON public.invite_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can read invite by token"
  ON public.invite_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner can update own invite links"
  ON public.invite_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);