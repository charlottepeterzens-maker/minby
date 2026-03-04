
CREATE TABLE public.hangout_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  activities TEXT[] NOT NULL DEFAULT '{}',
  custom_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.hangout_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own availability"
ON public.hangout_availability
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view availability"
ON public.hangout_availability
FOR SELECT
TO authenticated
USING (true);
