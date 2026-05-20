ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hire_date DATE;

ALTER TABLE public.employee_pto_balances
ADD COLUMN IF NOT EXISTS pto_accrual_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS pto_accrual_start_date DATE,
ADD COLUMN IF NOT EXISTS pto_accrual_rate_hours_per_paycheck NUMERIC NOT NULL DEFAULT 3.08,
ADD COLUMN IF NOT EXISTS pto_pay_periods_per_year INTEGER NOT NULL DEFAULT 26,
ADD COLUMN IF NOT EXISTS pto_last_accrual_date DATE;

CREATE TABLE IF NOT EXISTS public.employee_holiday_pay (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_hours NUMERIC NOT NULL DEFAULT 8,
  worked_day_before BOOLEAN NOT NULL DEFAULT false,
  worked_day_after BOOLEAN NOT NULL DEFAULT false,
  qualifies BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (employee_user_id, holiday_date)
);

ALTER TABLE public.employee_holiday_pay ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own holiday pay"
ON public.employee_holiday_pay
FOR SELECT
TO authenticated
USING (employee_user_id = auth.uid());

CREATE POLICY "Admins can view all holiday pay"
ON public.employee_holiday_pay
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create holiday pay"
ON public.employee_holiday_pay
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update holiday pay"
ON public.employee_holiday_pay
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete holiday pay"
ON public.employee_holiday_pay
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_employee_holiday_pay_updated_at ON public.employee_holiday_pay;
CREATE TRIGGER update_employee_holiday_pay_updated_at
BEFORE UPDATE ON public.employee_holiday_pay
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();