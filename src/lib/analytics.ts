/**
 * PunchCard Pro — Analytics Tracker
 * Lightweight event tracking via Google Analytics + Supabase
 * No third-party SDK — keeps bundle small.
 */

import { supabase } from '@/integrations/supabase/client';

type EventName =
  | 'page_view'
  | 'sign_up'
  | 'login'
  | 'login_admin'
  | 'login_manager'
  | 'login_employee'
  | 'demo_request'
  | 'demo_launch'
  | 'clock_in'
  | 'clock_out'
  | 'job_create'
  | 'payroll_approve'
  | 'payroll_email_sent'
  | 'employee_invite'
  | 'subscribe'
  | 'trial_start'
  | 'error'
  | 'unsubscribe';

interface AnalyticsEvent {
  name: EventName;
  properties?: Record<string, any>;
  timestamp: string;
}

// Google Ads conversion tracking
export function trackConversion(label: string, value?: number) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'conversion', {
      send_to: `AW-1025771186/${label}`,
      value: value,
      currency: 'USD',
    });
  }
}

export function track(event: EventName, properties?: Record<string, any>) {
  const evt: AnalyticsEvent = {
    name: event,
    properties,
    timestamp: new Date().toISOString(),
  };

  // Google Analytics event
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, properties || {});
  }

  // Supabase sync (fire and forget)
  syncToSupabase(evt).catch(() => {});

  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${event}`, properties || '');
  }
}

async function syncToSupabase(evt: AnalyticsEvent) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('analytics_events').insert({
      user_id: session.user.id,
      event_name: evt.name,
      properties: evt.properties,
      created_at: evt.timestamp,
    });
  } catch {
    // Analytics is non-critical — silent fail
  }
}
