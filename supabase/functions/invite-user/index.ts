import { corsHeaders } from 'npm:@supabase/supabase-js@2.105.1/cors'
import { createClient } from 'npm:@supabase/supabase-js@2.105.1'
import { z } from 'npm:zod@3.25.76'

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(['admin', 'manager', 'employee']).default('employee'),
  phone: z.string().trim().max(40).nullable().optional(),
  emergencyContact: z.string().trim().max(160).nullable().optional(),
  employeePin: z.string().trim().regex(/^\d{4}$/).nullable().optional(),
  jobIds: z.array(z.string().uuid()).max(25).default([]),
  origin: z.string().trim().url().max(255).optional(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration is missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: callerRole, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .in('role', ['admin', 'manager'])
    .maybeSingle()

  if (roleError || !callerRole) {
    return new Response(JSON.stringify({ error: 'Admin or manager access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { email, displayName, role, phone, emergencyContact, employeePin, jobIds, origin } = parsed.data
  const safeOrigin = origin && /^https?:\/\//.test(origin) ? origin.replace(/\/$/, '') : null
  const redirectTo = safeOrigin ? `${safeOrigin}/set-password` : undefined
  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from('profiles')
    .select('company_id, company_name')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (role !== 'employee' && callerRole.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Only admins can invite admins or managers' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (adminProfileError) {
    return new Response(JSON.stringify({ error: adminProfileError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!adminProfile?.company_id) {
    return new Response(JSON.stringify({ error: 'Your company profile is not set up yet' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (jobIds.length) {
    const { data: validJobs, error: jobsError } = await adminClient
      .from('jobs')
      .select('id')
      .eq('company_id', adminProfile.company_id)
      .in('id', jobIds)
    if (jobsError) {
      return new Response(JSON.stringify({ error: jobsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if ((validJobs ?? []).length !== jobIds.length) {
      return new Response(JSON.stringify({ error: 'One or more selected jobs are not available for your company' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  let invitedUserId: string | null = null
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName ?? null },
    redirectTo,
  })

  if (invited?.user) {
    invitedUserId = invited.user.id
  } else {
    const message = inviteError?.message?.toLowerCase() ?? ''
    const alreadyExists = message.includes('already') || message.includes('registered') || message.includes('exists')
    if (!alreadyExists) {
      return new Response(JSON.stringify({ error: inviteError?.message ?? 'Unable to invite user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Look up existing user by email via pagination
    let page = 1
    while (page <= 20 && !invitedUserId) {
      const { data: list, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage: 200 })
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const match = list.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
      if (match) invitedUserId = match.id
      if (!list.users.length || list.users.length < 200) break
      page += 1
    }

    if (!invitedUserId) {
      return new Response(JSON.stringify({ error: 'User already exists but could not be located' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ensure existing user belongs to the same company (or has no company yet)
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('user_id', invitedUserId)
      .maybeSingle()
    if (existingProfile?.company_id && existingProfile.company_id !== adminProfile.company_id) {
      return new Response(JSON.stringify({ error: 'This email is already registered with another company' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const profilePayload = {
    user_id: invitedUserId,
    email,
    display_name: displayName,
    phone: phone ?? null,
    emergency_contact: emergencyContact ?? null,
    employee_pin: employeePin ?? null,
    company_id: adminProfile.company_id,
    company_name: adminProfile.company_name ?? null,
    company_role: role,
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'user_id' })
    .select('user_id, display_name, email, phone, emergency_contact, hire_date, company_id, company_name')
    .single()

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: roleInsertError } = await adminClient.from('user_roles').upsert({
    user_id: invitedUserId,
    role,
  }, { onConflict: 'user_id' })

  if (roleInsertError) {
    return new Response(JSON.stringify({ error: roleInsertError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let assignments = []
  if (jobIds.length) {
    const { data: assignmentData, error: assignmentError } = await adminClient
      .from('employee_job_assignments')
      .upsert(jobIds.map((jobId) => ({ employee_user_id: invitedUserId, job_id: jobId })), { onConflict: 'employee_user_id,job_id' })
      .select('id, employee_user_id, job_id, assignment_note')
    if (assignmentError) {
      return new Response(JSON.stringify({ error: assignmentError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    assignments = assignmentData ?? []
  }

  return new Response(JSON.stringify({ success: true, userId: invitedUserId, profile, role, assignments }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
