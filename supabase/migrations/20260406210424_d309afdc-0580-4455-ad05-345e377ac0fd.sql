
-- Create hangout_responses table
CREATE TABLE public.hangout_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  availability_id uuid NOT NULL REFERENCES public.hangout_availability(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  response text NOT NULL CHECK (response IN ('yes', 'maybe')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (availability_id, user_id)
);

-- Enable RLS
ALTER TABLE public.hangout_responses ENABLE ROW LEVEL SECURITY;

-- View: same access as hangout_availability
CREATE POLICY "Users can view responses on accessible hangouts"
ON public.hangout_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hangout_availability ha
    WHERE ha.id = hangout_responses.availability_id
      AND (ha.user_id = auth.uid() OR (ha.visibility <> 'private' AND has_tier_access(ha.user_id, auth.uid(), 'outer'::access_tier)))
  )
);

-- Insert/Update own response
CREATE POLICY "Users can upsert own response"
ON public.hangout_responses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM hangout_availability ha
    WHERE ha.id = hangout_responses.availability_id
      AND (ha.user_id = auth.uid() OR (ha.visibility <> 'private' AND has_tier_access(ha.user_id, auth.uid(), 'outer'::access_tier)))
  )
);

CREATE POLICY "Users can update own response"
ON public.hangout_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete own response
CREATE POLICY "Users can delete own response"
ON public.hangout_responses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_hangout_responses_availability ON public.hangout_responses(availability_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_responses;
