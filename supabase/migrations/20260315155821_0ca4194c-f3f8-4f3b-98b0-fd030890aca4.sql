
DO $$
DECLARE
  anna_id uuid := 'a1111111-1111-1111-1111-111111111111';
  sofia_id uuid := 'a2222222-2222-2222-2222-222222222222';
  maria_id uuid := 'a3333333-3333-3333-3333-333333333333';
  karin_id uuid := 'a4444444-4444-4444-4444-444444444444';
  lisa_id uuid := 'a5555555-5555-5555-5555-555555555555';
  anna_section_id uuid := 'b1111111-1111-1111-1111-111111111111';
  karin_section_id uuid := 'b4444444-4444-4444-4444-444444444444';
  lisa_section_id uuid := 'b5555555-5555-5555-5555-555555555555';
  maria_section_id uuid := 'b3333333-3333-3333-3333-333333333333';
BEGIN
  -- Create test users in auth.users (needed for FK constraint on profiles)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    (anna_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anna.svensson@test.minby.se',  crypt('testpass123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (sofia_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sofia.falk@test.minby.se',     crypt('testpass123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (maria_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maria.lindgren@test.minby.se', crypt('testpass123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (karin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'karin.nilsson@test.minby.se',  crypt('testpass123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    (lisa_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lisa.magnusson@test.minby.se', crypt('testpass123', gen_salt('bf')), now(), now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- Profiles (handle_new_user trigger may have already created some)
  INSERT INTO profiles (user_id, display_name, avatar_url) VALUES
    (anna_id, 'Anna Svensson', null),
    (sofia_id, 'Sofia Falk', null),
    (maria_id, 'Maria Lindgren', null),
    (karin_id, 'Karin Nilsson', null),
    (lisa_id, 'Lisa Magnusson', null)
  ON CONFLICT DO NOTHING;

  -- Update display names in case trigger created with email prefix
  UPDATE profiles SET display_name = 'Anna Svensson' WHERE user_id = anna_id;
  UPDATE profiles SET display_name = 'Sofia Falk' WHERE user_id = sofia_id;
  UPDATE profiles SET display_name = 'Maria Lindgren' WHERE user_id = maria_id;
  UPDATE profiles SET display_name = 'Karin Nilsson' WHERE user_id = karin_id;
  UPDATE profiles SET display_name = 'Lisa Magnusson' WHERE user_id = lisa_id;

  -- Life sections
  INSERT INTO life_sections (id, user_id, name, emoji, section_type, min_tier, sort_order) VALUES
    (anna_section_id, anna_id, 'Husbygge', '🏠', 'posts', 'outer', 0),
    (karin_section_id, karin_id, 'Jobb', '💼', 'posts', 'outer', 0),
    (lisa_section_id, lisa_id, 'Familj', '👨‍👩‍👧‍👦', 'posts', 'outer', 0),
    (maria_section_id, maria_id, 'Hälsa', '🌸', 'period', 'outer', 0)
  ON CONFLICT DO NOTHING;

  -- Life posts
  INSERT INTO life_posts (user_id, section_id, content, created_at) VALUES
    (anna_id, anna_section_id, 'Bygglovet godkänt! Grunden gjuts 25 mars.', now() - interval '2 hours'),
    (maria_id, maria_section_id, 'Behöver lite ro och omtanke just nu', now() - interval '5 hours'),
    (karin_id, karin_section_id, 'Fick äntligen det där projektet! Tre månaders jobb som landade rätt.', now() - interval '8 hours'),
    (lisa_id, lisa_section_id, 'Barnen har äntligen skollov nästa vecka, nu planerar vi lite adventures!', now() - interval '12 hours');

  -- Hangout availability for Sofia
  INSERT INTO hangout_availability (user_id, date, activities, custom_note, created_at) VALUES
    (sofia_id, '2026-03-22', ARRAY['Promenad', 'Fika'], 'Ledig hela dagen!', now() - interval '3 hours');

  -- Grant all existing real users 'outer' access to test users
  INSERT INTO friend_access_tiers (owner_id, friend_user_id, tier)
  SELECT t.test_uid, p.user_id, 'outer'::access_tier
  FROM (VALUES (anna_id), (sofia_id), (maria_id), (karin_id), (lisa_id)) AS t(test_uid)
  CROSS JOIN profiles p
  WHERE p.user_id NOT IN (anna_id, sofia_id, maria_id, karin_id, lisa_id)
  ON CONFLICT DO NOTHING;
END;
$$;
