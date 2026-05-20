ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

DELETE FROM public.user_roles ur
USING public.user_roles keep
WHERE ur.user_id = keep.user_id
  AND ur.id <> keep.id
  AND (
    CASE ur.role::text
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      ELSE 3
    END,
    ur.created_at,
    ur.id
  ) > (
    CASE keep.role::text
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      ELSE 3
    END,
    keep.created_at,
    keep.id
  );

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

DROP INDEX IF EXISTS public.idx_user_roles_user_id_unique;
CREATE UNIQUE INDEX idx_user_roles_user_id_unique ON public.user_roles(user_id);

CREATE OR REPLACE FUNCTION public.set_user_role(_target_user_id uuid, _role public.app_role)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _result public.user_roles;
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