ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_permission_asked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_settings jsonb NOT NULL DEFAULT '{"hangout_yes":true,"hangout_maybe":true,"hangout_comment":true,"hangout_new":true,"group_invite":true,"group_message":true,"life_comment":true,"daily_digest_enabled":false,"daily_digest_time":"07:30"}'::jsonb;

-- Update push_subscriptions to use jsonb subscription column
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS subscription jsonb;