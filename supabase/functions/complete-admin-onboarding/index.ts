import { corsHeaders } from 'npm:@supabase/supabase-js@2.105.1/cors'
import { createClient } from 'npm:@supabase/supabase-js@2.105.1'
import { z } from 'npm:zod@3.25.76'

const BodySchema = z.object({
  companyName: z.string().trim().min(2).max(140),
  displayName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  emergencyContact: z.string().trim().max(500).optional(),
  contactEmail: z.string().trim().email().max(255).optional(),
  adminAlertEmail: z.string().trim().email().max(255).optional(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration is missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Prevent privilege escalation: only allow this endpoint for users who do not
  // already have a role assigned and are not part of an existing company.
  const { data: existingRole } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('company_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (existingRole && existingRole.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Account is already configured with a different role' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (existingProfile?.company_id) {
    // Allow re-running only if this user already owns the company they belong to
    const { data: ownedCompany } = await adminClient
      .from('companies')
      .select('id')
      .eq('id', existingProfile.company_id)
      .eq('owner_admin_user_id', userData.user.id)
      .maybeSingle()
    if (!ownedCompany) {
      return new Response(JSON.stringify({ error: 'Account is already linked to a company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { companyName, displayName, phone, emergencyContact, contactEmail, adminAlertEmail } = parsed.data
  const fallbackEmail = contactEmail ?? userData.user.email ?? null

  const { data: company, error: companyError } = await adminClient
    .from('companies')
    .upsert({
      name: companyName,
      owner_admin_user_id: userData.user.id,
      contact_email: fallbackEmail,
      contact_phone: phone ?? null,
      admin_alert_email: adminAlertEmail ?? fallbackEmail,
    }, { onConflict: 'owner_admin_user_id' })
    .select('id, name')
    .single()

  if (companyError || !company) {
    return new Response(JSON.stringify({ error: companyError?.message ?? 'Unable to save company' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    user_id: userData.user.id,
    display_name: displayName ?? userData.user.user_metadata?.display_name ?? null,
    email: userData.user.email ?? fallbackEmail,
    phone: phone ?? null,
    emergency_contact: emergencyContact ?? null,
    company_name: company.name,
    company_id: company.id,
    company_role: 'admin',
    admin_alert_email: adminAlertEmail ?? fallbackEmail,
  }, { onConflict: 'user_id' })

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: roleError } = await adminClient.from('user_roles').upsert({
    user_id: userData.user.id,
    role: 'admin',
  }, { onConflict: 'user_id' })

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, companyId: company.id }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
