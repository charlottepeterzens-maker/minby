REVOKE EXECUTE ON FUNCTION public.can_access_poll(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_poll_open(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_poll(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_poll_open(uuid) TO authenticated, service_role;