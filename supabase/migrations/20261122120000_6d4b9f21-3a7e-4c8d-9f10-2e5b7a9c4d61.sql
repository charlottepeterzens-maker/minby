
-- Notification preference per circle membership (default: all messages)
ALTER TABLE public.circle_members
  ADD COLUMN notify_level text NOT NULL DEFAULT 'all'
  CHECK (notify_level IN ('all', 'important', 'silent'));

-- Web Push subscriptions (one row per device/browser)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can add own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- pg_net was enabled previously; make sure it's there for the trigger below.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- On every new message (text or meeting proposal), ask the edge function to
-- fan out push notifications to the circle's other members.
CREATE OR REPLACE FUNCTION public.notify_message_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind IN ('text', 'meeting_proposal') THEN
    PERFORM net.http_post(
      url := 'https://heuxlipzvlifyynwljxw.supabase.co/functions/v1/send-message-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldXhsaXB6dmxpZnl5bndsanh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzA3NTYsImV4cCI6MjA4ODE0Njc1Nn0.SLM7GqXMBnEhnW_lPvXv4YrcqP-HoX4JuH4ENXNDKQM',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldXhsaXB6dmxpZnl5bndsanh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzA3NTYsImV4cCI6MjA4ODE0Njc1Nn0.SLM7GqXMBnEhnW_lPvXv4YrcqP-HoX4JuH4ENXNDKQM'
      ),
      body := jsonb_build_object('message_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_inserted();
