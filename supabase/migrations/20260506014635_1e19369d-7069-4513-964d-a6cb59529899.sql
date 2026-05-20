
CREATE TABLE public.time_entry_deletion_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_entry_id uuid NOT NULL,
  employee_user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  job_id uuid,
  work_date date NOT NULL,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  total_minutes integer,
  break_minutes integer,
  deleted_by_user_id uuid NOT NULL,
  deleted_by_email text,
  deleted_by_name text,
  deletion_reason text,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_te_deletion_log_company_deleted_at
  ON public.time_entry_deletion_log (company_id, deleted_at DESC);
CREATE INDEX idx_te_deletion_log_employee_deleted_at
  ON public.time_entry_deletion_log (employee_user_id, deleted_at DESC);

ALTER TABLE public.time_entry_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view deletion log"
  ON public.time_entry_deletion_log
  FOR SELECT
  TO authenticated
  USING (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can insert deletion log"
  ON public.time_entry_deletion_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    deleted_by_user_id = auth.uid()
    AND private.is_company_admin(auth.uid(), company_id)
  );
