CREATE TABLE public.company_payroll_email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  week_start_day INTEGER NOT NULL DEFAULT 1,
  week_end_day INTEGER NOT NULL DEFAULT 0,
  include_employee_names BOOLEAN NOT NULL DEFAULT true,
  include_hours_worked BOOLEAN NOT NULL DEFAULT true,
  include_jobs_assigned BOOLEAN NOT NULL DEFAULT true,
  include_pto_used BOOLEAN NOT NULL DEFAULT true,
  include_holiday_pay BOOLEAN NOT NULL DEFAULT true,
  include_work_locations BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_period_start DATE,
  last_sent_period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT company_payroll_email_settings_company_unique UNIQUE (company_id),
  CONSTRAINT company_payroll_email_settings_frequency_check CHECK (frequency IN ('weekly', 'biweekly')),
  CONSTRAINT company_payroll_email_settings_start_day_check CHECK (week_start_day BETWEEN 0 AND 6),
  CONSTRAINT company_payroll_email_settings_end_day_check CHECK (week_end_day BETWEEN 0 AND 6),
  CONSTRAINT company_payroll_email_settings_recipient_check CHECK (recipient_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE TABLE public.payroll_email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  settings_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  frequency TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  row_count INTEGER NOT NULL DEFAULT 0,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT payroll_email_send_log_unique_period UNIQUE (settings_id, period_start, period_end),
  CONSTRAINT payroll_email_send_log_frequency_check CHECK (frequency IN ('weekly', 'biweekly')),
  CONSTRAINT payroll_email_send_log_status_check CHECK (status IN ('pending', 'sent', 'failed', 'skipped'))
);

CREATE INDEX idx_company_payroll_email_settings_company ON public.company_payroll_email_settings(company_id);
CREATE INDEX idx_payroll_email_send_log_company ON public.payroll_email_send_log(company_id);
CREATE INDEX idx_payroll_email_send_log_period ON public.payroll_email_send_log(period_start, period_end);

ALTER TABLE public.company_payroll_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view payroll email settings"
ON public.company_payroll_email_settings
FOR SELECT
TO authenticated
USING (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can create payroll email settings"
ON public.company_payroll_email_settings
FOR INSERT
TO authenticated
WITH CHECK (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update payroll email settings"
ON public.company_payroll_email_settings
FOR UPDATE
TO authenticated
USING (private.is_company_admin(auth.uid(), company_id))
WITH CHECK (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete payroll email settings"
ON public.company_payroll_email_settings
FOR DELETE
TO authenticated
USING (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can view payroll email logs"
ON public.payroll_email_send_log
FOR SELECT
TO authenticated
USING (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can create payroll email logs"
ON public.payroll_email_send_log
FOR INSERT
TO authenticated
WITH CHECK (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update payroll email logs"
ON public.payroll_email_send_log
FOR UPDATE
TO authenticated
USING (private.is_company_admin(auth.uid(), company_id))
WITH CHECK (private.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER update_company_payroll_email_settings_updated_at
BEFORE UPDATE ON public.company_payroll_email_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();