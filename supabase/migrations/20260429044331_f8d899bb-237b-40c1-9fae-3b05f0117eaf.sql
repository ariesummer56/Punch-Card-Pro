-- Fix private schema function access used by job GPS pin policies and validation triggers
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_company_admin(UUID, UUID) TO authenticated;

-- Make the manager GPS-pin validation trigger execute with owner permissions
-- so it can safely call private role helpers during job updates.
CREATE OR REPLACE FUNCTION public.validate_manager_job_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  IF char_length(COALESCE(NEW.manager_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'Manager notes must be 1000 characters or less';
  END IF;

  IF auth.uid() IS NOT NULL
    AND private.has_role(auth.uid(), 'manager'::public.app_role)
    AND NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF NEW.job_name IS DISTINCT FROM OLD.job_name
      OR NEW.job_description IS DISTINCT FROM OLD.job_description
      OR NEW.address IS DISTINCT FROM OLD.address
      OR NEW.city IS DISTINCT FROM OLD.city
      OR NEW.state IS DISTINCT FROM OLD.state
      OR NEW.country IS DISTINCT FROM OLD.country
      OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Managers can only update GPS pins and manager notes for jobs';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate job policies with explicit authenticated role access for admins/managers.
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Managers can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Managers can update job GPS pins" ON public.jobs;

CREATE POLICY "Admins can view all jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can create jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Managers can view jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'manager'::public.app_role));

CREATE POLICY "Managers can update job GPS pins"
ON public.jobs
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'manager'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'manager'::public.app_role));