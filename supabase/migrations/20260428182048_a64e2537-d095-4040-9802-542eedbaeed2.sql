DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pto_request_type') THEN
    CREATE TYPE public.pto_request_type AS ENUM ('vacation', 'sick', 'holiday', 'day_off');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pto_request_status') THEN
    CREATE TYPE public.pto_request_status AS ENUM ('pending', 'approved', 'denied', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.employee_pto_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL UNIQUE,
  vacation_enabled BOOLEAN NOT NULL DEFAULT false,
  vacation_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  sick_enabled BOOLEAN NOT NULL DEFAULT false,
  sick_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  holiday_enabled BOOLEAN NOT NULL DEFAULT false,
  holiday_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  day_off_enabled BOOLEAN NOT NULL DEFAULT false,
  day_off_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id UUID NOT NULL,
  request_type public.pto_request_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  requested_hours NUMERIC(8,2) NOT NULL,
  note TEXT,
  status public.pto_request_status NOT NULL DEFAULT 'pending',
  admin_response_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_pto_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_pto_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vacation_hours < 0 OR NEW.sick_hours < 0 OR NEW.holiday_hours < 0 OR NEW.day_off_hours < 0 THEN
    RAISE EXCEPTION 'PTO balances cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_time_off_request()
RETURNS TRIGGER AS $$
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

  IF TG_OP = 'UPDATE'
    AND OLD.status <> 'pending'
    AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Only pending requests can change status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.apply_time_off_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status <> 'approved') THEN
    INSERT INTO public.employee_pto_balances (employee_user_id)
    VALUES (NEW.employee_user_id)
    ON CONFLICT (employee_user_id) DO NOTHING;

    IF NEW.request_type = 'vacation' THEN
      UPDATE public.employee_pto_balances
      SET vacation_hours = GREATEST(0, vacation_hours - NEW.requested_hours), updated_at = now()
      WHERE employee_user_id = NEW.employee_user_id;
    ELSIF NEW.request_type = 'sick' THEN
      UPDATE public.employee_pto_balances
      SET sick_hours = GREATEST(0, sick_hours - NEW.requested_hours), updated_at = now()
      WHERE employee_user_id = NEW.employee_user_id;
    ELSIF NEW.request_type = 'holiday' THEN
      UPDATE public.employee_pto_balances
      SET holiday_hours = GREATEST(0, holiday_hours - NEW.requested_hours), updated_at = now()
      WHERE employee_user_id = NEW.employee_user_id;
    ELSIF NEW.request_type = 'day_off' THEN
      UPDATE public.employee_pto_balances
      SET day_off_hours = GREATEST(0, day_off_hours - NEW.requested_hours), updated_at = now()
      WHERE employee_user_id = NEW.employee_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_employee_pto_balances ON public.employee_pto_balances;
CREATE TRIGGER validate_employee_pto_balances
BEFORE INSERT OR UPDATE ON public.employee_pto_balances
FOR EACH ROW EXECUTE FUNCTION public.validate_pto_balance();

DROP TRIGGER IF EXISTS update_employee_pto_balances_updated_at ON public.employee_pto_balances;
CREATE TRIGGER update_employee_pto_balances_updated_at
BEFORE UPDATE ON public.employee_pto_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS validate_time_off_requests ON public.time_off_requests;
CREATE TRIGGER validate_time_off_requests
BEFORE INSERT OR UPDATE ON public.time_off_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_time_off_request();

DROP TRIGGER IF EXISTS update_time_off_requests_updated_at ON public.time_off_requests;
CREATE TRIGGER update_time_off_requests_updated_at
BEFORE UPDATE ON public.time_off_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS apply_time_off_request_approval ON public.time_off_requests;
CREATE TRIGGER apply_time_off_request_approval
AFTER INSERT OR UPDATE ON public.time_off_requests
FOR EACH ROW EXECUTE FUNCTION public.apply_time_off_approval();

DROP POLICY IF EXISTS "Employees can view own PTO balance" ON public.employee_pto_balances;
DROP POLICY IF EXISTS "Admins can view all PTO balances" ON public.employee_pto_balances;
DROP POLICY IF EXISTS "Admins can create PTO balances" ON public.employee_pto_balances;
DROP POLICY IF EXISTS "Admins can update PTO balances" ON public.employee_pto_balances;
DROP POLICY IF EXISTS "Admins can delete PTO balances" ON public.employee_pto_balances;

CREATE POLICY "Employees can view own PTO balance"
ON public.employee_pto_balances
FOR SELECT TO authenticated
USING (employee_user_id = auth.uid());

CREATE POLICY "Admins can view all PTO balances"
ON public.employee_pto_balances
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create PTO balances"
ON public.employee_pto_balances
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update PTO balances"
ON public.employee_pto_balances
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete PTO balances"
ON public.employee_pto_balances
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Employees can view own time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Employees can create own time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Employees can cancel own pending time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Admins can view all time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Admins can update all time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Admins can delete all time off requests" ON public.time_off_requests;

CREATE POLICY "Employees can view own time off requests"
ON public.time_off_requests
FOR SELECT TO authenticated
USING (employee_user_id = auth.uid());

CREATE POLICY "Employees can create own time off requests"
ON public.time_off_requests
FOR INSERT TO authenticated
WITH CHECK (employee_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Employees can cancel own pending time off requests"
ON public.time_off_requests
FOR UPDATE TO authenticated
USING (employee_user_id = auth.uid() AND status = 'pending')
WITH CHECK (employee_user_id = auth.uid() AND status = 'cancelled');

CREATE POLICY "Admins can view all time off requests"
ON public.time_off_requests
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all time off requests"
ON public.time_off_requests
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all time off requests"
ON public.time_off_requests
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_employee_pto_balances_employee ON public.employee_pto_balances(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_employee_status ON public.time_off_requests(employee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status_dates ON public.time_off_requests(status, start_date, end_date);