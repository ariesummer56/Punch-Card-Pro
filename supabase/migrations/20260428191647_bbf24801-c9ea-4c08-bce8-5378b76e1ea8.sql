REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM authenticated;
DROP FUNCTION IF EXISTS public.set_user_role(uuid, public.app_role);