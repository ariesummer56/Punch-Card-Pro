REVOKE ALL ON FUNCTION public.employee_weekly_minutes(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.employee_weekly_minutes(UUID, DATE) FROM anon;
REVOKE ALL ON FUNCTION public.employee_weekly_minutes(UUID, DATE) FROM authenticated;

REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM authenticated;