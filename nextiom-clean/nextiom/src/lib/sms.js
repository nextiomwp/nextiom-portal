/**
 * sms.js – Client-side helpers for the SMS system.
 *
 * The Text.lk API token lives ONLY in the Edge Function (as TEXTLK_API_TOKEN
 * env var / Supabase secret). It is never stored in the database or sent to
 * the browser.
 */

import { supabase } from '@/lib/customSupabaseClient';

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
  const { data, error } = await supabase.functions.invoke('send-sms', {
    body: { phone, message, type, customerId },
  });

  if (error) {
    let errorMsg = 'Failed to send SMS';
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json();
        if (body?.error) errorMsg = body.error;
      }
    } catch {}
    if (errorMsg === 'Failed to send SMS') {
      errorMsg = error.message || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Trigger the renewal-sms-reminders Edge Function manually.
 */
export async function triggerRenewalReminders() {
  const { data, error } = await supabase.functions.invoke('renewal-sms-reminders', {
    body: {},
  });

  if (error) {
    let errorMsg = 'Failed to trigger reminders';
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json();
        if (body?.error) errorMsg = body.error;
      }
    } catch {}
    if (errorMsg === 'Failed to trigger reminders') {
      errorMsg = error.message || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return data;
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
