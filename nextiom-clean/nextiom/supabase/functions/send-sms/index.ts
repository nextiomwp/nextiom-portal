import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ── Text.lk credentials — stored as Supabase Secrets, NEVER hardcoded.
// Set once via CLI:  supabase secrets set TEXTLK_API_TOKEN=your_bearer_token
//                   supabase secrets set TEXTLK_SENDER_ID=TextLKDemo
const TEXTLK_API_TOKEN = Deno.env.get('TEXTLK_API_TOKEN')
// Use TextLKDemo as default since Nextiom sender ID is still in PROCESSING state
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

// ── Send one SMS via Text.lk v3 API ──────────────────────────────────────────
async function sendSmsToProvider(phone: string, message: string) {
  try {
    // Normalise phone: ensure it starts with country code (94 for Sri Lanka)
    let normalised = phone.replace(/\D/g, '')
    if (normalised.startsWith('0')) normalised = '94' + normalised.slice(1)
    if (!normalised.startsWith('94') && normalised.length === 9) normalised = '94' + normalised

    console.log(`[sendSmsToProvider] Sending to ${normalised} using sender_id: ${TEXTLK_SENDER_ID}`);

    const res = await fetch('https://app.text.lk/api/v3/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEXTLK_API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        recipient: normalised,
        sender_id: TEXTLK_SENDER_ID,
        type: 'plain',
        message,
      }),
    })

    const json = await res.json().catch(() => ({}))
    console.log(`[sendSmsToProvider] Text.lk response status: ${res.status}`, JSON.stringify(json));

    // Text.lk returns {"status":"success"} even when HTTP status may vary
    const isSuccess = res.ok || json?.status === 'success'
    return { ok: isSuccess, status: res.status, json }
  } catch (err) {
    console.error('[sendSmsToProvider] fetch error:', err);
    return { ok: false, status: 500, json: { message: `Connection to Text.lk failed: ${err.message}` } }
  }
}

serve(async (req) => {
  console.log(`[send-sms] Received request: ${req.method}`);

  // Always handle CORS preflight first — before any auth checks
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    // ── Auth check — admin only ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    if (!token) {
      console.warn('[send-sms] Missing authorization token');
      return jsonRes({ error: 'Unauthorized: missing token' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: { user }, error: uErr } = await supabase.auth.getUser(token)
    if (uErr || !user) {
      console.error('[send-sms] User auth verification failed:', uErr?.message);
      return jsonRes({ error: 'Invalid or expired token' }, 401)
    }
    if (user.app_metadata?.role !== 'admin') {
      console.warn(`[send-sms] Unauthorized role access attempt: ${user.app_metadata?.role}`);
      return jsonRes({ error: 'Admins only' }, 403)
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return jsonRes({ error: 'Invalid JSON body' }, 400)
    }
    const { phone, message, type = 'manual', customerId } = body

    if (!phone || !message) {
      console.warn('[send-sms] Validation failed: missing phone or message');
      return jsonRes({ error: 'phone and message are required' }, 400)
    }

    // ── Guard: ensure secret is configured ──────────────────────────────────
    if (!TEXTLK_API_TOKEN) {
      console.error('[send-sms] TEXTLK_API_TOKEN is not configured in Supabase Secrets');
      return jsonRes({
        error: 'SMS API token is not configured. Run: supabase secrets set TEXTLK_API_TOKEN=your_token --project-ref fewhvlsqkbsmqbrqclya'
      }, 500)
    }

    // ── Check master SMS switch from DB settings ───────────────────────────────
    let { data: settings, error: settingsError } = await supabase
      .from('sms_settings')
      .select('sms_enabled, sender_id')
      .limit(1)
      .single()

    // If settings row is missing, insert a default one
    if (settingsError || !settings) {
      console.log('[send-sms] sms_settings row not found. Creating default row...');
      const { data: newSettings, error: insertErr } = await supabase
        .from('sms_settings')
        .insert({
          sms_enabled: true, // Enable by default to allow first test
          login_otp: false,
          always_otp: false,
          renewal_reminder: true,
          purchase_sms: true,
          reminder_days: 3,
          sender_id: 'TextLKDemo'
        })
        .select('sms_enabled, sender_id')
        .single()
      
      if (!insertErr && newSettings) {
        settings = newSettings
      } else {
        console.error('[send-sms] Failed to auto-insert default sms_settings:', insertErr?.message);
      }
    }

    if (!settings?.sms_enabled) {
      console.warn('[send-sms] SMS notifications are disabled in settings');
      return jsonRes({ error: 'SMS notifications are disabled. Enable SMS in the SMS Settings page first.' }, 400)
    }

    // ── Send SMS ──────────────────────────────────────────────────────────────
    console.log(`[send-sms] Dispatching SMS to ${phone}`);
    const { ok, json: providerRes } = await sendSmsToProvider(phone, message)

    const status = ok ? 'sent' : 'failed'
    const providerRef = providerRes?.data?.uid || providerRes?.uid || null
    const errorMsg = ok ? null : (providerRes?.message || providerRes?.error || 'Provider error')

    // ── Log ───────────────────────────────────────────────────────────────────
    console.log(`[send-sms] Logging SMS activity to DB with status: ${status}`);
    const { error: logErr } = await supabase.from('sms_logs').insert({
      customer_id: customerId || null,
      phone,
      message,
      type,
      status,
      provider_ref: providerRef,
      error_msg: errorMsg,
    })

    if (logErr) {
      console.error('[send-sms] Failed to write audit log to sms_logs:', logErr?.message);
    }

    if (!ok) {
      console.error('[send-sms] Provider dispatch failed:', errorMsg, JSON.stringify(providerRes));
      return jsonRes({ error: errorMsg || 'SMS send failed', provider: providerRes }, 502)
    }

    console.log('[send-sms] SMS sent successfully. Reference ID:', providerRef);
    return jsonRes({ success: true, provider_ref: providerRef, delivered_to: phone })
  } catch (err) {
    console.error('[send-sms] Fatal error:', err)
    return jsonRes({ error: err.message || 'Internal error' }, 500)
  }
})
