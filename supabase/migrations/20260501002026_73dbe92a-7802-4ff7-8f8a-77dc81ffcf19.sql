REVOKE EXECUTE ON FUNCTION public.assign_user_to_all_company_jobs(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_user_jobs_on_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_user_jobs_on_company_change() FROM PUBLIC, anon, authenticated;