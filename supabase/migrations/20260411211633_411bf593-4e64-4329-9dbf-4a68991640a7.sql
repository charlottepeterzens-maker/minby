-- Allow invited users to create pre-accepted friend requests
CREATE POLICY "Invited user can create accepted friendship"
ON public.friend_requests
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'accepted'
  AND to_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM invite_links
    WHERE created_by = friend_requests.from_user_id
      AND (used_by = auth.uid() OR used_by IS NULL)
      AND expires_at > now()
  )
);