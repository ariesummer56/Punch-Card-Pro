import { corsHeaders } from 'npm:@supabase/supabase-js@2.105.1/cors'
import { createClient } from 'npm:@supabase/supabase-js@2.105.1'

const SITE_NAME = 'punchcardpro'
const SENDER_DOMAIN = 'notify.mailletconstruction.com'
const FROM_DOMAIN = 'mailletconstruction.com'

type Body = {
  companyId: string
  completedJobName: string
  completedJobAddress?: string | null
  rescheduledJobName: string
  rescheduledJobAddress?: string | null
  oldStartDate: string | null
  newStartDate: string
  daysSaved: number
}

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Not scheduled'

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Server configuration is missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Authenticate caller (must be a logged-in user)
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (!body.companyId || !body.completedJobName || !body.rescheduledJobName || !body.newStartDate) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Verify caller is an admin of this company
  const { data: isAdmin } = await admin.rpc('is_company_admin', { _user_id: userData.user.id, _company_id: body.companyId })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: company } = await admin
    .from('companies')
    .select('name, admin_alert_email, contact_email')
    .eq('id', body.companyId)
    .maybeSingle()

  const recipientEmail = company?.admin_alert_email || company?.contact_email
  if (!recipientEmail) {
    return new Response(JSON.stringify({ error: 'No admin alert email configured' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const subject = `Job "${body.rescheduledJobName}" pulled forward to ${formatDate(body.newStartDate)}`
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 16px">Schedule update</h2>
      <p>You finished <strong>${escapeHtml(body.completedJobName)}</strong>${body.completedJobAddress ? ` at ${escapeHtml(body.completedJobAddress)}` : ''} <strong>${body.daysSaved} day${body.daysSaved === 1 ? '' : 's'}</strong> ahead of schedule.</p>
      <p>The next job has been pulled forward:</p>
      <table style="border-collapse:collapse;width:100%;margin:12px 0">
        <tr><td style="padding:6px 0;color:#475569">Job</td><td style="padding:6px 0"><strong>${escapeHtml(body.rescheduledJobName)}</strong></td></tr>
        ${body.rescheduledJobAddress ? `<tr><td style="padding:6px 0;color:#475569">Address</td><td style="padding:6px 0">${escapeHtml(body.rescheduledJobAddress)}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#475569">Old start</td><td style="padding:6px 0">${formatDate(body.oldStartDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#475569">New start</td><td style="padding:6px 0"><strong>${formatDate(body.newStartDate)}</strong></td></tr>
      </table>
      <p style="color:#475569;font-size:13px;margin-top:24px">Sent by ${escapeHtml(company?.name ?? SITE_NAME)}.</p>
    </div>`
  const text = `You finished ${body.completedJobName} ${body.daysSaved} day(s) ahead of schedule.\nNext job ${body.rescheduledJobName} moved from ${formatDate(body.oldStartDate)} to ${formatDate(body.newStartDate)}.`

  const messageId = crypto.randomUUID()

  await admin.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'job_rescheduled',
    recipient_email: recipientEmail,
    status: 'pending',
  })

  const { error: enqueueError } = await admin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: 'job_rescheduled',
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    await admin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'job_rescheduled',
      recipient_email: recipientEmail,
      status: 'failed',
      error_message: enqueueError.message,
    })
    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ success: true, recipientEmail }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
