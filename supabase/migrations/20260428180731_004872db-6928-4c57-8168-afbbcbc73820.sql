ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS payroll_email TEXT,
  ADD COLUMN IF NOT EXISTS employee_pin TEXT,
  ADD COLUMN IF NOT EXISTS admin_alert_email TEXT;

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  job_description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'US',
  country TEXT NOT NULL DEFAULT 'US',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_user_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in_at TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  clock_out_at TIMESTAMPTZ,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  weekly_report_sent_at TIMESTAMPTZ,
  threshold_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON public.time_entries;
CREATE TRIGGER update_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_employee_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.employee_pin IS NOT NULL AND NEW.employee_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Employee PIN must be exactly four digits';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profiles_employee_pin ON public.profiles;
CREATE TRIGGER validate_profiles_employee_pin
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_employee_pin();

CREATE OR REPLACE FUNCTION public.calculate_time_entry_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.clock_in_at IS NOT NULL AND NEW.clock_out_at IS NOT NULL THEN
    NEW.total_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at)) / 60)::INTEGER - COALESCE(NEW.break_minutes, 0));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calculate_time_entries_total ON public.time_entries;
CREATE TRIGGER calculate_time_entries_total
BEFORE INSERT OR UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.calculate_time_entry_total();

CREATE OR REPLACE FUNCTION public.week_start_for(_date DATE)
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (_date - ((EXTRACT(DOW FROM _date)::INTEGER + 6) % 7))::DATE
$$;

CREATE OR REPLACE FUNCTION public.employee_weekly_minutes(_employee_user_id UUID, _work_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_minutes), 0)::INTEGER
  FROM public.time_entries
  WHERE employee_user_id = _employee_user_id
    AND work_date >= public.week_start_for(_work_date)
    AND work_date < public.week_start_for(_work_date) + 7
$$;

DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Employees can view assigned jobs" ON public.jobs;

CREATE POLICY "Admins can view all jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view assigned jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employee_job_assignments a
    WHERE a.job_id = jobs.id
      AND a.employee_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all assignments" ON public.employee_job_assignments;
DROP POLICY IF EXISTS "Admins can create assignments" ON public.employee_job_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.employee_job_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.employee_job_assignments;
DROP POLICY IF EXISTS "Employees can view own assignments" ON public.employee_job_assignments;

CREATE POLICY "Admins can view all assignments"
ON public.employee_job_assignments
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create assignments"
ON public.employee_job_assignments
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update assignments"
ON public.employee_job_assignments
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assignments"
ON public.employee_job_assignments
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view own assignments"
ON public.employee_job_assignments
FOR SELECT
TO authenticated
USING (employee_user_id = auth.uid());

DROP POLICY IF EXISTS "Employees can view own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Employees can create own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Employees can update own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can update all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can delete all time entries" ON public.time_entries;

CREATE POLICY "Employees can view own time entries"
ON public.time_entries
FOR SELECT
TO authenticated
USING (employee_user_id = auth.uid());

CREATE POLICY "Employees can create own time entries"
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (employee_user_id = auth.uid());

CREATE POLICY "Employees can update own time entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (employee_user_id = auth.uid())
WITH CHECK (employee_user_id = auth.uid());

CREATE POLICY "Admins can view all time entries"
ON public.time_entries
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all time entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all time entries"
ON public.time_entries
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_jobs_address ON public.jobs(address, city, state);
CREATE INDEX IF NOT EXISTS idx_employee_job_assignments_employee ON public.employee_job_assignments(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_employee_job_assignments_job ON public.employee_job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON public.time_entries(employee_user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_weekly_report ON public.time_entries(weekly_report_sent_at, work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_threshold_alert ON public.time_entries(threshold_alert_sent_at, employee_user_id);