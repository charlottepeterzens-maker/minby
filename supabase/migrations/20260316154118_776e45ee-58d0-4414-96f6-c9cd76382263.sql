
-- Fix 1: Replace open SELECT policies on hangout tables with friend-scoped access

-- hangout_availability: drop open SELECT, keep owner ALL policy
DROP POLICY IF EXISTS "Anyone can view availability" ON public.hangout_availability;
CREATE POLICY "Friends can view availability"
  ON public.hangout_availability FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friend_access_tiers
      WHERE owner_id = hangout_availability.user_id
        AND friend_user_id = auth.uid()
    )
  );

-- hangout_comments: drop open SELECT
DROP POLICY IF EXISTS "Authenticated can view hangout comments" ON public.hangout_comments;
CREATE POLICY "Friends can view hangout comments"
  ON public.hangout_comments FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM hangout_availability ha
      WHERE ha.id = hangout_comments.availability_id
        AND (
          ha.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM friend_access_tiers
            WHERE owner_id = ha.user_id
              AND friend_user_id = auth.uid()
          )
        )
    )
  );

-- hangout_tagged_friends: drop open SELECT
DROP POLICY IF EXISTS "Authenticated can view tagged friends" ON public.hangout_tagged_friends;
CREATE POLICY "Friends can view tagged friends"
  ON public.hangout_tagged_friends FOR SELECT TO authenticated
  USING (
    auth.uid() = tagged_user_id
    OR auth.uid() = tagged_by
    OR EXISTS (
      SELECT 1 FROM hangout_availability ha
      WHERE ha.id = hangout_tagged_friends.availability_id
        AND (
          ha.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM friend_access_tiers
            WHERE owner_id = ha.user_id
              AND friend_user_id = auth.uid()
          )
        )
    )
  );

-- Fix 2: Delete seeded test users (cascades to profiles and related data)
DELETE FROM auth.users WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333',
  'a4444444-4444-4444-4444-444444444444',
  'a5555555-5555-5555-5555-555555555555'
);

-- Clean up any friend_access_tiers rows referencing test users
DELETE FROM friend_access_tiers WHERE owner_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333',
  'a4444444-4444-4444-4444-444444444444',
  'a5555555-5555-5555-5555-555555555555'
) OR friend_user_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333',
  'a4444444-4444-4444-4444-444444444444',
  'a5555555-5555-5555-5555-555555555555'
);
