/**
 * sms.js – Client-side helpers for the SMS system.
 *
 * The Text.lk API token lives ONLY in the Edge Function (as TEXTLK_API_TOKEN
 * env var / Supabase secret). It is never stored in the database or sent to
 * the browser.
 */

import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/customSupabaseClient';

// ── SMS Settings CRUD ─────────────────────────────────────────────────────────

/**
 * Load the single-row SMS settings record (feature flags only — no API token).
 */
export async function getSmsSettings() {
  const { data, error } = await supabase
    .from('sms_settings')
    .select('id, sender_id, sms_enabled, login_otp, always_otp, renewal_reminder, purchase_sms, reminder_days, created_at, updated_at')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || {
    sender_id: 'Nextiom',
    sms_enabled: false,
    login_otp: false,
    always_otp: false,
    renewal_reminder: true,
    purchase_sms: true,
    reminder_days: 3,
  };
}

/**
 * Upsert SMS settings — feature flags only, no API token field.
 */
export async function saveSmsSettings(settings) {
  // Strip any accidental api_token field — it must never be in the DB
  const { api_token, ...safeSettings } = settings;

  // Try to get existing ID first
  const { data: existing } = await supabase
    .from('sms_settings')
    .select('id')
    .limit(1)
    .single();

  const payload = {
    ...safeSettings,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing?.id) {
    result = await supabase
      .from('sms_settings')
      .update(payload)
      .eq('id', existing.id)
      .select('id, sender_id, sms_enabled, login_otp, always_otp, renewal_reminder, purchase_sms, reminder_days, created_at, updated_at')
      .single();
  } else {
    result = await supabase
      .from('sms_settings')
      .insert(payload)
      .select('id, sender_id, sms_enabled, login_otp, always_otp, renewal_reminder, purchase_sms, reminder_days, created_at, updated_at')
      .single();
  }

  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// ── SMS Log fetching ──────────────────────────────────────────────────────────

export async function getSmsLogs({ limit = 100, type = null } = {}) {
  let query = supabase
    .from('sms_logs')
    .select(`
      *,
      customers:customer_id ( name, email )
    `)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Edge function callers ─────────────────────────────────────────────────────

/**
 * Send a single SMS via the send-sms Edge Function (admin only).
 * The API token is resolved server-side from the TEXTLK_API_TOKEN env var.
 */
export async function sendSms({ phone, message, type = 'manual', customerId }) {
  console.log('[sendSms] Dispatching test/manual SMS with payload:', { phone, message, type, customerId });
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone, message, type, customerId }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[sendSms] Edge Function returned HTTP error:', res.status, json);
      throw new Error(json.error || `Failed to send SMS (HTTP ${res.status})`);
    }

    console.log('[sendSms] Success:', json);
    return json;
  } catch (err) {
    console.error('[sendSms] Network or execution error:', err);
    throw err;
  }
}

/**
 * Trigger the renewal-sms-reminders Edge Function manually.
 */
export async function triggerRenewalReminders() {
  console.log('[triggerRenewalReminders] Dispatching renewal reminders check');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/renewal-sms-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[triggerRenewalReminders] Edge Function returned HTTP error:', res.status, json);
      throw new Error(json.error || `Failed to trigger reminders (HTTP ${res.status})`);
    }

    console.log('[triggerRenewalReminders] Success:', json);
    return json;
  } catch (err) {
    console.error('[triggerRenewalReminders] Network or execution error:', err);
    throw err;
  }
}

/**
 * Send a purchase / activation thank-you SMS.
 */
export async function sendPurchaseSms({ phone, customerName, serviceLabel, customerId }) {
  const message =
    `Dear ${customerName}, thank you for your purchase! ` +
    `Your ${serviceLabel} service is now active. ` +
    `Please log in to your Nextiom portal dashboard for complete details. ` +
    `– Team Nextiom`;

  return sendSms({ phone, message, type: 'purchase', customerId });
}

/**
 * Check if purchase SMS should be sent (reads toggle flags from DB, not token).
 */
export async function shouldSendPurchaseSms() {
  try {
    const settings = await getSmsSettings();
    return !!(settings.sms_enabled && settings.purchase_sms);
  } catch {
    return false;
  }
}
