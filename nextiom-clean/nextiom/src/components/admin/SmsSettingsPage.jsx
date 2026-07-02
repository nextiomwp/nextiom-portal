import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare, Save, RefreshCw, Loader2, Send, CheckCircle2, XCircle,
  Bell, Clock, Smartphone, AlertCircle, FileText,
  History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getSmsSettings, saveSmsSettings, getSmsLogs, sendSms, triggerRenewalReminders } from '@/lib/sms';
import { useToast } from '@/components/ui/use-toast';

// ── small toggle switch ───────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled, id, c }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: value ? 'flex-end' : 'flex-start',
        width: 44, height: 24, borderRadius: 12, padding: 2,
        background: value ? 'var(--brand-color)' : (c.border),
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'all 0.2s',
        display: 'block', flexShrink: 0,
      }} />
    </button>
  );
}

// ── label + description row above a toggle ────────────────────────────────────
function SettingRow({ id, label, description, value, onChange, disabled, c }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '14px 0',
      borderBottom: `1px solid ${c.border}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: c.subText, marginTop: 3 }}>{description}</div>
        )}
      </div>
      <Toggle id={id} value={value} onChange={onChange} disabled={disabled} c={c} />
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const sent = status === 'sent';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6,
      background: sent ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color: sent ? '#22c55e' : '#ef4444',
      fontSize: 11, fontWeight: 700,
    }}>
      {sent ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {sent ? 'Sent' : 'Failed'}
    </span>
  );
}

// ── Type badge ────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  renewal_reminder_domain: 'Domain Renewal',
  renewal_reminder_hosting: 'Hosting Renewal',
  renewal_reminder_email: 'Email Renewal',
  renewal_reminder_product: 'Product Renewal',
  purchase: 'Purchase',
  otp: 'OTP',
  manual: 'Manual',
  invoice_created: 'Invoice Created',
  invoice_reminder: 'Invoice Reminder',
  invoice_overdue: 'Invoice Overdue',
};
function TypeBadge({ type }) {
  const label = TYPE_LABELS[type] || type;
  const colors = {
    renewal_reminder_domain: { bg: 'rgba(99,153,34,0.13)', color: '#639922' },
    renewal_reminder_hosting: { bg: 'rgba(55,138,221,0.13)', color: '#5b9aff' },
    renewal_reminder_email: { bg: 'rgba(232,123,53,0.13)', color: 'var(--brand-color)' },
    renewal_reminder_product: { bg: 'rgba(236,72,153,0.13)', color: '#ec4899' },
    purchase: { bg: 'rgba(168,85,247,0.13)', color: '#a855f7' },
    otp: { bg: 'rgba(249,115,22,0.13)', color: '#f97316' },
    manual: { bg: 'rgba(100,116,139,0.13)', color: '#64748b' },
    invoice_created: { bg: 'rgba(37,99,235,0.13)', color: '#2563eb' },
    invoice_reminder: { bg: 'rgba(217,119,6,0.13)', color: '#d97706' },
    invoice_overdue: { bg: 'rgba(220,38,38,0.13)', color: '#dc2626' },
  };
  const s = colors[type] || { bg: 'rgba(100,116,139,0.13)', color: '#64748b' };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700,
    }}>{label}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function SmsSettingsPage({ isDark }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    api_token: '',
    sender_id: 'Nextiom',
    sms_enabled: false,
    login_otp: false,
    always_otp: false,
    renewal_reminder: true,
    purchase_sms: true,
    reminder_days: 3,
    ticket_sms: false,
    ticket_sms_admin_numbers: [],
    invoice_sms: false,
    invoice_reminder_days: 2,
  });
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // ── Test SMS state ────────────────────────────────────────────────────────
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test SMS from Nextiom portal.');
  const [testSending, setTestSending] = useState(false);

  // ── Renewal trigger ───────────────────────────────────────────────────────
  const [reminderRunning, setReminderRunning] = useState(false);

  const { toast } = useToast();

  const c = isDark
    ? {
        bg: '#15161A', card: '#1C1E24', panel2: '#22252C',
        border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)',
        text: '#fff', subText: '#a0a0a0', brand: 'var(--brand-color)',
        hover: 'rgba(255,255,255,0.04)', inputBg: '#1C1E24', inputBorder: 'rgba(255,255,255,0.10)',
      }
    : {
        bg: '#f8f8f7', card: '#fff', panel2: '#f5f5f5',
        border: '#ebebeb', borderStrong: '#d0d0d0',
        text: '#1a1a1a', subText: '#888', brand: 'var(--brand-color)',
        hover: '#f5f5f5', inputBg: '#fff', inputBorder: '#e2e8f0',
      };

  // ── Load settings ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getSmsSettings();
        if (mounted) setSettings(s);
      } catch (err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Load SMS logs ─────────────────────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await getSmsLogs({ limit: 50 });
      setLogs(data);
    } catch (err) {
      toast({ title: 'Error loading logs', description: err.message, variant: 'destructive' });
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showLogs) loadLogs();
  }, [showLogs]);

  // ── Save settings ─────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveSmsSettings(settings);
      setSettings(saved);
      toast({
        title: '✓ SMS Settings Saved',
        description: 'Your SMS configuration has been updated.',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      });
    } catch (err) {
      toast({ title: 'Error saving settings', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Test SMS ──────────────────────────────────────────────────────────────
  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      toast({ title: 'Enter a phone number', variant: 'destructive' }); return;
    }
    setTestSending(true);
    try {
      await sendSms({ phone: testPhone.trim(), message: testMessage, type: 'manual' });
      toast({
        title: '✓ Test SMS Sent',
        description: `SMS dispatched to ${testPhone}`,
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      });
      if (showLogs) loadLogs();
    } catch (err) {
      toast({ title: 'Failed to send test SMS', description: err.message, variant: 'destructive' });
    } finally {
      setTestSending(false);
    }
  };

  // ── Trigger renewal reminders ─────────────────────────────────────────────
  const handleTriggerReminders = async () => {
    setReminderRunning(true);
    try {
      const result = await triggerRenewalReminders();
      toast({
        title: '✓ Renewal Reminders Triggered',
        description: `${result.sent ?? 0} sent, ${result.failed ?? 0} failed.`,
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      });
      if (showLogs) loadLogs();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setReminderRunning(false);
    }
  };

  const handleAddAdminNumber = () => {
    const input = document.getElementById('new-admin-number');
    const val = input?.value?.trim();
    if (!val) return;
    
    // Simple verification (needs to be digits or starts with +)
    if (!/^\+?[0-9]{9,15}$/.test(val)) {
      toast({ title: 'Invalid Phone Number', description: 'Please enter a valid phone number format.', variant: 'destructive' });
      return;
    }

    if (settings.ticket_sms_admin_numbers?.includes(val)) {
      toast({ title: 'Duplicate Number', description: 'This number is already in the list.', variant: 'destructive' });
      return;
    }

    setSettings(s => ({
      ...s,
      ticket_sms_admin_numbers: [...(s.ticket_sms_admin_numbers || []), val]
    }));
    if (input) input.value = '';
  };

  const handleRemoveAdminNumber = (numToRemove) => {
    setSettings(s => ({
      ...s,
      ticket_sms_admin_numbers: (s.ticket_sms_admin_numbers || []).filter(n => n !== numToRemove)
    }));
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    background: c.inputBg, border: `1px solid ${c.inputBorder}`,
    color: c.text, fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  };

  const cardStyle = {
    background: c.card,
    border: `1px solid ${c.border}`,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: c.brand }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px' }} noValidate>
      <style>{`
        .sms-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 28px;
        }
        .sms-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .sms-card {
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          margin-bottom: 20px;
        }
        .sms-save-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          border-radius: 10px;
          border: none;
          background: var(--brand-color);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }
        @media (max-width: 768px) {
          .sms-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            margin-bottom: 20px;
          }
          .sms-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .sms-card {
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 16px;
          }
          .sms-save-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="sms-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone size={22} style={{ color: c.brand }} />
            SMS Settings
          </h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 5, maxWidth: 520, lineHeight: 1.5 }}>
            Configure the Text.lk SMS Gateway integration. Enable renewal reminders, purchase thank-you messages, and OTP settings. The API token is set directly in the Edge Function code.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="sms-save-btn"
          style={{
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
      </div>

      <div className="sms-grid">

        {/* ── LEFT COLUMN ──────────────────────────────────── */}
        <div>
          {/* Feature Toggles */}
          <div className="sms-card" style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} style={{ color: c.brand }} />
              Notification Toggles
            </h2>
            <p style={{ fontSize: 12, color: c.subText, margin: '0 0 4px 0' }}>
              Control which SMS notifications are active.
            </p>

            <SettingRow
              id="sms-master-toggle"
              label="Enable SMS Notifications"
              description="Master switch – disabling this stops all SMS delivery."
              value={settings.sms_enabled}
              onChange={v => setSettings(s => ({ ...s, sms_enabled: v }))}
              c={c}
            />
            <SettingRow
              id="sms-renewal-reminder"
              label="Renewal Reminders"
              description={`Send an SMS to customers ${settings.reminder_days} days before their domain, hosting, or email service expires.`}
              value={settings.renewal_reminder}
              onChange={v => setSettings(s => ({ ...s, renewal_reminder: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />
            <SettingRow
              id="sms-purchase"
              label="Purchase Thank-You SMS"
              description="Send a thank-you message when hosting/domain/email or license is activated."
              value={settings.purchase_sms}
              onChange={v => setSettings(s => ({ ...s, purchase_sms: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />
            <SettingRow
              id="sms-invoice-reminder"
              label="Invoice Reminders"
              description="Send an SMS to customers when invoices are created, 3 days before they are overdue, and on the overdue date."
              value={settings.invoice_sms}
              onChange={v => setSettings(s => ({ ...s, invoice_sms: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />
            <SettingRow
              id="sms-login-otp"
              label="Enable Login OTP"
              description="Send a one-time password via SMS for enhanced login security."
              value={settings.login_otp}
              onChange={v => setSettings(s => ({ ...s, login_otp: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />
            <div style={{ borderBottom: 'none' }}>
              <SettingRow
                id="sms-always-otp"
                label="Always Require OTP on Login"
                description="If enabled, every login attempt triggers an OTP even if the session is trusted."
                value={settings.always_otp}
                onChange={v => setSettings(s => ({ ...s, always_otp: v }))}
                disabled={!settings.sms_enabled || !settings.login_otp}
                c={c}
              />
            </div>

            {/* Reminder days */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${c.border}` }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                Days before expiry to send reminder
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  id="sms-reminder-days"
                  type="number"
                  min={1}
                  max={30}
                  value={settings.reminder_days}
                  onChange={e => setSettings(s => ({ ...s, reminder_days: parseInt(e.target.value, 10) || 3 }))}
                  style={{ ...inputStyle, width: 90 }}
                  disabled={!settings.renewal_reminder}
                  onFocus={e => e.target.style.borderColor = 'var(--brand-color)'}
                  onBlur={e => e.target.style.borderColor = c.inputBorder}
                />
                <span style={{ fontSize: 13, color: c.subText }}>days before expiry</span>
              </div>
            </div>
          </div>

          {/* Ticket SMS Notifications Card */}
          <div className="sms-card" style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={16} style={{ color: c.brand }} />
              Ticket SMS Settings
            </h2>
            <p style={{ fontSize: 12, color: c.subText, margin: '0 0 4px 0' }}>
              Enable or disable SMS alerts for ticket creation.
            </p>

            <SettingRow
              id="sms-ticket-toggle"
              label="Enable Ticket SMS"
              description="Notify admin users via SMS when a customer creates a ticket."
              value={settings.ticket_sms}
              onChange={v => setSettings(s => ({ ...s, ticket_sms: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />

            {settings.ticket_sms && (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                  Admin Phone Numbers to Notify
                </label>
                
                {/* Input row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="tel"
                    id="new-admin-number"
                    placeholder="e.g. +94771234567"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.target.style.borderColor = 'var(--brand-color)'}
                    onBlur={e => e.target.style.borderColor = c.inputBorder}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAdminNumber();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddAdminNumber}
                    style={{
                      padding: '0 16px', borderRadius: 10, border: 'none',
                      background: 'var(--brand-color)', color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    Add
                  </button>
                </div>

                {/* List of numbers */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(settings.ticket_sms_admin_numbers || []).length === 0 ? (
                    <span style={{ fontSize: 12, color: c.subText, fontStyle: 'italic' }}>
                      No numbers added yet. Adding numbers is required.
                    </span>
                  ) : (
                    (settings.ticket_sms_admin_numbers || []).map((num, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: c.hover, border: `1px solid ${c.border}`,
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, color: c.text
                        }}
                      >
                        <span style={{ fontFamily: 'monospace' }}>{num}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdminNumber(num)}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444',
                            cursor: 'pointer', padding: 0, fontSize: 14, fontWeight: 'bold',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 16, height: 16
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────── */}
        <div>
          {/* Test SMS card */}
          <div className="sms-card" style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={16} style={{ color: c.brand }} />
              Send Test SMS
            </h2>
            <p style={{ fontSize: 12, color: c.subText, margin: '0 0 16px 0' }}>
              Verify your integration by sending a test message to any phone number.
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                Phone Number
              </label>
              <input
                id="sms-test-phone"
                type="tel"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="e.g. 0771234567 or 94771234567"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--brand-color)'}
                onBlur={e => e.target.style.borderColor = c.inputBorder}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                Message
              </label>
              <textarea
                id="sms-test-message"
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                rows={3}
                maxLength={160}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = 'var(--brand-color)'}
                onBlur={e => e.target.style.borderColor = c.inputBorder}
              />
              <div style={{ fontSize: 11, color: c.subText, textAlign: 'right' }}>{testMessage.length}/160</div>
            </div>

            <button
              id="sms-send-test-btn"
              type="button"
              onClick={handleTestSend}
              disabled={testSending || !settings.sms_enabled}
              style={{
                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: 'var(--brand-color)', color: '#fff',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: (testSending || !settings.sms_enabled) ? 'not-allowed' : 'pointer',
                opacity: (testSending || !settings.sms_enabled) ? 0.6 : 1,
              }}
            >
              {testSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {testSending ? 'Sending…' : 'Send Test SMS'}
            </button>
            {!settings.sms_enabled && (
              <p style={{ fontSize: 11, color: c.subText, marginTop: 8, textAlign: 'center' }}>
                Enable SMS notifications above to send a test.
              </p>
            )}
          </div>

          {/* Trigger renewal reminders card */}
          <div className="sms-card" style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: c.brand }} />
              Renewal Reminder Trigger
            </h2>
            <p style={{ fontSize: 12, color: c.subText, margin: '0 0 16px 0' }}>
              Manually run the renewal reminder check now. Normally this runs automatically each day.
              Sends to all customers with services expiring in <strong style={{ color: c.text }}>{settings.reminder_days}</strong> days.
            </p>

            <button
              id="sms-trigger-reminders-btn"
              type="button"
              onClick={handleTriggerReminders}
              disabled={reminderRunning || !settings.sms_enabled || !settings.renewal_reminder}
              style={{
                width: '100%', padding: '10px', borderRadius: 10,
                border: `1px solid ${c.borderStrong}`, background: 'transparent',
                color: c.text, fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: (reminderRunning || !settings.sms_enabled || !settings.renewal_reminder) ? 'not-allowed' : 'pointer',
                opacity: (reminderRunning || !settings.sms_enabled || !settings.renewal_reminder) ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!reminderRunning) e.currentTarget.style.background = c.hover; }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {reminderRunning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {reminderRunning ? 'Running…' : 'Run Renewal Check Now'}
            </button>
          </div>
        </div>
      </div>

      {/* ── SMS Logs section ──────────────────────────────── */}
      <div className="sms-card" style={cardStyle}>
        <button
          type="button"
          onClick={() => setShowLogs(v => !v)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 0, color: c.text,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} style={{ color: c.brand }} />
            SMS Activity Log
            {logs.length > 0 && (
              <span style={{ fontSize: 11, background: c.hover, color: c.subText, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                {logs.length} entries
              </span>
            )}
          </h2>
          {showLogs ? <ChevronUp size={16} style={{ color: c.subText }} /> : <ChevronDown size={16} style={{ color: c.subText }} />}
        </button>

        {showLogs && (
          <div style={{ marginTop: 20 }}>
            {logsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: c.brand }} />
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: c.subText, fontSize: 13 }}>
                No SMS logs yet. Send a test SMS to see results here.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                      {['Sent At', 'Customer', 'Phone', 'Type', 'Status', 'Message'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr
                        key={log.id}
                        style={{ borderBottom: `1px solid ${c.border}`, transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = c.hover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 12px', color: c.subText, whiteSpace: 'nowrap' }}>
                          {log.sent_at ? new Date(log.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: c.text }}>
                          {log.customers?.name || <span style={{ color: c.subText }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: c.subText, fontFamily: 'monospace' }}>{log.phone}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <TypeBadge type={log.type} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <StatusBadge status={log.status} />
                        </td>
                        <td style={{ padding: '10px 12px', color: c.subText, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              type="button"
              onClick={loadLogs}
              disabled={logsLoading}
              style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', color: c.subText, fontSize: 12,
                cursor: 'pointer', padding: 0,
              }}
            >
              <RefreshCw size={12} style={{ animation: logsLoading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh logs
            </button>
          </div>
        )}
      </div>

      {/* ── Invoice SMS Settings & Reminders Area ─────────── */}
      <InvoiceRemindersPanel isDark={isDark} c={c} cardStyle={cardStyle} settings={settings} setSettings={setSettings} />

      {/* ── Expiring Services Overview ────────────────────── */}
      <ExpiringServicesPanel isDark={isDark} c={c} cardStyle={cardStyle} settings={settings} />
    </form>
  );
}

// ── Expiring Services overview panel ─────────────────────────────────────────
function ExpiringServicesPanel({ isDark, c, cardStyle, settings }) {
  const [data, setData] = useState({ domains: [], hostings: [], emails: [], products: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { supabase } = await import('@/lib/customSupabaseClient');
        const now = new Date();
        const windowEnd = new Date(now);
        windowEnd.setDate(windowEnd.getDate() + 30); // show expiring within 30 days

        const [domainsRes, hostingsRes, emailsRes, productsRes] = await Promise.all([
          supabase
            .from('domain_requests')
            .select('id, domain_name, expiry_date, customers(name, phone)')
            .in('status', ['approved', 'active', 'completed'])
            .not('expiry_date', 'is', null)
            .lte('expiry_date', windowEnd.toISOString())
            .gte('expiry_date', now.toISOString())
            .order('expiry_date', { ascending: true })
            .limit(20),
          supabase
            .from('hosting_requests')
            .select('id, plan_name, expiry_date, customers(name, phone)')
            .in('status', ['approved', 'active', 'completed'])
            .not('expiry_date', 'is', null)
            .lte('expiry_date', windowEnd.toISOString())
            .gte('expiry_date', now.toISOString())
            .order('expiry_date', { ascending: true })
            .limit(20),
          supabase
            .from('email_requests')
            .select('id, email, expiry_date, customers(name, phone)')
            .in('status', ['approved', 'active', 'completed'])
            .not('expiry_date', 'is', null)
            .lte('expiry_date', windowEnd.toISOString())
            .gte('expiry_date', now.toISOString())
            .order('expiry_date', { ascending: true })
            .limit(20),
          supabase
            .from('licenses')
            .select('id, expiry_date, license_type, products(name), customers(name, phone)')
            .in('license_type', ['yearly', 'monthly'])
            .not('expiry_date', 'is', null)
            .neq('status', 'Disabled')
            .neq('status', 'Suspended')
            .neq('status', 'Expired')
            .lte('expiry_date', windowEnd.toISOString())
            .gte('expiry_date', now.toISOString())
            .order('expiry_date', { ascending: true })
            .limit(20),
        ]);

        if (mounted) {
          setData({
            domains: domainsRes.data || [],
            hostings: hostingsRes.data || [],
            emails: emailsRes.data || [],
            products: productsRes.data || [],
          });
        }
      } catch (err) {
        console.error('ExpiringServices error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const daysUntil = (expiryStr) => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const exp = new Date(expiryStr); exp.setHours(0, 0, 0, 0);
    return Math.round((exp - now) / (1000 * 60 * 60 * 24));
  };

  const urgencyColor = (days) => {
    if (days <= 3) return '#ef4444';
    if (days <= 7) return '#f97316';
    if (days <= 14) return '#f59e0b';
    return '#22c55e';
  };

  const allItems = [
    ...data.domains.map(d => ({ ...d, label: d.domain_name, serviceType: 'Domain' })),
    ...data.hostings.map(h => ({ ...h, label: h.plan_name || 'Hosting', serviceType: 'Hosting' })),
    ...data.emails.map(e => ({ ...e, label: e.email || 'Email', serviceType: 'Email' })),
    ...data.products.map(p => ({ ...p, label: p.products?.name || 'Product', serviceType: 'Product' })),
  ].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

  if (loading) return (
    <div className="sms-card" style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.subText, fontSize: 13 }}>
        <Loader2 size={16} className="animate-spin" /> Loading expiring services…
      </div>
    </div>
  );

  return (
    <div className="sms-card" style={cardStyle}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertCircle size={16} style={{ color: c.brand }} />
        Services Expiring in Next 30 Days
        <span style={{ fontSize: 12, background: c.hover, color: c.subText, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
          {allItems.length} items
        </span>
      </h2>
      <p style={{ fontSize: 12, color: c.subText, margin: '0 0 20px 0' }}>
        Active domains, hostings, email accounts and product licenses that are coming up for renewal. SMS reminders will be sent automatically.
      </p>

      {allItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: c.subText, fontSize: 13 }}>
          <CheckCircle2 size={28} style={{ color: '#22c55e', marginBottom: 8 }} />
          <div>No services expiring in the next 30 days.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                {['Customer', 'Service', 'Type', 'Expiry Date', 'Days Left', 'Auto Trigger', 'Phone'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allItems.map(item => {
                const days = daysUntil(item.expiry_date);
                const col = urgencyColor(days);
                const isAutoTrigger = settings?.sms_enabled && settings?.renewal_reminder && days >= 0 && days <= (settings?.reminder_days ?? 3) && !!item.customers?.phone;

                return (
                  <tr
                    key={item.id + item.serviceType}
                    style={{ borderBottom: `1px solid ${c.border}`, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = c.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 12px', fontWeight: 600, color: c.text }}>
                      {item.customers?.name || '—'}
                    </td>
                    <td style={{ padding: '11px 12px', color: c.subText, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>
                      {item.label}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: item.serviceType === 'Domain' ? 'rgba(99,153,34,0.12)' : item.serviceType === 'Hosting' ? 'rgba(55,138,221,0.12)' : item.serviceType === 'Product' ? 'rgba(236,72,153,0.12)' : 'rgba(232,123,53,0.12)',
                        color: item.serviceType === 'Domain' ? '#639922' : item.serviceType === 'Hosting' ? '#5b9aff' : item.serviceType === 'Product' ? '#ec4899' : 'var(--brand-color)',
                      }}>
                        {item.serviceType}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px', color: c.subText, whiteSpace: 'nowrap' }}>
                      {new Date(item.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{
                        fontWeight: 700, fontSize: 13, color: col,
                        background: col + '18', padding: '2px 8px', borderRadius: 6,
                      }}>
                        {days <= 0 ? 'Expired' : `${days}d`}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      {isAutoTrigger ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: 'rgba(34,197,94,0.12)', color: '#22c55e'
                        }}>
                          Yes
                        </span>
                      ) : (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: 'rgba(100,116,139,0.12)', color: '#64748b'
                        }}>
                          No
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 12px', color: c.subText, fontFamily: 'monospace', fontSize: 12 }}>
                      {item.customers?.phone || <span style={{ color: '#ef4444', fontSize: 11 }}>No phone</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Invoice SMS Settings & Reminders panel ───────────────────────────────────
function InvoiceRemindersPanel({ isDark, c, cardStyle, settings, setSettings }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const { toast } = useToast();

  const fetchInvoices = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, invoice_no, due_date, client_name, client_phone, client_email, total, currency, status')
        .in('status', ['unpaid', 'overdue', 'partially_paid'])
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setData(invoices || []);
    } catch (err) {
      console.error('InvoiceRemindersPanel error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const daysUntil = (dueStr) => {
    if (!dueStr) return 0;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const due = new Date(dueStr); due.setHours(0, 0, 0, 0);
    return Math.round((due - now) / (1000 * 60 * 60 * 24));
  };

  const urgencyColor = (days) => {
    if (days <= 0) return '#ef4444'; // Overdue
    if (days <= 2) return '#f97316'; // Warning
    if (days <= 7) return '#f59e0b'; // Upcoming
    return '#22c55e';
  };

  // Filter invoices to only show those that are due in 0 to 3 days (approaching due date, not yet overdue)
  const filteredData = data.filter(item => {
    const days = daysUntil(item.due_date);
    return days >= 0 && days <= 3;
  });

  return (
    <div className="sms-card" style={cardStyle}>
      <button
        type="button"
        onClick={() => setShowTable(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 0, color: c.text, textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} style={{ color: c.brand }} />
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: 0 }}>
              Invoice SMS Settings & Reminders
            </h2>
            <p style={{ fontSize: 12, color: c.subText, marginTop: 4 }}>
              Overdue warning notifications (fixed to 3 days before overdue date).
            </p>
          </div>
        </div>
        {showTable ? <ChevronUp size={16} style={{ color: c.subText }} /> : <ChevronDown size={16} style={{ color: c.subText }} />}
      </button>

      {showTable && (
        <div style={{ marginTop: 20 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.subText, fontSize: 13, padding: '16px 0' }}>
              <Loader2 size={16} className="animate-spin" /> Loading unpaid invoices…
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: c.subText, fontSize: 13 }}>
              <CheckCircle2 size={28} style={{ color: '#22c55e', marginBottom: 8 }} />
              <div>No unpaid or overdue invoices found within 3 days.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                    {['Customer', 'Invoice No', 'Amount', 'Due Date', 'Days Left', 'Auto Trigger', 'Phone'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(item => {
                    const days = daysUntil(item.due_date);
                    const col = urgencyColor(days);
                    const isAutoTrigger = settings?.sms_enabled && settings?.invoice_sms && 
                      days === 3 && 
                      !!item.client_phone;

                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: `1px solid ${c.border}`, transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = c.hover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '11px 12px', fontWeight: 600, color: c.text }}>
                          {item.client_name || '—'}
                        </td>
                        <td style={{ padding: '11px 12px', color: c.subText, whiteSpace: 'nowrap' }}>
                          {item.invoice_no}
                        </td>
                        <td style={{ padding: '11px 12px', color: c.text, fontWeight: 500 }}>
                          {item.total} {item.currency}
                        </td>
                        <td style={{ padding: '11px 12px', color: c.subText, whiteSpace: 'nowrap' }}>
                          {new Date(item.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <span style={{
                            fontWeight: 700, fontSize: 13, color: col,
                            background: col + '18', padding: '2px 8px', borderRadius: 6,
                          }}>
                            {days < 0 ? `Overdue (${Math.abs(days)}d)` : days === 0 ? 'Due Today' : `${days}d`}
                          </span>
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          {isAutoTrigger ? (
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: 'rgba(34,197,94,0.12)', color: '#22c55e'
                            }}>
                              Yes
                            </span>
                          ) : (
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: 'rgba(100,116,139,0.12)', color: '#64748b'
                            }}>
                              No
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '11px 12px', color: c.subText, fontFamily: 'monospace', fontSize: 12 }}>
                          {item.client_phone || <span style={{ color: '#ef4444', fontSize: 11 }}>No phone</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
