import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TEXTLK_API_TOKEN = Deno.env.get('TEXTLK_API_TOKEN')
const TEXTLK_SENDER_ID = Deno.env.get('TEXTLK_SENDER_ID') || 'TextLKDemo'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cross-Origin-Resource-Policy': 'cross-origin',
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// Normalize phone: ensure it starts with country code (94 for Sri Lanka)
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '')
  if (normalized.startsWith('0')) normalized = '94' + normalized.slice(1)
  if (!normalized.startsWith('94') && normalized.length === 9) normalized = '94' + normalized
  return normalized
}

async function sendSmsToProvider(phone: string, message: string) {
  try {
    const recipient = normalizePhone(phone)
    console.log(`[sendSmsToProvider] Sending OTP to ${recipient} using sender_id: ${TEXTLK_SENDER_ID}`);

    const res = await fetch('https://app.text.lk/api/v3/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEXTLK_API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        recipient,
        sender_id: TEXTLK_SENDER_ID,
        type: 'plain',
        message,
      }),
    })

    const json = await res.json().catch(() => ({}))
    console.log(`[sendSmsToProvider] Text.lk response status: ${res.status}`, JSON.stringify(json));

    const isSuccess = res.ok || json?.status === 'success'
    return { ok: isSuccess, status: res.status, json }
  } catch (err) {
    console.error('[sendSmsToProvider] fetch error:', err);
    return { ok: false, status: 500, json: { message: `Connection to Text.lk failed: ${err.message}` } }
  }
}

serve(async (req) => {
  console.log(`[registration-otp] Received request: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    // ── Auth check ──
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    if (!token) {
      console.warn('[registration-otp] Missing authorization token');
      return jsonRes({ error: 'Unauthorized: missing token' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: { user }, error: uErr } = await supabase.auth.getUser(token)
    if (uErr || !user) {
      console.error('[registration-otp] User auth verification failed:', uErr?.message);
      return jsonRes({ error: 'Invalid or expired token' }, 401)
    }

    // ── Parse body ──
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return jsonRes({ error: 'Invalid JSON body' }, 400)
    }
    const { action, phone, code } = body

    if (!action || (action !== 'send' && action !== 'verify' && action !== 'status')) {
      return jsonRes({ error: "Invalid action. Must be 'send', 'verify', or 'status'" }, 400)
    }

    // ── Fetch SMS settings ──
    let { data: settings } = await supabase
      .from('sms_settings')
      .select('sms_enabled')
      .limit(1)
      .single()

    if (action === 'status') {
      return jsonRes({ sms_enabled: !!settings?.sms_enabled })
    }

    if (action === 'send') {
      if (!phone) {
        return jsonRes({ error: 'Phone number is required to send OTP' }, 400)
      }

      if (!settings?.sms_enabled) {
        console.warn('[registration-otp] SMS notifications are disabled in settings');
        return jsonRes({ error: 'SMS service is currently disabled.' }, 400)
      }

      if (!TEXTLK_API_TOKEN) {
        console.error('[registration-otp] TEXTLK_API_TOKEN is not configured');
        return jsonRes({ error: 'SMS API token is not configured.' }, 500)
      }

      // Generate a 6-digit code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

      // Get or create customer profile
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (custErr) {
        console.error('[registration-otp] Failed to find customer profile:', custErr.message);
        return jsonRes({ error: 'Database error reading profile' }, 500)
      }

      let customerId = customer?.id

      if (!customerId) {
        // Fallback insert if profile doesn't exist
        const { data: newCustomer, error: insertErr } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || 'Customer',
            phone: phone,
            status: 'pending',
            email_otp_verified: true,
            phone_otp_verified: false,
            phone_otp_code: otpCode,
            phone_otp_expires_at: expiresAt
          })
          .select('id')
          .single()

        if (insertErr) {
          console.error('[registration-otp] Failed to insert customer profile:', insertErr.message);
          return jsonRes({ error: 'Database error creating profile' }, 500)
        }
        customerId = newCustomer.id
      } else {
        // Update existing customer profile with OTP
        const { error: updateErr } = await supabase
          .from('customers')
          .update({
            phone: phone,
            phone_otp_code: otpCode,
            phone_otp_expires_at: expiresAt,
            email_otp_verified: true
          })
          .eq('id', customerId)

        if (updateErr) {
          console.error('[registration-otp] Failed to update customer profile with OTP:', updateErr.message);
          return jsonRes({ error: 'Database error updating profile' }, 500)
        }
      }

      // Send SMS
      const message = `Your Nextiom verification code is: ${otpCode}. This code expires in 10 minutes.`
      console.log(`[registration-otp] Sending SMS to ${phone}`);
      const { ok, json: providerRes } = await sendSmsToProvider(phone, message)

      const status = ok ? 'sent' : 'failed'
      const providerRef = providerRes?.data?.uid || providerRes?.uid || null
      const errorMsg = ok ? null : (providerRes?.message || providerRes?.error || 'Provider error')

      // Log in sms_logs
      await supabase.from('sms_logs').insert({
        customer_id: customerId,
        phone,
        message,
        type: 'otp',
        status,
        provider_ref: providerRef,
        error_msg: errorMsg,
      })

      if (!ok) {
        return jsonRes({ error: errorMsg || 'SMS send failed' }, 502)
      }

      return jsonRes({ success: true, message: 'OTP sent successfully' })

    } else if (action === 'verify') {
      if (!code) {
        return jsonRes({ error: 'Verification code is required' }, 400)
      }

      // Get customer profile
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('id, phone_otp_code, phone_otp_expires_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (custErr || !customer) {
        console.error('[registration-otp] Failed to find customer profile for verification:', custErr?.message);
        return jsonRes({ error: 'Customer profile not found' }, 404)
      }

      if (!customer.phone_otp_code) {
        return jsonRes({ error: 'No OTP requested or OTP has expired' }, 400)
      }

      // Check expiry
      const expiresAt = new Date(customer.phone_otp_expires_at).getTime()
      if (Date.now() > expiresAt) {
        return jsonRes({ error: 'OTP has expired. Please request a new one.' }, 400)
      }

      // Check code
      if (customer.phone_otp_code !== code) {
        return jsonRes({ error: 'Invalid verification code' }, 400)
      }

      // Code matches! Update customer status to pending and set phone_otp_verified to true
      const { error: updateErr } = await supabase
        .from('customers')
        .update({
          status: 'pending',
          phone_otp_verified: true,
          email_otp_verified: true,
          phone_otp_code: null,
          phone_otp_expires_at: null
        })
        .eq('id', customer.id)

      if (updateErr) {
        console.error('[registration-otp] Failed to activate/verify customer:', updateErr.message);
        return jsonRes({ error: 'Database error updating verification status' }, 500)
      }

      return jsonRes({ success: true, message: 'Phone number verified successfully. Account is pending admin approval.' })
    }

  } catch (err) {
    console.error('[registration-otp] Fatal error:', err)
    return jsonRes({ error: err.message || 'Internal error' }, 500)
  }
})
