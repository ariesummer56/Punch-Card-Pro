CREATE OR REPLACE FUNCTION public.prevent_last_admin_role_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _admin_count INTEGER;
  _message TEXT := 'At least one admin must exist in the system at all times. A new admin must be assigned before the current one can be removed or changed.';
BEGIN
  IF TG_OP = 'DELETE' AND OLD.role = 'admin'::public.app_role THEN
    SELECT COUNT(*) INTO _admin_count
    FROM public.user_roles
    WHERE role = 'admin'::public.app_role;

    IF _admin_count <= 1 THEN
      RAISE EXCEPTION '%', _message;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.role = 'admin'::public.app_role
    AND NEW.role <> 'admin'::public.app_role THEN
    SELECT COUNT(*) INTO _admin_count
    FROM public.user_roles
    WHERE role = 'admin'::public.app_role;

    IF _admin_count <= 1 THEN
      RAISE EXCEPTION '%', _message;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_admin_role_removal_trigger ON public.user_roles;
CREATE TRIGGER prevent_last_admin_role_removal_trigger
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_admin_role_removal();

CREATE OR REPLACE FUNCTION public.set_user_role(_target_user_id uuid, _role public.app_role)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _result public.user_roles;
  _current_role public.app_role;
  _admin_count INTEGER;
  _message TEXT := 'At least one admin must exist in the system at all times. A new admin must be assigned before the current one can be removed or changed.';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  SELECT role INTO _current_role
  FROM public.user_roles
  WHERE user_id = _target_user_id
  LIMIT 1;

  IF _current_role = 'admin'::public.app_role AND _role <> 'admin'::public.app_role THEN
    SELECT COUNT(*) INTO _admin_count
    FROM public.user_roles
    WHERE role = 'admin'::public.app_role;

    IF _admin_count <= 1 THEN
      RAISE EXCEPTION '%', _message;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role
  RETURNING * INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;