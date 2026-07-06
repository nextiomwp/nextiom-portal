import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from "npm:nodemailer"

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

    // Ensure user is admin
    const isAdmin = user.app_metadata?.role === 'admin'
    if (!isAdmin) {
      return json({ error: 'Only administrators can send custom emails' }, 403)
    }

    const { to, subject, body } = await req.json()
    if (!to || !subject || !body) {
      return json({ error: 'to, subject, and body are required' }, 400)
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SMTP_HOST = Deno.env.get('SMTP_HOST')

    if (RESEND_API_KEY) {
      console.log(`[send-email] Attempting to send email via Resend API to ${to}`)
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: Deno.env.get('EMAIL_FROM') || 'Nextiom Portal <noreply@nextiom.com>',
          to,
          subject,
          html: body.replace(/\n/g, '<br />'),
        }),
      })

      const resJson = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('[send-email] Resend API error:', resJson)
        return json({ error: 'Failed to send via Resend', details: resJson }, 500)
      }
      return json({ success: true, provider: 'resend', messageId: resJson.id })
    } else if (SMTP_HOST) {
      console.log(`[send-email] Attempting to send email via SMTP (${SMTP_HOST}) to ${to}`)
      
      const port = parseInt(Deno.env.get('SMTP_PORT') || '465')
      const username = Deno.env.get('SMTP_USER') || ''
      const password = Deno.env.get('SMTP_PASS') || ''
      const sender = Deno.env.get('SMTP_SENDER') || username || 'noreply@nextiom.com'

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: username,
          pass: password,
        },
      })

      await transporter.sendMail({
        from: sender,
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br />'),
      })

      return json({ success: true, provider: 'smtp' })
    } else {
      console.warn('[send-email] No email service provider secrets configured.')
      return json({ 
        error: 'No email service provider configured.', 
        details: 'Please configure either RESEND_API_KEY or SMTP_HOST environment secrets.'
      }, 500)
    }
  } catch (err) {
    console.error('[send-email] error:', err)
    return json({ error: err?.message || 'Internal error' }, 500)
  }
})
