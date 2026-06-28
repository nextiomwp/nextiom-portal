import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ── Text.lk credentials — stored as Supabase Secrets, NEVER hardcoded.
// Set once via CLI:  supabase secrets set TEXTLK_API_TOKEN=your_bearer_token
//                   supabase secrets set TEXTLK_SENDER_ID=Nextiom
const TEXTLK_API_TOKEN = Deno.env.get('TEXTLK_API_TOKEN')
// Use TextLKDemo as default since Nextiom sender ID is still in PROCESSING state
const TEXTLK_SENDER_ID = Deno.env.get('TEXTLK_SENDER_ID') || 'TextLKDemo'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

async function sendSmsToProvider(phone: string, message: string) {
  try {
    let normalised = phone.replace(/\D/g, '')
    if (normalised.startsWith('0')) normalised = '94' + normalised.slice(1)
    if (!normalised.startsWith('94') && normalised.length === 9) normalised = '94' + normalised

    console.log(`[sendSmsToProvider] Sending reminder to ${normalised}`);

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
    console.log(`[sendSmsToProvider] Text.lk response status: ${res.status}`, json);
    return { ok: res.ok, json }
  } catch (err) {
    console.error('[sendSmsToProvider] fetch error:', err);
    return { ok: false, json: { message: `Connection to Text.lk failed: ${err.message}` } }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    // ── Parse body early to get force flag ─────────────────────────────────────
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // empty body is fine
    }
    const forceRun = body?.force === true

    // ── Auth (admin only) ─────────────────────────────────────────────────────
    // ── Auth (admin or service role) ──────────────────────────────────────────
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return jsonRes({ error: 'Unauthorized' }, 401)

    let authorized = false
    if (token === SUPABASE_SERVICE_ROLE_KEY) {
      authorized = true
      console.log('[renewal-sms-reminders] Authenticated via service role key');
    } else {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
      const { data: { user }, error: uErr } = await supabase.auth.getUser(token)
      if (!uErr && user && user.app_metadata?.role === 'admin') {
        authorized = true
        console.log(`[renewal-sms-reminders] Authenticated via admin user: ${user.email}`);
      }
    }

    if (!authorized) return jsonRes({ error: 'Unauthorized access' }, 403)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // ── Guard: ensure secret is configured ──────────────────────────────────
    if (!TEXTLK_API_TOKEN) {
      return jsonRes({ error: 'TEXTLK_API_TOKEN secret is not configured. Run: supabase secrets set TEXTLK_API_TOKEN=your_token' }, 500)
    }

    // ── Load SMS settings (master switch + reminder days) ─────────────────────
    let { data: settings, error: settingsError } = await supabase
      .from('sms_settings')
      .select('sms_enabled, renewal_reminder, reminder_days')
      .limit(1)
      .single()

    // If settings row is missing, insert default one
    if (settingsError || !settings) {
      console.log('[renewal-sms-reminders] sms_settings row not found. Creating default row...');
      const { data: newSettings, error: insertErr } = await supabase
        .from('sms_settings')
        .insert({
          sms_enabled: false,
          login_otp: false,
          always_otp: false,
          renewal_reminder: true,
          purchase_sms: true,
          reminder_days: 3,
          sender_id: 'TextLKDemo'
        })
        .select('sms_enabled, renewal_reminder, reminder_days')
        .single()
      
      if (!insertErr && newSettings) {
        settings = newSettings
      } else {
        console.error('[renewal-sms-reminders] Failed to auto-insert default sms_settings:', insertErr);
      }
    }

    if (!settings?.sms_enabled) return jsonRes({ skipped: true, reason: 'SMS disabled in settings' })
    if (!settings?.renewal_reminder) return jsonRes({ skipped: true, reason: 'Renewal reminders disabled in settings' })

    const reminderDays = settings.reminder_days ?? 3
    console.log(`[renewal-sms-reminders] reminderDays=${reminderDays}, forceRun=${forceRun}`);

    // Use a clean UTC "today" baseline for consistent comparison
    const nowUtc = new Date()
    const todayMs = Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate())

    // ── Fetch active domains ──────────────────────────────────────────────────
    const { data: domains } = await supabase
      .from('domain_requests')
      .select('id, customer_id, domain_name, expiry_date, customers(name, phone)')
      .eq('status', 'Active')
      .not('expiry_date', 'is', null)

    // ── Fetch active hosting packages ─────────────────────────────────────────
    const { data: hostings } = await supabase
      .from('hosting_requests')
      .select('id, customer_id, plan_name, expiry_date, customers(name, phone)')
      .in('status', ['approved', 'active', 'completed'])
      .not('expiry_date', 'is', null)

    // ── Fetch active email accounts ───────────────────────────────────────────
    const { data: emails } = await supabase
      .from('email_requests')
      .select('id, customer_id, email, expiry_date, customers(name, phone)')
      .in('status', ['approved', 'active', 'completed'])
      .not('expiry_date', 'is', null)

    // ── Fetch active product licenses (yearly/monthly only) ───────────────────
    const { data: licenses } = await supabase
      .from('licenses')
      .select('id, customer_id, expiry_date, license_type, products(name), customers(name, phone)')
      .in('license_type', ['yearly', 'monthly'])
      .not('expiry_date', 'is', null)
      .neq('status', 'Disabled')
      .neq('status', 'Suspended')
      .neq('status', 'Expired')

    console.log(`[renewal-sms-reminders] Found: ${domains?.length ?? 0} domains, ${hostings?.length ?? 0} hostings, ${emails?.length ?? 0} emails, ${licenses?.length ?? 0} product licenses`);

    const sent: string[] = []
    const failed: string[] = []

    type ServiceItem = {
      id: string
      customer_id: string
      label: string
      expiry_date: string
      customers: { name: string; phone: string } | null
      logType: string
    }

    // Check if a service expires within the reminder window (0 to reminderDays inclusive)
    const isExpiringSoon = (expiryStr: string): boolean => {
      // Parse just the date portion (YYYY-MM-DD) to avoid timezone shifts
      const parts = expiryStr.substring(0, 10).split('-')
      const expMs = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      const diffDays = Math.round((expMs - todayMs) / (1000 * 60 * 60 * 24))
      console.log(`[renewal-sms-reminders] expiry=${expiryStr}, diffDays=${diffDays}, inWindow=${diffDays >= 0 && diffDays <= reminderDays}`);
      return diffDays >= 0 && diffDays <= reminderDays
    }

    const items: ServiceItem[] = [
      ...(domains || []).map((d: any) => ({
        id: d.id,
        customer_id: d.customer_id,
        label: `domain "${d.domain_name}"`,
        expiry_date: d.expiry_date,
        customers: d.customers,
        logType: 'renewal_reminder_domain',
      })),
      ...(hostings || []).map((h: any) => ({
        id: h.id,
        customer_id: h.customer_id,
        label: `hosting plan "${h.plan_name || 'your plan'}"`,
        expiry_date: h.expiry_date,
        customers: h.customers,
        logType: 'renewal_reminder_hosting',
      })),
      ...(emails || []).map((e: any) => ({
        id: e.id,
        customer_id: e.customer_id,
        label: `email account "${e.email || 'your email'}"`,
        expiry_date: e.expiry_date,
        customers: e.customers,
        logType: 'renewal_reminder_email',
      })),
      ...(licenses || []).map((l: any) => ({
        id: l.id,
        customer_id: l.customer_id,
        label: `product license "${l.products?.name || 'your product'}"`,
        expiry_date: l.expiry_date,
        customers: l.customers,
        logType: 'renewal_reminder_product',
      })),
    ]

    // Load recently-sent reminders to avoid duplicates within 24h
    // When force=true (manual trigger from admin), skip the dedup check entirely
    let alreadySent = new Set<string>()
    if (!forceRun) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentLogs } = await supabase
        .from('sms_logs')
        .select('customer_id, type')
        .in('type', ['renewal_reminder_domain', 'renewal_reminder_hosting', 'renewal_reminder_email', 'renewal_reminder_product'])
        .gte('sent_at', twentyFourHoursAgo)
      alreadySent = new Set((recentLogs || []).map(r => `${r.customer_id}:${r.type}`))
      console.log(`[renewal-sms-reminders] Dedup: ${alreadySent.size} recent sends found`);
    } else {
      console.log('[renewal-sms-reminders] Force mode — skipping dedup check');
    }

    for (const item of items) {
      if (!isExpiringSoon(item.expiry_date)) {
        continue
      }
      const phone = item.customers?.phone
      if (!phone) {
        console.log(`[renewal-sms-reminders] Skipping ${item.label}: no phone number`);
        continue
      }

      // Skip if a reminder was already sent to this customer+service in the last 24h
      if (alreadySent.has(`${item.customer_id}:${item.logType}`)) {
        console.log(`[renewal-sms-reminders] Skipping ${item.label} for ${item.customers?.name}: already sent within 24h`);
        continue
      }

      const customerName = item.customers?.name || 'Valued Customer'
      const exp = new Date(item.expiry_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const expParts = item.expiry_date.substring(0, 10).split('-')
      const expMs = Date.UTC(Number(expParts[0]), Number(expParts[1]) - 1, Number(expParts[2]))
      const expDiff = Math.round((expMs - todayMs) / (1000 * 60 * 60 * 24))

      const message =
        `Dear ${customerName}, your ${item.label} with Nextiom is expiring on ${exp} ` +
        `(${expDiff} day${expDiff === 1 ? '' : 's'} remaining). Please log in to your portal to renew and avoid service interruption. ` +
        `Visit: portal.nextiom.com`

      const { ok, json: providerRes } = await sendSmsToProvider(phone, message)

      const status = ok ? 'sent' : 'failed'
      await supabase.from('sms_logs').insert({
        customer_id: item.customer_id,
        phone,
        message,
        type: item.logType,
        status,
        provider_ref: providerRes?.data?.uid || null,
        error_msg: ok ? null : (providerRes?.message || providerRes?.error || 'Provider error'),
      })

      if (ok) sent.push(item.id)
      else failed.push(item.id)
    }

    return jsonRes({ success: true, sent: sent.length, failed: failed.length })
  } catch (err) {
    console.error('renewal-sms-reminders error:', err)
    return jsonRes({ error: err.message || 'Internal error' }, 500)
  }
})
