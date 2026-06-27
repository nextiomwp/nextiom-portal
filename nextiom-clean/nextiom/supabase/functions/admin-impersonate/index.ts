import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create } from 'https://deno.land/x/djwt@v2.9/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET')!

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
      return new Response(JSON.stringify({ error: 'Only admins can perform impersonation' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 2. Parse request body
    const { target_user_id, action, session_id } = await req.json()

    if (action === 'start') {
      if (!target_user_id) {
        return new Response(JSON.stringify({ error: 'target_user_id is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      // 3. Sign short-lived JWT for impersonation session
      const now = Math.floor(Date.now() / 1000)
      const jwt = await create(
        { alg: 'HS256', typ: 'JWT' },
        {
          sub: target_user_id,
          impersonated_by: user.id,
          scope: 'impersonation',
          iat: now,
          exp: now + 3600, // 60 minutes
        },
        JWT_SECRET,
      )

      // 4. Insert audit log
      const { data: log, error: logError } = await supabase
        .from('impersonation_logs')
        .insert({
          admin_id: user.id,
          target_user_id: target_user_id,
          action: 'start',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (logError) {
        console.error('Log insert error:', logError)
        // Continue even if logging fails — the token is still valid
      }

      return new Response(JSON.stringify({
        token: jwt,
        session_id: log?.id || null,
        expires_at: now + 3600,
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    if (action === 'exit' || action?.startsWith('viewed:')) {
      const updateData = {}
      if (action === 'exit') updateData.ended_at = new Date().toISOString()
      updateData.action = action

      const { error: updateError } = await supabase
        .from('impersonation_logs')
        .update(updateData)
        .eq('id', session_id)

      if (updateError) {
        console.error('Log update error:', updateError)
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action. Supported actions: start, exit' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('admin-impersonate error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
