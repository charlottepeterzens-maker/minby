
-- Table for translation overrides (admins edit these, they override hardcoded defaults)
CREATE TABLE public.app_translations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL,
    lang text NOT NULL DEFAULT 'en',
    value text NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id),
    UNIQUE (key, lang)
);

ALTER TABLE public.app_translations ENABLE ROW LEVEL SECURITY;

-- Anyone can read translations (needed for the app to work)
CREATE POLICY "Anyone can read translations"
ON public.app_translations
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage translations
CREATE POLICY "Admins can manage translations"
ON public.app_translations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
