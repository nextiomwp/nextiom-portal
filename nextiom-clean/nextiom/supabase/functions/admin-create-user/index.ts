import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      })
    }

    // 1. Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const role = user.app_metadata?.role
    if (role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 2. Parse request body
    const { email, password, name, phone, company, country, domains } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 3. Create the user via admin API — bypass email confirmation so the
    //    customer can log in immediately with email + password (no OTP).
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const userId = authData.user?.id
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Failed to create auth user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 4. Create the customer profile row and capture its id
    const { data: customerRecord, error: dbError } = await supabase
      .from('customers')
      .insert({
        user_id: userId,
        email,
        name: name || email.split('@')[0],
        phone: phone || null,
        company: company || null,
        country: country || null,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (dbError) {
      // Attempt to clean up auth user if DB insert fails
      await supabase.auth.admin.deleteUser(userId).catch(() => {})
      return new Response(JSON.stringify({ error: `Failed to create customer profile: ${dbError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const customerId = customerRecord?.id

    // 5. Create domain request records if domains were provided
    if (customerId && domains && Array.isArray(domains) && domains.length > 0) {
      const validDomains = domains.filter((d: string) => d.trim())
      if (validDomains.length > 0) {
        const domainRecords = validDomains.map((domainName: string) => ({
          customer_id: customerId,
          domain_name: domainName.trim(),
          status: 'pending',
          created_at: new Date().toISOString(),
        }))

        const { error: domainError } = await supabase
          .from('domain_requests')
          .insert(domainRecords)

        if (domainError) {
          console.error('Failed to insert domain requests:', domainError)
          // Non-fatal — user was already created
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      email,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('admin-create-user error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
