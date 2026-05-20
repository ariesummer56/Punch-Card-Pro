
CREATE TABLE public.company_activity_report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly','biweekly')),
  recipients TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_sent_period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_activity_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins view activity report settings"
  ON public.company_activity_report_settings FOR SELECT TO authenticated
  USING (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins insert activity report settings"
  ON public.company_activity_report_settings FOR INSERT TO authenticated
  WITH CHECK (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins update activity report settings"
  ON public.company_activity_report_settings FOR UPDATE TO authenticated
  USING (private.is_company_admin(auth.uid(), company_id))
  WITH CHECK (private.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins delete activity report settings"
  ON public.company_activity_report_settings FOR DELETE TO authenticated
  USING (private.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER set_activity_report_settings_updated_at
  BEFORE UPDATE ON public.company_activity_report_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.activity_report_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_report_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins view activity report log"
  ON public.activity_report_send_log FOR SELECT TO authenticated
  USING (private.is_company_admin(auth.uid(), company_id));

CREATE INDEX idx_activity_report_log_company ON public.activity_report_send_log (company_id, created_at DESC);
