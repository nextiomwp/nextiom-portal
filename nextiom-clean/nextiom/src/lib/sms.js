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
    .select('id, sender_id, sms_enabled, login_otp, always_otp, renewal_reminder, purchase_sms, reminder_days, ticket_sms, ticket_sms_admin_numbers, created_at, updated_at')
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
    ticket_sms: false,
    ticket_sms_admin_numbers: [],
  };
}

/**
 * Upsert SMS settings — feature flags only, no API token field.
 */
export async function saveSmsSettings(settings) {
  // Strip fields that shouldn't be updated/inserted manually
  const { api_token, id, created_at, ...safeSettings } = settings;

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
      .select('id, sender_id, sms_enabled, login_otp, always_otp, renewal_reminder, purchase_sms, reminder_days, ticket_sms, ticket_sms_admin_numbers, created_at, updated_at')
      .single();
  } else {
    result = await supabase
      .from('sms_settings')
      .insert(payload)
      .select('id, sender_id, sms_enabled, login_otp, always_otp, renewal_reminder, purchase_sms, reminder_days, ticket_sms, ticket_sms_admin_numbers, created_at, updated_at')
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

  try {
    // Force a session refresh to get a fresh (small) JWT — avoids Nginx header
    // size rejection if the cached token has bloated user_metadata claims.
    const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr || !refreshData?.session?.access_token) {
      // Fallback: try the existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      refreshData.session = session;
    }

    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { phone, message, type, customerId },
    });

    if (error) {
      console.error('[sendSms] Edge Function returned error:', error);
      throw new Error(error.message || 'Failed to send SMS');
    }

    if (data?.error) {
      console.error('[sendSms] Edge Function logic error:', data.error);
      throw new Error(data.error);
    }

    console.log('[sendSms] Success:', data);
    return data;
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

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('renewal-sms-reminders', {
      body: { force: true },
    });

    if (error) {
      console.error('[triggerRenewalReminders] Edge Function returned error:', error);
      throw new Error(error.message || 'Failed to trigger reminders');
    }

    if (data?.error) {
      console.error('[triggerRenewalReminders] Edge Function logic error:', data.error);
      throw new Error(data.error);
    }

    console.log('[triggerRenewalReminders] Success:', data);
    return data;
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
