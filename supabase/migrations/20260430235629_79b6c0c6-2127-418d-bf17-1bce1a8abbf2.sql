
-- ============================================================
-- profiles: scope admin SELECT/UPDATE to same company; add owner INSERT
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view company profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Admins can update employee profiles" ON public.profiles;
CREATE POLICY "Admins can update company profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
);

-- Owner-scoped INSERT for profiles (so users can create their own row only)
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- user_roles: scope admin policies to same company
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view company roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can create roles" ON public.user_roles;
CREATE POLICY "Admins can create company roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update company roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete company roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

-- ============================================================
-- jobs: scope admin policies to same company
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
CREATE POLICY "Admins can view company jobs"
ON public.jobs FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Admins can create jobs" ON public.jobs;
CREATE POLICY "Admins can create company jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
CREATE POLICY "Admins can update company jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
CREATE POLICY "Admins can delete company jobs"
ON public.jobs FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
);

-- ============================================================
-- employee_job_assignments: scope admin policies (join via profiles)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.employee_job_assignments;
CREATE POLICY "Admins can view company assignments"
ON public.employee_job_assignments FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can create assignments" ON public.employee_job_assignments;
CREATE POLICY "Admins can create company assignments admin"
ON public.employee_job_assignments FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = employee_job_assignments.job_id
      AND j.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update assignments" ON public.employee_job_assignments;
CREATE POLICY "Admins can update company assignments admin"
ON public.employee_job_assignments FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can delete assignments" ON public.employee_job_assignments;
CREATE POLICY "Admins can delete company assignments admin"
ON public.employee_job_assignments FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

-- ============================================================
-- time_entries: scope admin policies (join via profiles)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all time entries" ON public.time_entries;
CREATE POLICY "Admins can view company time entries"
ON public.time_entries FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can create time entries for any employee" ON public.time_entries;
CREATE POLICY "Admins can create time entries for company employees"
ON public.time_entries FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update all time entries" ON public.time_entries;
CREATE POLICY "Admins can update company time entries admin"
ON public.time_entries FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can delete all time entries" ON public.time_entries;
CREATE POLICY "Admins can delete company time entries"
ON public.time_entries FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

-- ============================================================
-- employee_pto_balances: scope admin policies (join via profiles)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all PTO balances" ON public.employee_pto_balances;
CREATE POLICY "Admins can view company PTO balances"
ON public.employee_pto_balances FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_pto_balances.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can create PTO balances" ON public.employee_pto_balances;
CREATE POLICY "Admins can create company PTO balances"
ON public.employee_pto_balances FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_pto_balances.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update PTO balances" ON public.employee_pto_balances;
CREATE POLICY "Admins can update company PTO balances"
ON public.employee_pto_balances FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_pto_balances.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_pto_balances.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can delete PTO balances" ON public.employee_pto_balances;
CREATE POLICY "Admins can delete company PTO balances"
ON public.employee_pto_balances FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_pto_balances.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

-- ============================================================
-- employee_holiday_pay: scope admin policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all holiday pay" ON public.employee_holiday_pay;
CREATE POLICY "Admins can view company holiday pay"
ON public.employee_holiday_pay FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_holiday_pay.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can create holiday pay" ON public.employee_holiday_pay;
CREATE POLICY "Admins can create company holiday pay"
ON public.employee_holiday_pay FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_holiday_pay.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update holiday pay" ON public.employee_holiday_pay;
CREATE POLICY "Admins can update company holiday pay"
ON public.employee_holiday_pay FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_holiday_pay.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_holiday_pay.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can delete holiday pay" ON public.employee_holiday_pay;
CREATE POLICY "Admins can delete company holiday pay"
ON public.employee_holiday_pay FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_holiday_pay.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

-- ============================================================
-- company_weekly_report_settings: scope admin policies to own company
-- (admin_user_id is set to creating admin; scope by that)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view company weekly report settings" ON public.company_weekly_report_settings;
CREATE POLICY "Admins can view own company weekly report settings"
ON public.company_weekly_report_settings FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND admin_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can create company weekly report settings" ON public.company_weekly_report_settings;
CREATE POLICY "Admins can create own company weekly report settings"
ON public.company_weekly_report_settings FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND admin_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can update company weekly report settings" ON public.company_weekly_report_settings;
CREATE POLICY "Admins can update own company weekly report settings"
ON public.company_weekly_report_settings FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND admin_user_id = auth.uid()
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND admin_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can delete company weekly report settings" ON public.company_weekly_report_settings;
CREATE POLICY "Admins can delete own company weekly report settings"
ON public.company_weekly_report_settings FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND admin_user_id = auth.uid()
);

-- ============================================================
-- employee_weekly_report_overrides: scope admin policies to same company
-- ============================================================
DROP POLICY IF EXISTS "Admins can view employee weekly report overrides" ON public.employee_weekly_report_overrides;
CREATE POLICY "Admins can view company employee report overrides"
ON public.employee_weekly_report_overrides FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_weekly_report_overrides.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can create employee weekly report overrides" ON public.employee_weekly_report_overrides;
CREATE POLICY "Admins can create company employee report overrides"
ON public.employee_weekly_report_overrides FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_weekly_report_overrides.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update employee weekly report overrides" ON public.employee_weekly_report_overrides;
CREATE POLICY "Admins can update company employee report overrides"
ON public.employee_weekly_report_overrides FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_weekly_report_overrides.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_weekly_report_overrides.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can delete employee weekly report overrides" ON public.employee_weekly_report_overrides;
CREATE POLICY "Admins can delete company employee report overrides"
ON public.employee_weekly_report_overrides FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_weekly_report_overrides.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

-- ============================================================
-- time_off_requests: replace overly broad admin policies with scoped ones
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Admins can update all time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Admins can delete all time off requests" ON public.time_off_requests;

CREATE POLICY "Admins can delete company time off requests"
ON public.time_off_requests FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    company_id = private.user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = time_off_requests.employee_user_id
        AND p.company_id = private.user_company_id(auth.uid())
    )
  )
);
