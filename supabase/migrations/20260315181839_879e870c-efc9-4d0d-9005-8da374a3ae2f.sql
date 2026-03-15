ALTER TABLE public.profiles
  ADD COLUMN friend_request_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN meetup_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN update_notifications boolean NOT NULL DEFAULT true;