CREATE TRIGGER on_new_group
  AFTER INSERT ON public.friend_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_group();