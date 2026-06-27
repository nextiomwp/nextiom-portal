import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return json({ error: 'No authorization token provided' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken)
    if (userError || !user) {
      return json({ error: 'Invalid or expired token' }, 401)
    }

    const isAdmin = user.app_metadata?.role === 'admin'
    if (!isAdmin) {
      return json({ error: 'Only admins can open request documents' }, 403)
    }

    const { path, bucket = 'request-documents' } = await req.json()
    if (!path || typeof path !== 'string') {
      return json({ error: 'Path is required' }, 400)
    }

    if (bucket !== 'request-documents' && bucket !== 'invoice-assets') {
      return json({ error: 'Invalid bucket specified' }, 400)
    }

    const normalizedPath = path
      .replace(new RegExp(`^https?:\\/\\/[^/]+\\/storage\\/v1\\/object\\/(?:public|sign)\\/${bucket}\\/`), '')
      .replace(new RegExp(`^${bucket}\\/`), '')
      .replace(/^\/+/, '')

    if (!normalizedPath || normalizedPath.includes('..')) {
      return json({ error: 'Invalid path' }, 400)
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(normalizedPath, 3600)

    if (error || !data?.signedUrl) {
      console.error('admin-document-link signing error:', error)
      return json({ error: 'Failed to generate document link' }, 500)
    }

    return json({ signedUrl: data.signedUrl })
  } catch (err) {
    console.error('admin-document-link error:', err)
    return json({ error: err?.message || 'Internal error' }, 500)
  }
})
