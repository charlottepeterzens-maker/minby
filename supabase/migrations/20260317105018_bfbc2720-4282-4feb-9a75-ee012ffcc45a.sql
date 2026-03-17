
DROP POLICY "Authenticated can create notifications" ON public.notifications;

CREATE POLICY "Authenticated can create notifications for friends"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND from_user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM friend_access_tiers
      WHERE owner_id = user_id AND friend_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM friend_requests
      WHERE (
        (from_user_id = auth.uid() AND to_user_id = notifications.user_id)
        OR (to_user_id = auth.uid() AND from_user_id = notifications.user_id)
      )
      AND status = 'pending'
    )
  )
);
