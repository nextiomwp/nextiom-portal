import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      })
    }

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
      return new Response(JSON.stringify({ error: 'Only admins can sign out all users' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // List all users and sign out non-admin ones individually
    // so the current admin session is preserved
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const nonAdminUsers = (users || []).filter(u => {
      const r = u.app_metadata?.role || 'customer'
      return r !== 'admin'
    })

    // Revoke all sessions for each non-admin user via GoTrue Admin API
    const results = await Promise.allSettled(
      nonAdminUsers.map(u =>
        fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}/sessions`, {
          method: 'DELETE',
          headers: {
            'apiKey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        })
      )
    )

    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(JSON.stringify({
      success: true,
      totalUsers: users?.length || 0,
      signedOut: nonAdminUsers.length,
      failed,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
