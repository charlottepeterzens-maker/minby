
CREATE OR REPLACE FUNCTION public.notify_hangout_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  friend_row RECORD;
  new_user_name TEXT;
  friend_name TEXT;
BEGIN
  -- Get inserting user's display name
  SELECT display_name INTO new_user_name FROM profiles WHERE user_id = NEW.user_id;

  -- Find friends who have availability on the same date
  FOR friend_row IN
    SELECT ha.user_id, ha.id as availability_id
    FROM hangout_availability ha
    WHERE ha.date = NEW.date
      AND ha.user_id <> NEW.user_id
      AND ha.visibility <> 'private'
      AND (
        -- Check friendship exists (bidirectional)
        EXISTS (
          SELECT 1 FROM friend_access_tiers
          WHERE (owner_id = NEW.user_id AND friend_user_id = ha.user_id)
             OR (owner_id = ha.user_id AND friend_user_id = NEW.user_id)
        )
      )
  LOOP
    SELECT display_name INTO friend_name FROM profiles WHERE user_id = friend_row.user_id;

    -- Notify the friend that the new user also has availability
    INSERT INTO notifications (user_id, from_user_id, type, title, body, reference_id)
    VALUES (
      friend_row.user_id,
      NEW.user_id,
      'hangout_match',
      COALESCE(new_user_name, 'Någon') || ' är också ledig!',
      'Ni är båda lediga ' || to_char(NEW.date, 'DD Mon'),
      NEW.id::text
    )
    ON CONFLICT DO NOTHING;

    -- Notify the new user that this friend has availability
    INSERT INTO notifications (user_id, from_user_id, type, title, body, reference_id)
    VALUES (
      NEW.user_id,
      friend_row.user_id,
      'hangout_match',
      COALESCE(friend_name, 'Någon') || ' är också ledig!',
      'Ni är båda lediga ' || to_char(NEW.date, 'DD Mon'),
      friend_row.availability_id::text
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hangout_match_notify
AFTER INSERT ON public.hangout_availability
FOR EACH ROW
EXECUTE FUNCTION public.notify_hangout_match();
