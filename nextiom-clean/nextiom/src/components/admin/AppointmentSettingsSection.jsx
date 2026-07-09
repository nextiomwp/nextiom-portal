import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, Save, Loader2, Plus, Trash2, Info, Bell, Phone,
  CheckCircle2, AlertCircle, Settings,
} from 'lucide-react';
import { getAppointmentSettings, saveAppointmentSettings } from '@/lib/appointments';
import { useToast } from '@/components/ui/use-toast';

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

function Toggle({ value, onChange, id, c }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: value ? 'flex-end' : 'flex-start',
        width: 44, height: 24, borderRadius: 12, padding: 2,
        background: value ? 'var(--brand-color)' : c.border,
        border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'all 0.2s', display: 'block' }} />
    </button>
  );
}

export default function AppointmentSettingsSection({ c, isDark }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const data = await getAppointmentSettings();
      setSettings(data);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load appointment settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveAppointmentSettings(settings);
      toast({ title: '✓ Settings saved', description: 'Appointment settings updated successfully.' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    const current = settings.allowed_days || [];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort();
    update('allowed_days', next);
  };

  const addCustomerReminder = () => {
    const current = settings.customer_sms_reminders || [];
    update('customer_sms_reminders', [...current, 60]);
  };

  const removeCustomerReminder = (idx) => {
    const current = settings.customer_sms_reminders || [];
    if (current.length <= 1) { toast({ title: 'At least 1 reminder required', variant: 'destructive' }); return; }
    update('customer_sms_reminders', current.filter((_, i) => i !== idx));
  };

  const updateCustomerReminder = (idx, value) => {
    const current = [...(settings.customer_sms_reminders || [])];
    current[idx] = Number(value);
    update('customer_sms_reminders', current);
  };

  const addAdminPhone = () => {
    const phone = newAdminPhone.trim();
    if (!phone) return;
    const current = settings.admin_sms_numbers || [];
    if (current.includes(phone)) { toast({ title: 'Phone already added', variant: 'destructive' }); return; }
    update('admin_sms_numbers', [...current, phone]);
    setNewAdminPhone('');
  };

  const removeAdminPhone = (idx) => {
    const current = settings.admin_sms_numbers || [];
    update('admin_sms_numbers', current.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Loader2 size={24} className="animate-spin" color="var(--brand-color)" />
      </div>
    );
  }

  if (!settings) return null;

  const sectionStyle = {
    background: c.card, border: `1px solid ${c.border}`, borderRadius: 14,
    padding: '20px 24px', marginBottom: 16,
  };

  const sectionTitle = (icon, label, desc) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{label}</span>
      </div>
      {desc && <p style={{ fontSize: 12, color: c.subText, margin: 0 }}>{desc}</p>}
    </div>
  );

  const inputStyle = {
    padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    color: c.text, fontSize: 14, outline: 'none',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(232,123,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} color="var(--brand-color)" />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: 0 }}>Appointment Settings</h3>
            <p style={{ fontSize: 12, color: c.subText, margin: '2px 0 0' }}>Configure booking hours, SMS reminders, and notifications</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '9px 20px', borderRadius: 10,
            background: 'var(--brand-color)', border: 'none',
            color: '#fff', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Booking Hours */}
      <div style={sectionStyle}>
        {sectionTitle(<Clock size={16} color="var(--brand-color)" />, 'Booking Hours', 'Set the time window when customers can book appointments')}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>Start Time</label>
            <input
              type="time"
              value={settings.booking_start_time?.slice(0, 5) || '09:00'}
              onChange={e => update('booking_start_time', e.target.value + ':00')}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>End Time</label>
            <input
              type="time"
              value={settings.booking_end_time?.slice(0, 5) || '15:00'}
              onChange={e => update('booking_end_time', e.target.value + ':00')}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6 }}>Slot Duration</label>
            <select
              value={settings.slot_duration_minutes || 60}
              onChange={e => update('slot_duration_minutes', Number(e.target.value))}
              style={{ ...inputStyle, paddingRight: 28 }}
            >
              {[15, 30, 45, 60, 90, 120].map(d => (
                <option key={d} value={d}>{d} minutes</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 8 }}>Available Days</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DAY_OPTIONS.map(day => {
              const isActive = (settings.allowed_days || []).includes(day.value);
              return (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: isActive ? 'var(--brand-color)' : 'transparent',
                    border: isActive ? 'none' : `1px solid ${c.border}`,
                    color: isActive ? '#fff' : c.subText,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: c.subText, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Info size={11} /> Customers can only book on selected days
          </div>
        </div>
      </div>

      {/* SMS Reminders */}
      <div style={sectionStyle}>
        {sectionTitle(<Bell size={16} color="var(--brand-color)" />, 'SMS Reminders', 'Configure when customers and admins receive SMS reminders')}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${c.border}` }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>Enable Appointment SMS</div>
            <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>Send SMS reminders for upcoming appointments</div>
          </div>
          <Toggle value={settings.appointment_sms_enabled || false} onChange={v => update('appointment_sms_enabled', v)} c={c} />
        </div>

        {/* Customer reminders */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>Customer SMS Reminders</div>
          <div style={{ fontSize: 12, color: c.subText, marginBottom: 12 }}>
            Customers will receive reminders at these intervals before their appointment. At least 1 is required.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(settings.customer_sms_reminders || [60, 30]).map((minutes, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={minutes}
                  onChange={e => updateCustomerReminder(idx, e.target.value)}
                  style={{ ...inputStyle, flex: 1, maxWidth: 200 }}
                >
                  {[15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440].map(m => (
                    <option key={m} value={m}>
                      {m < 60 ? `${m} minutes` : m === 60 ? '1 hour' : m < 1440 ? `${m / 60} hours` : `${m / 1440} day`} before
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeCustomerReminder(idx)}
                  disabled={(settings.customer_sms_reminders || []).length <= 1}
                  style={{
                    padding: 8, borderRadius: 8, border: `1px solid ${c.border}`,
                    background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex',
                    opacity: (settings.customer_sms_reminders || []).length <= 1 ? 0.4 : 1,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={addCustomerReminder}
              style={{
                padding: '8px 14px', borderRadius: 8, width: 'fit-content',
                border: `1px dashed ${c.border}`, background: 'transparent',
                color: c.subText, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={13} /> Add Reminder
            </button>
          </div>
        </div>

        {/* Admin reminder */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>Admin SMS Reminder</div>
          <div style={{ fontSize: 12, color: c.subText, marginBottom: 12 }}>You'll receive one SMS reminder before each appointment</div>
          <select
            value={settings.admin_sms_reminder_minutes || 60}
            onChange={e => update('admin_sms_reminder_minutes', Number(e.target.value))}
            style={{ ...inputStyle, maxWidth: 200 }}
          >
            {[15, 30, 45, 60, 90, 120, 180, 240].map(m => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : m === 60 ? '1 hour' : `${m / 60} hours`} before
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admin phone numbers */}
      <div style={sectionStyle}>
        {sectionTitle(<Phone size={16} color="var(--brand-color)" />, 'Admin SMS Numbers', 'Phone numbers that will receive appointment notifications')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {(settings.admin_sms_numbers || []).length === 0 && (
            <div style={{ fontSize: 13, color: c.subText, padding: '10px 0' }}>No admin phone numbers configured</div>
          )}
          {(settings.admin_sms_numbers || []).map((phone, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                flex: 1, padding: '9px 14px', borderRadius: 9,
                border: `1px solid ${c.border}`,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                color: c.text, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Phone size={12} color={c.subText} /> {phone}
              </div>
              <button
                onClick={() => removeAdminPhone(idx)}
                style={{
                  padding: 8, borderRadius: 8, border: `1px solid ${c.border}`,
                  background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newAdminPhone}
            onChange={e => setNewAdminPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAdminPhone()}
            placeholder="+94 77 123 4567"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={addAdminPhone}
            style={{
              padding: '8px 16px', borderRadius: 9,
              background: 'var(--brand-color)', border: 'none',
              color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: 'var(--brand-color)', border: 'none',
          color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: saving ? 0.7 : 1,
          boxShadow: '0 4px 14px rgba(232,123,53,0.35)',
        }}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saving Settings...' : 'Save Appointment Settings'}
      </button>
    </div>
  );
}
