import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageSquare, Save, RefreshCw, Loader2, Send, CheckCircle2, XCircle,
  Bell, Smartphone, AlertCircle, FileText,
  History, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { getSmsSettings, saveSmsSettings, getSmsLogs, sendSms, triggerRenewalReminders } from '@/lib/sms';
import { useToast } from '@/components/ui/use-toast';
import { logAdminOrModeratorActivity } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';

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
function SettingRow({ id, label, description, value, onChange, disabled, c, noBorder }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '14px 0',
      borderBottom: noBorder ? 'none' : `1px solid ${c.border}`,
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
  if (status && typeof status === 'object') {
    const days = status.days;
    let col = '#22c55e'; // default green
    let text = `${days}d left`;
    if (days <= 0) {
      col = '#ef4444'; // Red
      text = status.type === 'invoice' ? 'Overdue' : 'Expired';
    } else if (days === 0) {
      col = '#f97316'; // Orange
      text = 'Due Today';
    } else if (days <= 3) {
      col = '#f97316'; // Orange
      text = `${days}d left`;
    } else if (days <= 7) {
      col = '#eab308'; // Yellow
      text = `${days}d left`;
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 8px', borderRadius: 6,
        background: `${col}18`,
        color: col,
        fontSize: 11, fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>
        {text}
      </span>
    );
  }

  const sent = status === 'sent';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6,
      background: sent ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color: sent ? '#22c55e' : '#ef4444',
      fontSize: 11, fontWeight: 700,
      whiteSpace: 'nowrap',
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
  expiry_domain: 'Domain Expired',
  expiry_hosting: 'Hosting Expired',
  expiry_email: 'Email Expired',
  expiry_product: 'Product Expired',
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
    expiry_domain: { bg: 'rgba(220,38,38,0.15)', color: '#ef4444' },
    expiry_hosting: { bg: 'rgba(220,38,38,0.15)', color: '#f87171' },
    expiry_email: { bg: 'rgba(220,38,38,0.15)', color: '#fca5a5' },
    expiry_product: { bg: 'rgba(180,20,20,0.18)', color: '#dc2626' },
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
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

// ── Pagination component ──────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, perPage, onPage, onPerPage, c }) {
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnBase = { minWidth: 32, height: 32, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' };
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${c.border}`, flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 12.5, color: c.subText, whiteSpace: 'nowrap' }}>
        Showing {from} to {to} of {total} entries
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button type="button" onClick={() => onPage(page - 1)} disabled={page === 1} style={{ ...btnBase, opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ ...btnBase, cursor: 'default', color: c.subText }}>…</span>
          ) : (
            <button type="button" key={p} onClick={() => onPage(p)} style={{ ...btnBase, background: p === page ? 'var(--brand-color)' : 'transparent', color: p === page ? '#fff' : c.subText, border: p === page ? '1px solid var(--brand-color)' : `1px solid ${c.border}`, fontWeight: p === page ? 700 : 500 }}>{p}</button>
          )
        )}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page === totalPages || totalPages === 0} style={{ ...btnBase, opacity: (page === totalPages || totalPages === 0) ? 0.4 : 1 }}><ChevronRight size={14} /></button>
      </div>
      <select value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }} style={{ padding: '5px 10px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
        {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
      </select>
    </div>
  );
}

// ── Collapsible Card Component ────────────────────────────────────────────────
function CollapsibleCard({ title, subtitle, icon: Icon, badge, isExpanded, onToggle, children, c, isDark }) {
  return (
    <div style={{
      background: c.card,
      border: `1px solid ${c.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      marginBottom: 16,
    }}>
      {/* Clickable Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          background: isExpanded ? c.hover : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {Icon && (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--brand-color-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon size={18} style={{ color: 'var(--brand-color)' }} />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{title}</span>
              {badge !== undefined && (
                <span style={{
                  padding: '2px 8px', borderRadius: 6,
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: c.subText, fontSize: 11, fontWeight: 600
                }}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, color: c.subText, marginTop: 4, lineHeight: 1.4 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div style={{ color: c.subText, marginLeft: 16, flexShrink: 0 }}>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          padding: '20px 24px 24px',
          borderTop: `1px solid ${c.border}`,
          background: isDark ? 'rgba(255,255,255,0.005)' : 'rgba(0,0,0,0.005)',
        }}>
          {children}
        </div>
      )}
    </div>
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
    expiry_notification: true,
    ticket_sms: false,
    ticket_sms_admin_numbers: [],
    invoice_sms: false,
    invoice_reminder_days: 2,
  });

  // Data logs lists
  const [logs, setLogs] = useState([]);
  const [expiringData, setExpiringData] = useState({ domains: [], hostings: [], emails: [], products: [] });
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    logs: false,
    invoices: false,
    expiring: false,
  });

  // Search & pagination states
  const [searchQueryLog, setSearchQueryLog] = useState('');
  const [currentPageLog, setCurrentPageLog] = useState(1);

  const [searchQueryInvoice, setSearchQueryInvoice] = useState('');
  const [currentPageInvoice, setCurrentPageInvoice] = useState(1);

  const [searchQueryExpiring, setSearchQueryExpiring] = useState('');
  const [currentPageExpiring, setCurrentPageExpiring] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Test SMS state
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testSending, setTestSending] = useState(false);

  // Renewal trigger
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

  // ── Helper to calculate days remaining ──
  const daysUntil = (d) => {
    const diff = new Date(d) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // ── Load all data ──
  const fetchLogsAndOverviews = useCallback(async () => {
    setLogsLoading(true);
    try {
      // 1. SMS Logs
      const logsData = await getSmsLogs({ limit: 150 });
      setLogs(logsData || []);

      // 2. Expiring Services (30 Days)
      const now = new Date();
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + 30);

      const [domainsRes, hostingsRes, emailsRes, productsRes] = await Promise.all([
        supabase.from('domain_requests').select('id, domain_name, expiry_date, customers(name, phone)').in('status', ['approved', 'active', 'completed']).not('expiry_date', 'is', null).lte('expiry_date', windowEnd.toISOString()).gte('expiry_date', now.toISOString()).order('expiry_date', { ascending: true }).limit(50),
        supabase.from('hosting_requests').select('id, plan_name, expiry_date, customers(name, phone)').in('status', ['approved', 'active', 'completed']).not('expiry_date', 'is', null).lte('expiry_date', windowEnd.toISOString()).gte('expiry_date', now.toISOString()).order('expiry_date', { ascending: true }).limit(50),
        supabase.from('email_requests').select('id, email, expiry_date, customers(name, phone)').in('status', ['approved', 'active', 'completed']).not('expiry_date', 'is', null).lte('expiry_date', windowEnd.toISOString()).gte('expiry_date', now.toISOString()).order('expiry_date', { ascending: true }).limit(50),
        supabase.from('licenses').select('id, expiry_date, license_type, products(name), customers(name, phone)').in('license_type', ['yearly', 'monthly']).not('expiry_date', 'is', null).neq('status', 'Disabled').neq('status', 'Suspended').neq('status', 'Expired').lte('expiry_date', windowEnd.toISOString()).gte('expiry_date', now.toISOString()).order('expiry_date', { ascending: true }).limit(50),
      ]);

      setExpiringData({
        domains: domainsRes.data || [],
        hostings: hostingsRes.data || [],
        emails: emailsRes.data || [],
        products: productsRes.data || [],
      });

      // 3. Unpaid Invoices
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id, invoice_no, due_date, client_name, client_phone, client_email, total, currency, status')
        .in('status', ['unpaid', 'overdue', 'partially_paid'])
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      if (invError) throw invError;
      setUnpaidInvoices(invoices || []);

    } catch (err) {
      toast({ title: 'Error loading logs', description: err.message, variant: 'destructive' });
    } finally {
      setLogsLoading(false);
    }
  }, [toast]);

  // ── Load settings on mount ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getSmsSettings();
        if (mounted) setSettings(s);
        await fetchLogsAndOverviews();
      } catch (err) {
        toast({ title: 'Error loading settings', description: err.message, variant: 'destructive' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchLogsAndOverviews]);

  // ── Save settings ──
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveSmsSettings(settings);
      setSettings(saved);
      toast({
        title: '✓ SMS Settings Saved',
        description: 'Your SMS configuration has been updated.',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      });
      await logAdminOrModeratorActivity('update', 'SMS Settings Saved', 'Updated the system SMS gateway settings.');
    } catch (err) {
      toast({ title: 'Error saving settings', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Test SMS ──
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
      await logAdminOrModeratorActivity('update', 'SMS Test Sent', `Dispatched test SMS to ${testPhone.trim()}`);
      setTestMessage('');
      await fetchLogsAndOverviews();
    } catch (err) {
      toast({ title: 'Failed to send custom SMS', description: err.message, variant: 'destructive' });
    } finally {
      setTestSending(false);
    }
  };

  // ── Trigger renewal reminders ──
  const handleTriggerReminders = async () => {
    setReminderRunning(true);
    try {
      const result = await triggerRenewalReminders();
      toast({
        title: '✓ Renewal Reminders Triggered',
        description: `${result.sent ?? 0} sent, ${result.failed ?? 0} failed.`,
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      });
      await logAdminOrModeratorActivity('update', 'Renewal Reminders Triggered', `Manually triggered SMS/email renewal reminders (${result.sent ?? 0} sent, ${result.failed ?? 0} failed).`);
      await fetchLogsAndOverviews();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setReminderRunning(false);
    }
  };

  // ── Ticket admin numbers handlers ──
  const handleAddAdminNumber = () => {
    const input = document.getElementById('new-admin-number');
    const val = input?.value?.trim();
    if (!val) return;
    
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // ── 1. SMS Activity Log Data ──
  const processedLogs = logs
    .filter(log => log.type !== 'otp')
    .map(log => ({
      id: log.id,
      raw_date: log.sent_at,
      sent_at: log.sent_at ? new Date(log.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
      customer: log.customers?.name || '—',
      phone: log.phone || '—',
      type: log.type,
      status: log.status,
      message: log.message,
    }));

  const filteredLogs = processedLogs.filter(row => {
    if (!searchQueryLog.trim()) return true;
    const q = searchQueryLog.toLowerCase().trim();
    const customer = String(row.customer).toLowerCase();
    const phone = String(row.phone).toLowerCase();
    const message = String(row.message).toLowerCase();
    const typeLabel = String(TYPE_LABELS[row.type] || row.type || '').toLowerCase();
    return customer.includes(q) || phone.includes(q) || message.includes(q) || typeLabel.includes(q);
  });

  const totalPagesLog = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPageLog - 1) * itemsPerPage,
    currentPageLog * itemsPerPage
  );

  // ── 2. Invoice SMS Settings & Reminders Data ──
  const processedInvoices = unpaidInvoices
    .filter(item => {
      const days = daysUntil(item.due_date);
      return days >= 0 && days <= 3;
    })
    .map(item => {
      const days = daysUntil(item.due_date);
      const isAutoTrigger = settings?.sms_enabled && settings?.invoice_sms && days === 3 && !!item.client_phone;
      return {
        id: item.id,
        raw_date: item.due_date,
        sent_at: `Due: ${new Date(item.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
        customer: item.client_name || '—',
        phone: item.client_phone || '—',
        type: 'invoice_reminder',
        status: { type: 'invoice', days },
        message: `Invoice: ${item.invoice_no} | Total: ${item.total} ${item.currency} | Auto Trigger: ${isAutoTrigger ? 'Yes' : 'No'}`,
      };
    });

  const filteredInvoices = processedInvoices.filter(row => {
    if (!searchQueryInvoice.trim()) return true;
    const q = searchQueryInvoice.toLowerCase().trim();
    const customer = String(row.customer).toLowerCase();
    const phone = String(row.phone).toLowerCase();
    const message = String(row.message).toLowerCase();
    return customer.includes(q) || phone.includes(q) || message.includes(q);
  });

  const totalPagesInvoice = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPageInvoice - 1) * itemsPerPage,
    currentPageInvoice * itemsPerPage
  );

  // ── 3. Services Expiring in Next 30 Days Data ──
  const processedExpiring = [
    ...expiringData.domains.map(d => ({ ...d, label: d.domain_name, serviceType: 'Domain', typeKey: 'renewal_reminder_domain' })),
    ...expiringData.hostings.map(h => ({ ...h, label: h.plan_name || 'Hosting', serviceType: 'Hosting', typeKey: 'renewal_reminder_hosting' })),
    ...expiringData.emails.map(e => ({ ...e, label: e.email || 'Email', serviceType: 'Email', typeKey: 'renewal_reminder_email' })),
    ...expiringData.products.map(p => ({ ...p, label: p.products?.name || 'Product', serviceType: 'Product', typeKey: 'renewal_reminder_product' })),
  ]
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    .map(item => {
      const days = daysUntil(item.expiry_date);
      const isAutoTrigger = settings?.sms_enabled && settings?.renewal_reminder && days >= 0 && days <= (settings?.reminder_days ?? 3) && !!item.customers?.phone;
      return {
        id: `${item.id}-${item.serviceType}`,
        raw_date: item.expiry_date,
        sent_at: `Expires: ${new Date(item.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
        customer: item.customers?.name || '—',
        phone: item.customers?.phone || '—',
        type: item.typeKey,
        status: { type: 'expiring', days },
        message: `${item.serviceType}: ${item.label} | Auto Trigger: ${isAutoTrigger ? 'Yes' : 'No'}`,
      };
    });

  const filteredExpiring = processedExpiring.filter(row => {
    if (!searchQueryExpiring.trim()) return true;
    const q = searchQueryExpiring.toLowerCase().trim();
    const customer = String(row.customer).toLowerCase();
    const phone = String(row.phone).toLowerCase();
    const message = String(row.message).toLowerCase();
    const typeLabel = String(TYPE_LABELS[row.type] || row.type || '').toLowerCase();
    return customer.includes(q) || phone.includes(q) || message.includes(q) || typeLabel.includes(q);
  });

  const totalPagesExpiring = Math.ceil(filteredExpiring.length / itemsPerPage);
  const paginatedExpiring = filteredExpiring.slice(
    (currentPageExpiring - 1) * itemsPerPage,
    currentPageExpiring * itemsPerPage
  );

  const expiringCount = expiringData.domains.length + expiringData.hostings.length + expiringData.emails.length + expiringData.products.length;

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
    <form onSubmit={handleSave} style={{ width: '100%', padding: '0 0 40px' }} noValidate>
      <style>{`
        .sms-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 28px;
        }
        .sms-three-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr 1.7fr;
          gap: 24px;
          margin-bottom: 24px;
          align-items: start;
        }
        .sms-card {
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }
        .sms-save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--brand-color) 0%, #ea580c 100%);
          color: #fff;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(232, 123, 53, 0.2);
        }
        .sms-save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(232, 123, 53, 0.3);
          opacity: 0.95;
        }
        .sms-save-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .sms-logs-wrapper {
          min-width: 0;
        }
        @media (max-width: 1400px) {
          .sms-three-grid {
            grid-template-columns: 1.2fr 1fr;
            gap: 20px;
          }
          .sms-logs-wrapper {
            grid-column: span 2;
          }
        }
        @media (max-width: 850px) {
          .sms-three-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .sms-logs-wrapper {
            grid-column: span 1;
          }
          .sms-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            margin-bottom: 20px;
          }
          .sms-card {
            padding: 16px;
            border-radius: 12px;
          }
          .sms-save-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="sms-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone size={22} style={{ color: c.brand }} />
            SMS Settings
          </h1>
          <p style={{ fontSize: 13, color: c.subText, margin: 0 }}>
            Configure client alerts, send custom manual SMS, and view notifications activity logs.
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

      {/* ── Main Layout Grid ── */}
      <div className="sms-three-grid">

        {/* ── Column 1: Notification Toggles ── */}
        <div className="sms-card" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} style={{ color: c.brand }} />
              Notification Toggles
            </h2>
            <p style={{ fontSize: 12, color: c.subText, margin: 0 }}>
              Control which SMS notifications are active.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
            {/* Enable SMS Notifications */}
            <SettingRow
              id="sms-master-toggle"
              label="Enable SMS Notifications"
              description="Master switch – disabling this stops all SMS delivery."
              value={settings.sms_enabled}
              onChange={v => setSettings(s => ({ ...s, sms_enabled: v }))}
              c={c}
            />

            {/* Renewal Reminders */}
            <SettingRow
              id="sms-renewal-reminder"
              label="Renewal Reminders"
              description={`Send an SMS to customers ${settings.reminder_days} days before their domain, hosting, or email service expires.`}
              value={settings.renewal_reminder}
              onChange={v => setSettings(s => ({ ...s, renewal_reminder: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />
            {settings.renewal_reminder && settings.sms_enabled && (
              <div style={{ padding: '14px 0', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: c.text, display: 'block' }}>Reminder Trigger Window</label>
                  <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>Specify how many days before service expiry to dispatch SMS alerts.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    id="sms-reminder-days"
                    type="number"
                    min={1}
                    max={30}
                    value={settings.reminder_days}
                    onChange={e => setSettings(s => ({ ...s, reminder_days: parseInt(e.target.value, 10) || 3 }))}
                    style={{ ...inputStyle, width: 75, padding: '8px 10px', textAlign: 'center' }}
                    disabled={!settings.renewal_reminder || !settings.sms_enabled}
                    onFocus={e => e.target.style.borderColor = 'var(--brand-color)'}
                    onBlur={e => e.target.style.borderColor = c.inputBorder}
                  />
                  <span style={{ fontSize: 13, color: c.subText, fontWeight: 500 }}>Days</span>
                </div>
              </div>
            )}

            {/* Purchase Thank-You SMS */}
            <SettingRow
              id="sms-purchase"
              label="Purchase Thank-You SMS"
              description="Send a thank-you message when hosting/domain/email or license is activated."
              value={settings.purchase_sms}
              onChange={v => setSettings(s => ({ ...s, purchase_sms: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />

            {/* Expiry Notifications */}
            <SettingRow
              id="sms-expiry-notification"
              label="Expiry Notifications"
              description="Send an SMS on the exact day a domain, hosting, email account, or product license expires, urging the customer to renew."
              value={settings.expiry_notification}
              onChange={v => setSettings(s => ({ ...s, expiry_notification: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />

            {/* Invoice Reminders */}
            <SettingRow
              id="sms-invoice-reminder"
              label="Invoice Reminders"
              description="Send an SMS to customers when invoices are created, 3 days before they are overdue, and on the overdue date."
              value={settings.invoice_sms}
              onChange={v => setSettings(s => ({ ...s, invoice_sms: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />

            {/* Enable Ticket SMS */}
            <SettingRow
              id="sms-ticket-toggle"
              label="Enable Ticket SMS"
              description="Dispatch ticket alerts to administrative phone numbers."
              value={settings.ticket_sms}
              onChange={v => setSettings(s => ({ ...s, ticket_sms: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />
            {settings.ticket_sms && settings.sms_enabled && (
              <div style={{ padding: '14px 0', borderBottom: `1px solid ${c.border}` }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                  Admin Phone Numbers to Notify
                </label>
                
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
                      padding: '0 20px', borderRadius: 10, border: 'none',
                      background: 'var(--brand-color)', color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    Add
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
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

            {/* Enable Login OTP */}
            <SettingRow
              id="sms-login-otp"
              label="Enable Login OTP"
              description="Send a one-time password via SMS for enhanced login security."
              value={settings.login_otp}
              onChange={v => setSettings(s => ({ ...s, login_otp: v }))}
              disabled={!settings.sms_enabled}
              c={c}
            />

            {/* Always Require OTP on Login */}
            <SettingRow
              id="sms-always-otp"
              label="Always Require OTP on Login"
              description="If enabled, every login attempt triggers an OTP even if the session is trusted."
              value={settings.always_otp}
              onChange={v => setSettings(s => ({ ...s, always_otp: v }))}
              disabled={!settings.sms_enabled || !settings.login_otp}
              c={c}
              noBorder={true}
            />
          </div>
        </div>

        {/* ── Column 2: Send Custom SMS & Renewal Reminder Trigger ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Send Custom SMS */}
          <div className="sms-card" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={18} style={{ color: c.brand }} />
                Send a custom SMS
              </h2>
             
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  Phone Number
                </label>
                <input
                  id="sms-test-phone"
                  type="tel"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="e.g. 0771234567 or +94771234567"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--brand-color)'}
                  onBlur={e => e.target.style.borderColor = c.inputBorder}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  Message
                </label>
                <textarea
                  id="sms-test-message"
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  rows={4}
                  maxLength={160}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = 'var(--brand-color)'}
                  onBlur={e => e.target.style.borderColor = c.inputBorder}
                />
                <div style={{ fontSize: 11, color: c.subText, textAlign: 'right', marginTop: 4 }}>
                  {testMessage.length}/160 characters
                </div>
              </div>

              <button
                id="sms-send-test-btn"
                type="button"
                onClick={handleTestSend}
                disabled={testSending || !settings.sms_enabled}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                  background: settings.sms_enabled ? 'linear-gradient(135deg, var(--brand-color) 0%, #ea580c 100%)' : c.borderStrong,
                  color: settings.sms_enabled ? '#fff' : c.subText,
                  fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: (testSending || !settings.sms_enabled) ? 'not-allowed' : 'pointer',
                  opacity: (testSending || !settings.sms_enabled) ? 0.6 : 1,
                  boxShadow: settings.sms_enabled ? '0 4px 12px rgba(232, 123, 53, 0.15)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {testSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send Custom SMS
              </button>
            </div>
          </div>

          {/* Renewal Reminder Trigger */}
          <div className="sms-card" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={16} style={{ color: c.brand }} />
                Renewal Reminder Trigger
              </h2>
              <p style={{ fontSize: 12, color: c.subText, margin: 0, lineHeight: 1.4 }}>
                Manually run the renewal reminder check now. Normally this runs automatically each day. Sends to all customers with services expiring in {settings.reminder_days} days.
              </p>
            </div>

            <button
              id="sms-trigger-reminders-btn"
              type="button"
              onClick={handleTriggerReminders}
              disabled={reminderRunning || !settings.sms_enabled || !settings.renewal_reminder}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 10,
                border: `1.5px solid ${settings.sms_enabled && settings.renewal_reminder ? 'var(--brand-color)' : c.border}`,
                background: 'transparent',
                color: settings.sms_enabled && settings.renewal_reminder ? 'var(--brand-color)' : c.subText,
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: (reminderRunning || !settings.sms_enabled || !settings.renewal_reminder) ? 'not-allowed' : 'pointer',
                opacity: (reminderRunning || !settings.sms_enabled || !settings.renewal_reminder) ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (!reminderRunning && settings.sms_enabled && settings.renewal_reminder) {
                  e.currentTarget.style.background = c.hover;
                }
              }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {reminderRunning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Run Renewal Check Now
            </button>
          </div>
        </div>

        {/* ── Column 3: Collapsible Tables ── */}
        <div className="sms-logs-wrapper">
          {/* Section 1: SMS Activity Log */}
          <CollapsibleCard
            title="SMS Activity Log"
            subtitle="History of dispatched SMS messages and their status."
            icon={History}
            badge={`${logs.filter(log => log.type !== 'otp').length} entries`}
            isExpanded={expandedSections.logs}
            onToggle={() => toggleSection('logs')}
            c={c}
            isDark={isDark}
          >
            {logsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: c.brand }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <div style={{ position: 'relative', width: 220 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchQueryLog}
                      onChange={e => { setSearchQueryLog(e.target.value); setCurrentPageLog(1); }}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 34px',
                        borderRadius: 8,
                        background: c.inputBg,
                        border: `1px solid ${c.inputBorder}`,
                        color: c.text,
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, background: c.panel2, zIndex: 10, borderBottom: `1px solid ${c.border}` }}>
                      <tr>
                        {['Sent At', 'Customer', 'Phone', 'Type', 'Status', 'Message'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: c.subText }}>
                            No matching logs or alerts found.
                          </td>
                        </tr>
                      ) : (
                        paginatedLogs.map(row => (
                          <tr
                            key={row.id}
                            style={{ borderBottom: `1px solid ${c.border}`, transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = c.hover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 16px', color: c.subText, whiteSpace: 'nowrap' }}>
                              {row.sent_at}
                            </td>
                            <td style={{ padding: '12px 16px', color: c.text, fontWeight: 600 }}>
                              {row.customer}
                            </td>
                            <td style={{ padding: '12px 16px', color: c.subText, fontFamily: 'monospace' }}>
                              {row.phone}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <TypeBadge type={row.type} />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <StatusBadge status={row.status} />
                            </td>
                            <td style={{ padding: '12px 16px', color: c.subText, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.message}>
                              {row.message}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPagesLog > 1 && (
                  <Pagination
                    page={currentPageLog}
                    totalPages={totalPagesLog}
                    total={filteredLogs.length}
                    perPage={itemsPerPage}
                    onPage={setCurrentPageLog}
                    onPerPage={setItemsPerPage}
                    c={c}
                  />
                )}
              </>
            )}

            <button
              type="button"
              onClick={fetchLogsAndOverviews}
              disabled={logsLoading}
              style={{
                marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', color: c.subText, fontSize: 12,
                cursor: 'pointer', padding: 0, transition: 'color 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = c.text}
              onMouseLeave={e => e.currentTarget.style.color = c.subText}
            >
              <RefreshCw size={12} style={{ animation: logsLoading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh data
            </button>
          </CollapsibleCard>

          {/* Section 2: Invoice SMS Settings & Reminders */}
          <CollapsibleCard
            title="Invoice SMS Settings & Reminders"
            subtitle="Overdue warning notifications (fixed to 3 days before overdue date)."
            icon={FileText}
            badge={`${processedInvoices.length} invoices`}
            isExpanded={expandedSections.invoices}
            onToggle={() => toggleSection('invoices')}
            c={c}
            isDark={isDark}
          >
            {logsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: c.brand }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <div style={{ position: 'relative', width: 220 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchQueryInvoice}
                      onChange={e => { setSearchQueryInvoice(e.target.value); setCurrentPageInvoice(1); }}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 34px',
                        borderRadius: 8,
                        background: c.inputBg,
                        border: `1px solid ${c.inputBorder}`,
                        color: c.text,
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, background: c.panel2, zIndex: 10, borderBottom: `1px solid ${c.border}` }}>
                      <tr>
                        {['Due Date', 'Customer', 'Phone', 'Type', 'Status', 'Message'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: c.subText }}>
                            No matching unpaid invoices found.
                          </td>
                        </tr>
                      ) : (
                        paginatedInvoices.map(row => (
                          <tr
                            key={row.id}
                            style={{ borderBottom: `1px solid ${c.border}`, transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = c.hover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 16px', color: c.subText, whiteSpace: 'nowrap' }}>
                              {row.sent_at}
                            </td>
                            <td style={{ padding: '12px 16px', color: c.text, fontWeight: 600 }}>
                              {row.customer}
                            </td>
                            <td style={{ padding: '12px 16px', color: c.subText, fontFamily: 'monospace' }}>
                              {row.phone}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <TypeBadge type={row.type} />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <StatusBadge status={row.status} />
                            </td>
                            <td style={{ padding: '12px 16px', color: c.subText, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.message}>
                              {row.message}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPagesInvoice > 1 && (
                  <Pagination
                    page={currentPageInvoice}
                    totalPages={totalPagesInvoice}
                    total={filteredInvoices.length}
                    perPage={itemsPerPage}
                    onPage={setCurrentPageInvoice}
                    onPerPage={setItemsPerPage}
                    c={c}
                  />
                )}
              </>
            )}
          </CollapsibleCard>

          {/* Section 3: Services Expiring in Next 30 Days */}
          <CollapsibleCard
            title="Services Expiring in Next 30 Days"
            subtitle="Active domains, hostings, email accounts and product licenses that are coming up for renewal. SMS reminders will be sent automatically."
            icon={AlertCircle}
            badge={`${processedExpiring.length} items`}
            isExpanded={expandedSections.expiring}
            onToggle={() => toggleSection('expiring')}
            c={c}
            isDark={isDark}
          >
            {logsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: c.brand }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <div style={{ position: 'relative', width: 220 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
                    <input
                      type="text"
                      placeholder="Search expiring services..."
                      value={searchQueryExpiring}
                      onChange={e => { setSearchQueryExpiring(e.target.value); setCurrentPageExpiring(1); }}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 34px',
                        borderRadius: 8,
                        background: c.inputBg,
                        border: `1px solid ${c.inputBorder}`,
                        color: c.text,
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, background: c.panel2, zIndex: 10, borderBottom: `1px solid ${c.border}` }}>
                      <tr>
                        {['Expiry Date', 'Customer', 'Phone', 'Type', 'Status', 'Message'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedExpiring.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: c.subText }}>
                            No matching expiring services found.
                          </td>
                        </tr>
                      ) : (
                        paginatedExpiring.map(row => (
                          <tr
                            key={row.id}
                            style={{ borderBottom: `1px solid ${c.border}`, transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = c.hover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 16px', color: c.subText, whiteSpace: 'nowrap' }}>
                              {row.sent_at}
                            </td>
                            <td style={{ padding: '12px 16px', color: c.text, fontWeight: 600 }}>
                              {row.customer}
                            </td>
                            <td style={{ padding: '12px 16px', color: c.subText, fontFamily: 'monospace' }}>
                              {row.phone}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <TypeBadge type={row.type} />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <StatusBadge status={row.status} />
                            </td>
                            <td style={{ padding: '12px 16px', color: c.subText, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.message}>
                              {row.message}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPagesExpiring > 1 && (
                  <Pagination
                    page={currentPageExpiring}
                    totalPages={totalPagesExpiring}
                    total={filteredExpiring.length}
                    perPage={itemsPerPage}
                    onPage={setCurrentPageExpiring}
                    onPerPage={setItemsPerPage}
                    c={c}
                  />
                )}
              </>
            )}
          </CollapsibleCard>
        </div>

      </div>

    </form>
  );
}
