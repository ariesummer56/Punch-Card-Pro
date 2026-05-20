import { corsHeaders } from 'npm:@supabase/supabase-js@2.105.1/cors'
import { createClient } from 'npm:@supabase/supabase-js@2.105.1'

type TimeOffRequest = {
  id: string
  employee_user_id: string
  company_id: string | null
  request_type: string
  start_date: string
  end_date: string
  requested_hours: number
  note: string | null
  admin_response_note: string | null
  reminder_email_sent_at: string | null
}

const addDaysIso = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const formatDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration is missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const authHeader = req.headers.get('Authorization')
  const automationToken = req.headers.get('x-payroll-automation-token')
  const { data: tokenRow } = await adminClient.from('payroll_automation_tokens').select('token').limit(1).maybeSingle()
  if (authHeader !== `Bearer ${serviceRoleKey}` && (!tokenRow?.token || automationToken !== tokenRow.token)) {
    return new Response(JSON.stringify({ error: 'Automation access required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const reminderDate = addDaysIso(todayIso(), 7)
  const { data: requests, error: requestError } = await adminClient
    .from('time_off_requests')
    .select('id, employee_user_id, company_id, request_type, start_date, end_date, requested_hours, note, admin_response_note, reminder_email_sent_at')
    .eq('status', 'approved')
    .eq('start_date', reminderDate)
    .is('reminder_email_sent_at', null)

  if (requestError) {
    return new Response(JSON.stringify({ error: requestError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const results = []
  for (const request of (requests ?? []) as TimeOffRequest[]) {
    const { data: employee } = await adminClient
      .from('profiles')
      .select('display_name, email, company_id, company_name')
      .eq('user_id', request.employee_user_id)
      .maybeSingle()

    const companyId = request.company_id ?? employee?.company_id
    if (!companyId) {
      results.push({ requestId: request.id, status: 'skipped', reason: 'missing company' })
      continue
    }

    const { data: company } = await adminClient
      .from('companies')
      .select('name, admin_alert_email, contact_email')
      .eq('id', companyId)
      .maybeSingle()

    const recipientEmail = company?.admin_alert_email || company?.contact_email
    if (!recipientEmail) {
      results.push({ requestId: request.id, status: 'skipped', reason: 'missing admin email' })
      continue
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateName: 'pto-reminder',
        recipientEmail,
        idempotencyKey: `pto-reminder-${request.id}-${request.start_date}`,
        templateData: {
          companyName: company?.name ?? employee?.company_name ?? 'Punch Card Pro',
          employeeName: employee?.display_name || employee?.email || 'Employee',
          requestType: request.request_type,
          startDate: formatDate(request.start_date),
          endDate: formatDate(request.end_date),
          requestedHours: Number(request.requested_hours || 0).toFixed(2),
          employeeNote: request.note || 'No employee note',
          adminNote: request.admin_response_note || 'No admin note',
        },
      }),
    })

    if (!response.ok) {
      results.push({ requestId: request.id, status: 'failed', error: await response.text() })
      continue
    }

    await adminClient.from('time_off_requests').update({ reminder_email_sent_at: new Date().toISOString() }).eq('id', request.id)
    results.push({ requestId: request.id, status: 'sent', recipientEmail })
  }

  return new Response(JSON.stringify({ success: true, reminderDate, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
