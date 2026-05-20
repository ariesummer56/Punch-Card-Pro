-- The job GPS-pin validation function is only intended to run as a trigger.
-- Revoke direct API execution to satisfy security linter guidance while preserving trigger behavior.
REVOKE ALL ON FUNCTION public.validate_manager_job_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_manager_job_update() FROM anon;
REVOKE ALL ON FUNCTION public.validate_manager_job_update() FROM authenticated;