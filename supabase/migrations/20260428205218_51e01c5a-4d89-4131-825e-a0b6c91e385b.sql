REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM authenticated;