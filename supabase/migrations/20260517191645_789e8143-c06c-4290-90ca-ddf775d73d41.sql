CREATE TABLE public.job_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  company_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NULL,
  note TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, scheduled_date)
);

CREATE INDEX idx_job_schedules_company_date ON public.job_schedules (company_id, scheduled_date);
CREATE INDEX idx_job_schedules_job ON public.job_schedules (job_id);

ALTER TABLE public.job_schedules ENABLE ROW LEVEL SECURITY;

-- Validation trigger: set company_id from job, block archived jobs, enforce note length
CREATE OR REPLACE FUNCTION public.validate_job_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job_company UUID;
  _job_archived TIMESTAMPTZ;
BEGIN
  SELECT company_id, archived_at INTO _job_company, _job_archived
  FROM public.jobs WHERE id = NEW.job_id;

  IF _job_company IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF _job_archived IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot schedule an archived job';
  END IF;

  NEW.company_id := _job_company;

  IF char_length(COALESCE(NEW.note, '')) > 1000 THEN
    RAISE EXCEPTION 'Schedule note must be 1000 characters or less';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_job_schedule
BEFORE INSERT OR UPDATE ON public.job_schedules
FOR EACH ROW EXECUTE FUNCTION public.validate_job_schedule();

CREATE TRIGGER trg_job_schedules_updated_at
BEFORE UPDATE ON public.job_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
CREATE POLICY "Admins can view company schedules"
ON public.job_schedules FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid()));

CREATE POLICY "Managers can view company schedules"
ON public.job_schedules FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'manager'::public.app_role)
  AND company_id = private.user_company_id(auth.uid()));

CREATE POLICY "Employees can view assigned job schedules"
ON public.job_schedules FOR SELECT TO authenticated
USING (private.is_assigned_to_job(auth.uid(), job_id));

CREATE POLICY "Admins can insert company schedules"
ON public.job_schedules FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role)
  AND private.job_company_id(job_id) = private.user_company_id(auth.uid()));

CREATE POLICY "Managers can insert company schedules"
ON public.job_schedules FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'manager'::public.app_role)
  AND private.job_company_id(job_id) = private.user_company_id(auth.uid()));

CREATE POLICY "Admins can update company schedules"
ON public.job_schedules FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid()))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role)
  AND private.job_company_id(job_id) = private.user_company_id(auth.uid()));

CREATE POLICY "Managers can update company schedules"
ON public.job_schedules FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'manager'::public.app_role)
  AND company_id = private.user_company_id(auth.uid()))
WITH CHECK (private.has_role(auth.uid(), 'manager'::public.app_role)
  AND private.job_company_id(job_id) = private.user_company_id(auth.uid()));

CREATE POLICY "Admins can delete company schedules"
ON public.job_schedules FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid()));

CREATE POLICY "Managers can delete company schedules"
ON public.job_schedules FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'manager'::public.app_role)
  AND company_id = private.user_company_id(auth.uid()));