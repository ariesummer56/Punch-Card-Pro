CREATE TABLE IF NOT EXISTS public.company_weekly_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL UNIQUE,
  include_contact_info BOOLEAN NOT NULL DEFAULT true,
  include_time_totals BOOLEAN NOT NULL DEFAULT true,
  include_work_locations BOOLEAN NOT NULL DEFAULT true,
  include_pto_balances BOOLEAN NOT NULL DEFAULT true,
  include_time_off_requests BOOLEAN NOT NULL DEFAULT true,
  include_threshold_status BOOLEAN NOT NULL DEFAULT true,
  include_payroll_email BOOLEAN NOT NULL DEFAULT true,
  include_emergency_contact BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_weekly_report_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL UNIQUE,
  include_contact_info BOOLEAN,
  include_time_totals BOOLEAN,
  include_work_locations BOOLEAN,
  include_pto_balances BOOLEAN,
  include_time_off_requests BOOLEAN,
  include_threshold_status BOOLEAN,
  include_payroll_email BOOLEAN,
  include_emergency_contact BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_weekly_report_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_weekly_report_overrides ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_company_weekly_report_settings_updated_at ON public.company_weekly_report_settings;
CREATE TRIGGER update_company_weekly_report_settings_updated_at
BEFORE UPDATE ON public.company_weekly_report_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_weekly_report_overrides_updated_at ON public.employee_weekly_report_overrides;
CREATE TRIGGER update_employee_weekly_report_overrides_updated_at
BEFORE UPDATE ON public.employee_weekly_report_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Admins can view company weekly report settings" ON public.company_weekly_report_settings;
DROP POLICY IF EXISTS "Admins can create company weekly report settings" ON public.company_weekly_report_settings;
DROP POLICY IF EXISTS "Admins can update company weekly report settings" ON public.company_weekly_report_settings;
DROP POLICY IF EXISTS "Admins can delete company weekly report settings" ON public.company_weekly_report_settings;

CREATE POLICY "Admins can view company weekly report settings"
ON public.company_weekly_report_settings
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create company weekly report settings"
ON public.company_weekly_report_settings
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company weekly report settings"
ON public.company_weekly_report_settings
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company weekly report settings"
ON public.company_weekly_report_settings
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view employee weekly report overrides" ON public.employee_weekly_report_overrides;
DROP POLICY IF EXISTS "Admins can create employee weekly report overrides" ON public.employee_weekly_report_overrides;
DROP POLICY IF EXISTS "Admins can update employee weekly report overrides" ON public.employee_weekly_report_overrides;
DROP POLICY IF EXISTS "Admins can delete employee weekly report overrides" ON public.employee_weekly_report_overrides;

CREATE POLICY "Admins can view employee weekly report overrides"
ON public.employee_weekly_report_overrides
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create employee weekly report overrides"
ON public.employee_weekly_report_overrides
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update employee weekly report overrides"
ON public.employee_weekly_report_overrides
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete employee weekly report overrides"
ON public.employee_weekly_report_overrides
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_company_weekly_report_settings_admin ON public.company_weekly_report_settings(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_employee_weekly_report_overrides_employee ON public.employee_weekly_report_overrides(employee_user_id);