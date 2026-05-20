REVOKE ALL ON FUNCTION public.assign_new_job_to_company_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_new_job_to_company_users() FROM anon;
REVOKE ALL ON FUNCTION public.assign_new_job_to_company_users() FROM authenticated;

REVOKE ALL ON FUNCTION public.validate_time_entry_job_assignment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_time_entry_job_assignment() FROM anon;
REVOKE ALL ON FUNCTION public.validate_time_entry_job_assignment() FROM authenticated;