/**
 * appointments.js - Client-side helpers for the Appointments system.
 */
import { supabase } from '@/lib/customSupabaseClient';

// ── Appointment Settings ───────────────────────────────────────────────────────

export async function getAppointmentSettings() {
  const { data, error } = await supabase
    .from('appointment_settings')
    .select('*')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching appointment settings:', error);
  }

  return data || {
    booking_start_time: '09:00:00',
    booking_end_time: '15:00:00',
    allowed_days: [1, 2, 3, 4, 5],
    slot_duration_minutes: 60,
    customer_sms_reminders: [60, 30],
    admin_sms_reminder_minutes: 60,
    admin_sms_numbers: [],
    show_fake_to_customers: true,
    show_real_to_customers: true,
    appointment_sms_enabled: false,
    appointment_email_enabled: true,
  };
}

export async function saveAppointmentSettings(settings) {
  const { id, created_at, ...safeSettings } = settings;

  const { data: existing } = await supabase
    .from('appointment_settings')
    .select('id')
    .limit(1)
    .single();

  const payload = { ...safeSettings, updated_at: new Date().toISOString() };

  let result;
  if (existing?.id) {
    result = await supabase
      .from('appointment_settings')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();
  } else {
    result = await supabase
      .from('appointment_settings')
      .insert({ ...payload, id: '00000000-0000-0000-0000-000000000001' })
      .select('*')
      .single();
  }

  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// ── Busy Slots RPC ─────────────────────────────────────────────────────────────

/**
 * Get all busy slots for customers (RPC)
 */
export async function getBusySlots() {
  const { data, error } = await supabase
    .rpc('get_busy_slots');

  if (error) throw new Error(error.message);
  return data || [];
}

// ── Appointments CRUD ─────────────────────────────────────────────────────────

/**
 * Get all appointments (admin)
 */
export async function getAllAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      customers:customer_id (id, name, email, company, phone)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Get appointments for a specific customer
 */
export async function getCustomerAppointments(customerId) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Create a new appointment (customer)
 */
export async function createAppointment({ customerId, appointmentType, notes, requestedDate, requestedTime }) {
  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      customer_id: customerId,
      appointment_type: appointmentType,
      notes,
      requested_date: requestedDate,
      requested_time: requestedTime,
      status: 'pending',
      updated_by: 'customer',
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update appointment (admin: accept/reject/counter-propose)
 */
export async function updateAppointmentAdmin(appointmentId, updates) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ ...updates, updated_by: 'admin', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update appointment (customer: cancel or accept/reject counter-proposal)
 */
export async function updateAppointmentCustomer(appointmentId, updates) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ ...updates, updated_by: 'customer', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get today's confirmed appointments (for admin dashboard banner)
 */
export async function getTodayAppointments() {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      customers:customer_id (id, name, email, company)
    `)
    .eq('confirmed_date', today)
    .in('status', ['accepted', 'counter_proposed'])
    .order('confirmed_time', { ascending: true });

  if (error) {
    console.error('Error fetching today appointments:', error);
    return [];
  }
  return data || [];
}

// ── Notifications helper ──────────────────────────────────────────────────────

/**
 * Send notification when appointment status changes
 */
export async function sendAppointmentNotification({ customerId, type, title, message }) {
  const { error } = await supabase
    .from('notifications')
    .insert([{
      customer_id: customerId,
      type,
      title,
      message,
      read_status: false,
    }]);
  if (error) console.error('Appointment notification error:', error);
}

/**
 * Send admin notification (customer_id = null)
 */
export async function sendAdminAppointmentNotification({ type, title, message }) {
  const { error } = await supabase
    .from('notifications')
    .insert([{
      customer_id: null,
      type,
      title,
      message,
      read_status: false,
    }]);
  if (error) console.error('Admin appointment notification error:', error);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getAppointmentTypeLabel(type) {
  const labels = {
    office_visit: 'Office Visit',
    zoom_meeting: 'Zoom Meeting',
    phone_call: 'Phone Call',
  };
  return labels[type] || type;
}

export function getStatusColor(status) {
  const colors = {
    pending: { bg: 'rgba(251,191,36,0.12)', text: '#f59e0b', border: 'rgba(251,191,36,0.3)' },
    accepted: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    rejected: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    counter_proposed: { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', border: 'rgba(99,102,241,0.3)' },
    cancelled: { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af', border: 'rgba(156,163,175,0.3)' },
    completed: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  };
  return colors[status] || colors.pending;
}

export function getStatusLabel(status) {
  const labels = {
    pending: 'Pending',
    accepted: 'Confirmed',
    rejected: 'Rejected',
    counter_proposed: 'New Time Suggested',
    cancelled: 'Cancelled',
    completed: 'Completed',
  };
  return labels[status] || status;
}

export function formatAppointmentDate(date, time) {
  if (!date) return '';
  const d = new Date(`${date}T${time || '00:00:00'}`);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get effective date/time for an appointment (confirmed if available, else requested)
 */
export function getEffectiveDateTime(apt) {
  if ((apt.status === 'accepted' || apt.status === 'counter_proposed') && apt.confirmed_date) {
    return { date: apt.confirmed_date, time: apt.confirmed_time };
  }
  return { date: apt.requested_date, time: apt.requested_time };
}

/**
 * Create a new appointment directly by admin
 */
export async function createAppointmentAdmin({ customerId, appointmentType, notes, requestedDate, requestedTime, status = 'accepted', isFake = false }) {
  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      customer_id: isFake ? null : customerId,
      appointment_type: appointmentType,
      notes,
      requested_date: requestedDate,
      requested_time: requestedTime,
      confirmed_date: requestedDate,
      confirmed_time: requestedTime,
      status,
      updated_by: 'admin',
      is_fake: isFake,
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(appointmentId) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId);

  if (error) throw new Error(error.message);
  return true;
}

