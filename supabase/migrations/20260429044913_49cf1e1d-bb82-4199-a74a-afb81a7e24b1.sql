ALTER TABLE public.employee_pto_balances
ALTER COLUMN pto_accrual_rate_hours_per_paycheck SET DEFAULT 1.54,
ALTER COLUMN pto_pay_periods_per_year SET DEFAULT 26;

CREATE OR REPLACE FUNCTION public.pto_accrual_rate_hours_per_paycheck_for_hire_date(
  _hire_date date,
  _pay_periods_per_year integer DEFAULT 26,
  _as_of date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT ROUND(
    public.pto_annual_hours_for_hire_date(_hire_date, _as_of)
    / GREATEST(COALESCE(_pay_periods_per_year, 26), 1),
    2
  )
$$;