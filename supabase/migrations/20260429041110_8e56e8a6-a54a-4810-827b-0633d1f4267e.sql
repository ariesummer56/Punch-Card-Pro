ALTER TABLE public.time_off_requests
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMP WITH TIME ZONE;

UPDATE public.time_off_requests tor
SET company_id = p.company_id
FROM public.profiles p
WHERE tor.employee_user_id = p.user_id
  AND tor.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_off_requests_company_status_dates
ON public.time_off_requests(company_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_reminders
ON public.time_off_requests(status, start_date, reminder_email_sent_at)
WHERE status = 'approved';

CREATE OR REPLACE FUNCTION public.pto_annual_hours_for_hire_date(_hire_date date, _as_of date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _hire_date IS NULL OR _as_of < (_hire_date + INTERVAL '1 year')::date THEN 0::numeric
    WHEN _as_of >= (_hire_date + INTERVAL '5 years')::date THEN 120::numeric
    WHEN _as_of >= (_hire_date + INTERVAL '3 years')::date THEN 80::numeric
    ELSE 40::numeric
  END
$$;

CREATE OR REPLACE FUNCTION public.pto_accrued_hours_for_hire_date(_hire_date date, _pay_periods_per_year integer DEFAULT 26, _as_of date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _tier_hours numeric;
  _anniversary date;
  _next_anniversary date;
  _days_in_year numeric;
  _days_elapsed numeric;
  _pay_periods_elapsed integer;
  _safe_pay_periods integer := GREATEST(COALESCE(_pay_periods_per_year, 26), 1);
BEGIN
  _tier_hours := public.pto_annual_hours_for_hire_date(_hire_date, _as_of);
  IF _hire_date IS NULL OR _tier_hours <= 0 THEN
    RETURN 0;
  END IF;

  _anniversary := make_date(EXTRACT(YEAR FROM _as_of)::int, EXTRACT(MONTH FROM _hire_date)::int, LEAST(EXTRACT(DAY FROM _hire_date)::int, EXTRACT(DAY FROM (date_trunc('month', make_date(EXTRACT(YEAR FROM _as_of)::int, EXTRACT(MONTH FROM _hire_date)::int, 1)) + INTERVAL '1 month - 1 day'))::int));
  IF _anniversary > _as_of THEN
    _anniversary := (_anniversary - INTERVAL '1 year')::date;
  END IF;
  _next_anniversary := (_anniversary + INTERVAL '1 year')::date;
  _days_in_year := GREATEST((_next_anniversary - _anniversary)::numeric, 1);
  _days_elapsed := GREATEST((_as_of - _anniversary)::numeric, 0);
  _pay_periods_elapsed := LEAST(_safe_pay_periods, FLOOR((_days_elapsed / _days_in_year) * _safe_pay_periods)::integer + 1);

  RETURN ROUND((_tier_hours / _safe_pay_periods) * _pay_periods_elapsed, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_time_off_request()
RETURNS TRIGGER AS $$
DECLARE
  _balance public.employee_pto_balances;
  _profile public.profiles;
  _available numeric;
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'End date cannot be before start date';
  END IF;

  IF NEW.requested_hours <= 0 THEN
    RAISE EXCEPTION 'Requested hours must be greater than zero';
  END IF;

  IF char_length(COALESCE(NEW.note, '')) > 1000 THEN
    RAISE EXCEPTION 'Request note is too long';
  END IF;

  IF char_length(COALESCE(NEW.admin_response_note, '')) > 1000 THEN
    RAISE EXCEPTION 'Admin response note is too long';
  END IF;

  SELECT * INTO _profile
  FROM public.profiles
  WHERE user_id = NEW.employee_user_id
  LIMIT 1;

  IF NEW.company_id IS NULL THEN
    NEW.company_id := _profile.company_id;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status <> 'pending'
    AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Only pending requests can change status';
  END IF;

  IF NEW.request_type = 'vacation' AND NEW.status IN ('pending', 'approved') THEN
    IF _profile.hire_date IS NULL OR public.pto_annual_hours_for_hire_date(_profile.hire_date, CURRENT_DATE) <= 0 THEN
      RAISE EXCEPTION 'Vacation PTO is not available until one year of employment';
    END IF;
  END IF;

  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status <> 'approved') THEN
    SELECT * INTO _balance
    FROM public.employee_pto_balances
    WHERE employee_user_id = NEW.employee_user_id
    LIMIT 1;

    IF NEW.request_type = 'vacation' THEN
      _available := COALESCE(_balance.vacation_hours, 0);
    ELSIF NEW.request_type = 'sick' THEN
      _available := COALESCE(_balance.sick_hours, 0);
    ELSIF NEW.request_type = 'holiday' THEN
      _available := COALESCE(_balance.holiday_hours, 0);
    ELSE
      _available := COALESCE(_balance.day_off_hours, 0);
    END IF;

    IF _available < NEW.requested_hours THEN
      RAISE EXCEPTION 'Insufficient PTO balance for approval';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP POLICY IF EXISTS "Managers can view company PTO balances" ON public.employee_pto_balances;
CREATE POLICY "Managers can view company PTO balances"
ON public.employee_pto_balances
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_pto_balances.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can view company time off requests" ON public.time_off_requests;
CREATE POLICY "Managers can view company time off requests"
ON public.time_off_requests
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::app_role)
  AND (
    company_id = private.user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = time_off_requests.employee_user_id
        AND p.company_id = private.user_company_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Admins can view company time off requests" ON public.time_off_requests;
CREATE POLICY "Admins can view company time off requests"
ON public.time_off_requests
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND (
    company_id = private.user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = time_off_requests.employee_user_id
        AND p.company_id = private.user_company_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Admins can update company time off requests" ON public.time_off_requests;
CREATE POLICY "Admins can update company time off requests"
ON public.time_off_requests
FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND (
    company_id = private.user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = time_off_requests.employee_user_id
        AND p.company_id = private.user_company_id(auth.uid())
    )
  )
)
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));