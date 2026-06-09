import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt, Wallet, CheckCircle, AlertTriangle, RefreshCw,
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Eye, Download, X, Globe, Server, Shield, Cpu, Calendar,
  CreditCard, Upload, Clock
} from 'lucide-react';
import { getCustomerInvoices, getPublicInvoiceSettings, getInvoiceSettings, submitInvoicePayment, getLatestPaymentByInvoice, resubmitPaymentInfo, fmtCurrency } from '@/lib/invoices';
import { assertPortalActionsAllowed } from '@/lib/storage';

const PAGE_SIZE = 6;

function svcIcon(type, size = 14) {
  const s = String(type || '').toLowerCase();
  if (s.includes('domain')) return <Globe size={size} />;
  if (s.includes('vps')) return <Cpu size={size} />;
  if (s.includes('ssl')) return <Shield size={size} />;
  return <Server size={size} />;
}

function fmtAmt(n, currency = 'LKR') {
  return fmtCurrency(n, currency);
}

function formatCurrencyBreakdown(invoicesList) {
  const totals = (invoicesList || []).reduce((acc, inv) => {
    const cur = inv.currency === 'USD' ? 'USD' : 'LKR';
    acc[cur] += inv.total || 0;
    return acc;
  }, { LKR: 0, USD: 0 });

  return ['LKR', 'USD']
    .map(cur => fmtCurrency(totals[cur], cur))
    .join(' / ') || fmtCurrency(0, 'LKR');
}

function formatOutstandingBreakdown(invoicesList) {
  const totals = (invoicesList || []).reduce((acc, inv) => {
    const cur = inv.currency === 'USD' ? 'USD' : 'LKR';
    const due = (inv.status !== 'paid') ? (inv.total - (inv.paid_amount || 0)) : 0;
    acc[cur] += due;
    return acc;
  }, { LKR: 0, USD: 0 });

  return ['LKR', 'USD']
    .map(cur => fmtCurrency(totals[cur], cur))
    .join(' / ') || fmtCurrency(0, 'LKR');
}

function parseDateStr(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function monthKey(d) { return `${d.getFullYear()}-${d.getMonth()}`; }
function dayKey(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function fmtMonthYear(d) { return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
function fmtDay(d) { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }

function BadgeComponent({ status, style: badgeStyle = 'filled' }) {
  const cfg = {
    paid: { label: 'Paid', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: '#22c55e' },
    unpaid: { label: 'Unpaid', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: '#f59e0b' },
    overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: '#ef4444' },
    payment_submitted: { label: 'Pending Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: '#3b82f6' },
    partially_paid: { label: 'Partially Paid', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', border: '#a855f7' },
  }[status] || { label: status, color: '#888', bg: 'rgba(136,136,136,0.1)', border: '#888' };

  if (badgeStyle === 'dot') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        {cfg.label}
      </span>
    );
  }
  if (badgeStyle === 'outline') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>
        {cfg.label}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function KpiTile({ icon, label, value, sub, subColor, c, isDark }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: c.text, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      <div style={{ fontSize: 12, color: subColor || c.subText }}>{sub}</div>
    </div>
  );
}

function DarkCalendar({ invoiceDates, calFilter, onDayClick, onMonthClick, c, isDark }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const invoiceDayKeys = new Set(invoiceDates.map(d => dayKey(d)));
  const invoiceMonthKeys = new Set(invoiceDates.map(d => monthKey(d)));
  const thisMonthKey = `${viewYear}-${viewMonth}`;
  const isMonthFiltered = calFilter.mode === 'month' && calFilter.year === viewYear && calFilter.month === viewMonth;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const brand = c.brand;
  const todayKey = dayKey(today);

  let footerText = 'Showing all invoices';
  if (calFilter.mode === 'day') footerText = `Showing ${fmtDay(new Date(calFilter.year, calFilter.month, calFilter.day))}`;
  else if (calFilter.mode === 'month') footerText = `Showing ${fmtMonthYear(new Date(calFilter.year, calFilter.month, 1))}`;

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><ChevronLeft size={16} /></button>
        <button
          onClick={() => onMonthClick(viewYear, viewMonth)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: isMonthFiltered ? brand : c.text, padding: '2px 8px', borderRadius: 6, background: isMonthFiltered ? `rgba(232,123,53,0.12)` : 'none' }}
        >
          {fmtMonthYear(new Date(viewYear, viewMonth, 1))}
        </button>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><ChevronRight size={16} /></button>
      </div>

      <div style={{ padding: '10px 12px' }}>
        {/* Weekdays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, padding: '3px 0' }}>{d}</div>
          ))}
        </div>
        {/* Day grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />;
            const cellDayKey = dayKey(new Date(viewYear, viewMonth, day));
            const isToday = cellDayKey === todayKey;
            const hasInvoice = invoiceDayKeys.has(cellDayKey);
            const isSelected = calFilter.mode === 'day' && calFilter.year === viewYear && calFilter.month === viewMonth && calFilter.day === day;
            const isMonthTinted = calFilter.mode === 'month' && calFilter.year === viewYear && calFilter.month === viewMonth;
            return (
              <div key={idx}
                onClick={() => onDayClick(viewYear, viewMonth, day)}
                style={{
                  textAlign: 'center', borderRadius: 7, padding: '5px 0', cursor: 'pointer', position: 'relative',
                  background: isSelected ? brand : isMonthTinted ? 'rgba(232,123,53,0.10)' : 'transparent',
                  color: isSelected ? '#fff' : hasInvoice ? (isDark ? '#fff' : '#1a1a1a') : c.subText,
                  fontWeight: hasInvoice || isToday ? 700 : 400,
                  fontSize: 12,
                  border: isToday && !isSelected ? `1.5px dashed ${brand}` : '1.5px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? brand : isMonthTinted ? 'rgba(232,123,53,0.10)' : 'transparent'; }}
              >
                {day}
                {hasInvoice && !isSelected && (
                  <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: brand }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
        <div style={{ fontSize: 11, color: c.subText, marginBottom: calFilter.mode !== 'none' ? 6 : 0 }}>{footerText}</div>
        {calFilter.mode !== 'none' && (
          <button onClick={() => onDayClick(null)} style={{ fontSize: 11, color: brand, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Clear filter</button>
        )}
        <div style={{ fontSize: 10, color: c.subText, marginTop: 6, opacity: 0.7 }}>
          Tap a date to filter that day · Tap the month name to filter the whole month
        </div>
      </div>
    </div>
  );
}

function InvoiceDrawer({ invoice, settings, badgeStyle, isDark, c, onClose, isMobile = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!invoice) return null;

  const items = invoice.items || [];
  const subtotal = items.reduce((s, it) => s + (it.qty || 1) * (it.unit_price || 0), 0);
  const tax = 0;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: isMobile ? '100vw' : 640, maxWidth: '100vw', background: c.card, borderLeft: `1px solid ${c.border}`, boxShadow: '-4px 0 32px rgba(0,0,0,0.3)', zIndex: 201, display: 'flex', flexDirection: 'column', overflowY: 'auto', animation: 'slideIn 0.2s ease' }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        {/* Drawer header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={18} style={{ color: c.brand }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Invoice {invoice.invoice_no}</span>
            <BadgeComponent status={invoice.status} style={badgeStyle} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        {/* PDF-style document in light theme */}
        <div style={{ margin: '20px 24px', background: '#f7f5f1', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', flex: 1, minHeight: 0, position: 'relative' }}>
          {/* PAID stamp */}
          {invoice.status === 'paid' && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: 72, fontWeight: 900, color: 'rgba(34,197,94,0.15)', letterSpacing: 4, pointerEvents: 'none', zIndex: 2, userSelect: 'none' }}>
              PAID
            </div>
          )}
          <div style={{ padding: '32px 36px', color: '#1a1a1a', position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#e87b35', letterSpacing: 2 }}>{settings?.company_name || 'NEXTIOM'}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{settings?.address || ''}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{settings?.phone || ''}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{settings?.website || ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: '#1a1a1a' }}>INVOICE</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#e87b35', marginTop: 4 }}>#{invoice.invoice_no}</div>
              </div>
            </div>

            {/* Bill to + dates */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1.5px solid #e0ddd8' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>Billed To</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{invoice.client_name}</div>
                {invoice.client_company && <div style={{ fontSize: 12, color: '#555' }}>{invoice.client_company}</div>}
                {invoice.client_email && <div style={{ fontSize: 12, color: '#555' }}>{invoice.client_email}</div>}
                {invoice.client_phone && <div style={{ fontSize: 12, color: '#555' }}>{invoice.client_phone}</div>}
                {invoice.client_address && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{invoice.client_address}</div>}
              </div>
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#888' }}>Issue Date</span>
                    <span style={{ fontWeight: 600 }}>{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#888' }}>Due Date</span>
                    <span style={{ fontWeight: 600 }}>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#888' }}>Status</span>
                    <BadgeComponent status={invoice.status} style="filled" />
                  </div>
                </div>
              </div>
            </div>

            {/* Line items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#f0ede8' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', width: 50 }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id || i} style={{ borderBottom: '1px solid #e8e5e0' }}>
                    <td style={{ padding: '9px 10px', fontSize: 13 }}>{item.description}</td>
                    <td style={{ padding: '9px 10px', fontSize: 13, textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ padding: '9px 10px', fontSize: 13, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                      {fmtAmt(item.qty * item.unit_price, invoice.currency)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '12px 10px', textAlign: 'center', color: '#888', fontSize: 12, fontStyle: 'italic' }}>No line items</td></tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#888' }}>Subtotal</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtAmt(subtotal, invoice.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: '#888' }}>Tax</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtAmt(tax, invoice.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, borderTop: '2px solid #1a1a1a', paddingTop: 8 }}>
                  <span>Total</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#e87b35' }}>{fmtAmt(invoice.total ?? subtotal + tax, invoice.currency)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div style={{ marginTop: 24, padding: '12px 14px', background: '#f0ede8', borderRadius: 8, fontSize: 11, color: '#666', lineHeight: 1.6, borderLeft: '3px solid #e87b35' }}>
                {invoice.notes}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => {
              localStorage.setItem('nxt_invoice_print', JSON.stringify({ ...invoice, settings }));
              window.open('/invoices/print', '_blank');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            <Download size={14} /> Download PDF
          </button>
          {invoice.status === 'paid' && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#22c55e', fontWeight: 600, padding: '5px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: 20 }}>
              ✓ Paid on {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function PaymentStatusDialog({ invoice, isDark, c, onClose, onChanged, isMobile = false }) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getLatestPaymentByInvoice(invoice.id).then(p => { setPayment(p); setLoading(false); }).catch(() => setLoading(false));
  }, [invoice.id]);

  const handleResubmit = async () => {
    try {
      await assertPortalActionsAllowed();
      if (!reply.trim()) { setErr('Please add a reply'); return; }
      setErr(''); setSubmitting(true);
      await resubmitPaymentInfo(payment, invoice, reply.trim(), file);
      onChanged(); onClose();
    } catch (e) {
      setErr(e?.message || 'Failed to send');
    } finally { setSubmitting(false); }
  };

  const lbl = { fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 };
  const val = { fontSize: 13, color: c.text, marginBottom: 10 };
  const needsReply = payment && payment.status === 'info_requested';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 300 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: isMobile ? '96vw' : 720, maxWidth: '96vw', maxHeight: '92vh', background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={18} style={{ color: c.brand }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Payment Status — {invoice.invoice_no}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ color: c.subText, fontSize: 13 }}>Loading…</div>
          ) : !payment ? (
            <div style={{ color: c.subText, fontSize: 13 }}>No payment submission found.</div>
          ) : (
            <>
              {needsReply && (
                <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, background: 'rgba(232,123,53,0.08)', border: `1px solid ${c.brand}40` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.brand, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Admin requested more information</div>
                  <div style={{ fontSize: 13, color: c.text, lineHeight: 1.55 }}>{payment.admin_reason}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
                <div>
                  <div style={lbl}>Status</div>
                  <div style={val}>
                    {needsReply ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 12, background: 'rgba(232,123,53,0.15)', color: c.brand, fontSize: 11, fontWeight: 700 }}>Action Required</span>
                    ) : (
                      <BadgeComponent status="payment_submitted" />
                    )}
                  </div>
                  <div style={lbl}>Transaction ID</div>
                  <div style={{ ...val, fontFamily: 'JetBrains Mono, monospace' }}>{payment.transaction_id}</div>
                  <div style={lbl}>Paid Amount</div>
                  <div style={{ ...val, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: c.brand }}>{fmtAmt(payment.paid_amount, invoice.currency)}</div>
                  <div style={lbl}>Payment Date</div>
                  <div style={val}>{payment.payment_date}</div>
                  {payment.notes && (<><div style={lbl}>Notes</div><div style={{ ...val, whiteSpace: 'pre-wrap' }}>{payment.notes}</div></>)}
                  <div style={lbl}>Submitted</div>
                  <div style={val}>{payment.created_at ? new Date(payment.created_at).toLocaleString() : '—'}</div>
                </div>
                <div>
                  <div style={lbl}>Payment Slip</div>
                  {payment.slip_url ? (
                    <div style={{ border: `1px solid ${c.border}`, borderRadius: 8, overflow: 'hidden', background: isDark ? '#22252C' : '#fafafa' }}>
                      {/\.(png|jpe?g|gif|webp)(?:\?.*)?$/i.test(payment.slip_url) ? (
                        <img src={payment.slip_url} alt="slip" style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'contain' }} />
                      ) : (
                        <div style={{ padding: 20, fontSize: 13, color: c.text }}>Slip uploaded (PDF/other).</div>
                      )}
                      <a href={payment.slip_url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px 12px', borderTop: `1px solid ${c.border}`, color: c.brand, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Open original</a>
                    </div>
                  ) : (
                    <div style={{ ...val, fontStyle: 'italic' }}>No slip uploaded</div>
                  )}
                </div>
              </div>

              {needsReply && (
                <div style={{ marginTop: 18, borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
                  <div style={{ ...lbl, marginBottom: 6 }}>Your Reply</div>
                  <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Provide the information the admin requested…"
                    style={{ width: '100%', minHeight: 80, padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: `1.5px dashed ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fafafa', color: c.subText, cursor: 'pointer', fontSize: 13 }}>
                    <Upload size={14} />
                    <span>{file ? file.name : 'Attach a new file (optional)'}</span>
                    <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                  </label>
                  {err && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>{err}</div>}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={submitting} style={{ padding: '8px 18px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Close</button>
          {needsReply && (
            <button onClick={handleResubmit} disabled={submitting || !reply.trim()} style={{ padding: '8px 20px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: submitting ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, opacity: submitting || !reply.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
              {submitting ? 'Sending…' : 'Resubmit'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function PayInvoiceDialog({ invoice, settings, isDark, c, onClose, onSubmitted, isMobile = false }) {
  const [txn, setTxn] = useState('');
  const remainingAmount = (invoice.total || 0) - (invoice.paid_amount || 0);
  const [amount, setAmount] = useState(String(remainingAmount > 0 ? remainingAmount : invoice.total ?? ''));
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    try {
      await assertPortalActionsAllowed();
      if (!txn.trim()) { setErr('Transaction ID / reference is required'); return; }
      if (!amount || Number(amount) <= 0) { setErr('Paid amount is required'); return; }
      if (!payDate) { setErr('Payment date is required'); return; }
      setErr('');
      setSubmitting(true);
      await submitInvoicePayment(invoice, {
        transaction_id: txn.trim(),
        paid_amount: Number(amount),
        payment_date: payDate,
        notes: notes.trim() || undefined,
      }, file);
      onSubmitted();
      onClose();
    } catch (e) {
      setErr(e?.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const inp = {
    width: '100%', padding: '9px 12px', border: `1.5px solid ${c.border}`,
    borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const label = { fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5, display: 'block' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 300 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: isMobile ? '96vw' : 880, maxWidth: '96vw', maxHeight: '92vh', background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={18} style={{ color: c.brand }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Pay Invoice — {invoice.invoice_no}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 22 }}>
          {/* Left: form */}
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Transaction ID / Reference *</label>
              <input style={inp} value={txn} onChange={e => setTxn(e.target.value)} placeholder="e.g. TXN123456" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={label}>Paid Amount ({invoice.currency || 'LKR'}) *</label>
                <input style={inp} type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <label style={label}>Payment Date *</label>
                <input style={inp} type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Notes (optional)</label>
              <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything we should know…" />
            </div>
            <div>
              <label style={label}>Upload Payment Slip</label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', border: `1.5px dashed ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fafafa', color: c.subText, cursor: 'pointer', fontSize: 13 }}>
                <Upload size={15} />
                <span>{file ? file.name : 'Click to choose a file (image or PDF)'}</span>
                <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Right: bank details + summary */}
          <div>
            <div style={{ background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Bank Details</div>
              {settings ? (
                <div style={{ fontSize: 13, color: c.text, lineHeight: 1.7 }}>
                  <div><span style={{ color: c.subText }}>Bank:</span> {settings.bank_name}</div>
                  <div><span style={{ color: c.subText }}>Branch:</span> {settings.bank_branch}</div>
                  <div><span style={{ color: c.subText }}>Account Name:</span> {settings.account_name}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace' }}><span style={{ color: c.subText, fontFamily: 'inherit' }}>Account #:</span> {settings.account_no}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: c.subText }}>Loading bank details…</div>
              )}
            </div>
            <div style={{ background: isDark ? 'rgba(232,123,53,0.08)' : 'rgba(232,123,53,0.06)', border: `1px solid ${c.brand}40`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>Invoice Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.text, marginBottom: 4 }}>
                <span>Invoice Total:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{fmtAmt(invoice.total, invoice.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.text, marginBottom: 4 }}>
                <span>Paid So Far:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#22c55e' }}>{fmtAmt(invoice.paid_amount || 0, invoice.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.text, marginBottom: 4, borderTop: `1px dashed ${c.border}`, paddingTop: 4 }}>
                <span>Remaining Balance:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#ef4444' }}>{fmtAmt(remainingAmount, invoice.currency)}</span>
              </div>
              <div style={{ fontSize: 11, color: c.subText, marginTop: 8 }}>Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
            </div>
          </div>
        </div>

        {err && (
          <div style={{ margin: '0 22px 12px', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>{err}</div>
        )}

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={submitting} style={{ padding: '8px 18px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 20px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: submitting ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, opacity: submitting ? 0.7 : 1, fontFamily: 'inherit' }}>
            {submitting ? 'Submitting…' : 'Submit Payment'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function CustomerInvoicesPage({ user, isDark, c }) {
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [calFilter, setCalFilter] = useState({ mode: 'none' });
  const [openInvoice, setOpenInvoice] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);
  const [statusInvoice, setStatusInvoice] = useState(null);
  const [badgeStyle, setBadgeStyle] = useState('filled');
  const [showTweaks, setShowTweaks] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });

  const email = user?.email || '';

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    Promise.all([getCustomerInvoices(email), getPublicInvoiceSettings()])
      .then(([invs, sett]) => {
        const getLocalDateString = () => {
          const d = new Date();
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const todayStr = getLocalDateString();
        const mapped = (invs || []).map(inv => {
          const cleanDueDate = inv.due_date ? inv.due_date.substring(0, 10) : '';
          if (inv.status !== 'paid' && inv.status !== 'payment_submitted' && cleanDueDate && cleanDueDate < todayStr) {
            return { ...inv, status: 'overdue' };
          }
          return inv;
        });
        setInvoices(mapped);
        setSettings(sett);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email, refreshKey]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const onChange = (e) => setIsMobile(e.matches);
    onChange(media);
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  const invoiceDates = useMemo(() =>
    invoices.map(inv => parseDateStr(inv.invoice_date)).filter(Boolean), [invoices]);

  const filtered = useMemo(() => {
    let arr = invoices.filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const desc = (inv.invoice_no + ' ' + (inv.items || []).map(it => it.description).join(' ')).toLowerCase();
        if (!desc.includes(q)) return false;
      }
      if (calFilter.mode === 'day') {
        const d = parseDateStr(inv.invoice_date);
        if (!d) return false;
        if (d.getFullYear() !== calFilter.year || d.getMonth() !== calFilter.month || d.getDate() !== calFilter.day) return false;
      } else if (calFilter.mode === 'month') {
        const d = parseDateStr(inv.invoice_date);
        if (!d) return false;
        if (d.getFullYear() !== calFilter.year || d.getMonth() !== calFilter.month) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      const da = new Date(a.invoice_date || 0), db = new Date(b.invoice_date || 0);
      return sortDir === 'asc' ? da - db : db - da;
    });
    return arr;
  }, [invoices, statusFilter, query, calFilter, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [query, statusFilter, calFilter, sortDir]);

  const totalBilled = formatCurrencyBreakdown(invoices);
  const outstanding = formatOutstandingBreakdown(invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partially_paid'));
  const unpaidCount = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partially_paid').length;
  const thisYear = new Date().getFullYear();
  const paidThisYear = formatCurrencyBreakdown(invoices.filter(inv => inv.status === 'paid' && new Date(inv.invoice_date || 0).getFullYear() === thisYear));
  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
  const overduePast = formatOutstandingBreakdown(invoices.filter(inv => inv.status === 'overdue'));

  const anyFilter = query || statusFilter !== 'all' || calFilter.mode !== 'none';

  const handleDayClick = (year, month, day) => {
    if (year === null) { setCalFilter({ mode: 'none' }); return; }
    if (calFilter.mode === 'day' && calFilter.year === year && calFilter.month === month && calFilter.day === day) {
      setCalFilter({ mode: 'none' });
    } else {
      setCalFilter({ mode: 'day', year, month, day });
    }
  };

  const handleMonthClick = (year, month) => {
    if (calFilter.mode === 'month' && calFilter.year === year && calFilter.month === month) {
      setCalFilter({ mode: 'none' });
    } else {
      setCalFilter({ mode: 'month', year, month });
    }
  };

  const handleDownload = (inv) => {
    localStorage.setItem('nxt_invoice_print', JSON.stringify({ ...inv, settings }));
    window.open('/invoices/print', '_blank');
    // Toast-like notification
    const el = document.createElement('div');
    el.innerText = `Downloading ${inv.invoice_no}.pdf`;
    Object.assign(el.style, { position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  };

  const thS = { padding: '11px 10px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}`, textAlign: 'left', whiteSpace: 'nowrap' };
  const tdS = { padding: '12px 10px', borderTop: `1px solid ${c.border}`, fontSize: 13, color: c.text, verticalAlign: 'middle', whiteSpace: 'nowrap' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.06)' };

  const a = loading ? null : (page - 1) * PAGE_SIZE + 1;
  const b = loading ? null : Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Invoices & Billing</h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 4 }}>View and download your invoices from Nextiom</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={() => setRefreshKey(k => k + 1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowTweaks(!showTweaks)} style={{ padding: '7px 13px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Tweaks</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile icon={<Receipt size={18} style={{ color: c.brand }} />} label="Total Billed" value={totalBilled} sub={`Across ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`} c={c} isDark={isDark} />
        <KpiTile icon={<Wallet size={18} style={{ color: '#f59e0b' }} />} label="Outstanding Balance" value={<span style={{ color: c.brand }}>{outstanding}</span>} sub={`${unpaidCount} unpaid`} subColor="#f59e0b" c={c} isDark={isDark} />
        <KpiTile icon={<CheckCircle size={18} style={{ color: '#22c55e' }} />} label="Paid This Year" value={<span style={{ color: '#22c55e' }}>{paidThisYear}</span>} sub={`${thisYear} to date`} subColor="#22c55e" c={c} isDark={isDark} />
        <KpiTile icon={<AlertTriangle size={18} style={{ color: '#ef4444' }} />} label="Overdue" value={<span style={{ color: '#ef4444' }}>{overdueCount}</span>} sub={`${overduePast} past due`} subColor="#ef4444" c={c} isDark={isDark} />
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 20, alignItems: 'start' }}>
        {/* All Invoices */}
        <div style={cardS}>
          {/* Card header */}
          <div style={{ padding: '15px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: c.brand, flexShrink: 0 }} />
            <Receipt size={15} style={{ color: c.brand }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>All Invoices</span>
            <span style={{ fontSize: 12, color: c.subText }}>{filtered.length} of {invoices.length}</span>
            <button onClick={() => setRefreshKey(k => k + 1)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><RefreshCw size={14} /></button>
          </div>

          {/* Toolbar */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 0 220px' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
              <input
                style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                placeholder="Search invoice # or service…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
                  <div style={{ display: 'flex', border: `1.5px solid ${c.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {['all', 'paid', 'unpaid', 'overdue', 'payment_submitted', 'partially_paid'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: '6px 12px', border: 'none', borderRight: `1px solid ${c.border}`, background: statusFilter === s ? c.brand : 'transparent', color: statusFilter === s ? '#fff' : c.subText, fontSize: 12, fontWeight: statusFilter === s ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {s === 'all' ? 'All' : s === 'payment_submitted' ? 'Pending Review' : s === 'partially_paid' ? 'Partially Paid' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {/* Sort */}
            <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 12, cursor: 'pointer' }}>
              <Calendar size={13} /> Date
              {sortDir === 'desc' ? <ChevronDown size={12} style={{ transition: '0.15s' }} /> : <ChevronUp size={12} style={{ transition: '0.15s' }} />}
              <span style={{ color: c.subText }}>{sortDir === 'desc' ? 'Newest first' : 'Oldest first'}</span>
            </button>
            {anyFilter && (
              <button onClick={() => { setQuery(''); setStatusFilter('all'); setCalFilter({ mode: 'none' }); }}
                style={{ padding: '6px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.subText, fontSize: 12, cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: c.subText }}>Loading invoices…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: isMobile ? 740 : '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thS}>Invoice</th>
                  <th style={thS}>Service</th>
                  <th style={{ ...thS, cursor: 'pointer' }} onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Issue Date {sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                    </span>
                  </th>
                  <th style={thS}>Status</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Total</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Paid</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((inv, i) => {
                  const firstItem = (inv.items || [])[0];
                  const service = firstItem?.description || inv.invoice_no;
                  return (
                    <tr key={inv.id}
                      onClick={() => handleDownload(inv)}
                      style={{ cursor: 'pointer', background: 'transparent', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f9f9f9'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={tdS}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13, color: isDark ? '#93c5fd' : '#2563eb' }}>{inv.invoice_no}</span>
                      </td>
                      <td style={tdS}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: c.brand }}>{svcIcon('hosting', 14)}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{service}</div>
                          </div>
                        </div>
                      </td>
                      <td style={tdS}>
                        <span style={{ fontSize: 13, color: c.subText }}>
                          {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td style={tdS}><BadgeComponent status={inv.status} style={badgeStyle} /></td>
                      <td style={{ ...tdS, textAlign: 'right' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13 }}>{fmtAmt(inv.total, inv.currency)}</span>
                      </td>
                      <td style={{ ...tdS, textAlign: 'right' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13, color: inv.paid_amount > 0 ? '#22c55e' : c.subText }}>
                          {fmtAmt(inv.paid_amount || 0, inv.currency)}
                        </span>
                      </td>
                      <td style={{ ...tdS, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {(inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
                            <button onClick={() => setPayInvoice(inv)} title="Pay this invoice" style={{ background: c.brand, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                              <CreditCard size={13} /> Pay Invoice
                            </button>
                          )}
                          {inv.status === 'payment_submitted' && (
                            <button onClick={() => setStatusInvoice(inv)} title="View payment status" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                              <Clock size={13} /> Pending Review
                            </button>
                          )}
                          <button onClick={() => handleDownload(inv)} title="View / Download PDF" style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: c.subText, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            <Eye size={13} /> View PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' }}>
                    {invoices.length === 0 ? 'No invoices found. Contact support if you believe this is an error.' : 'No invoices match your current filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: c.subText }}>Showing {a}–{b} of {filtered.length}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 8px', border: `1px solid ${c.border}`, borderRadius: 6, background: 'transparent', color: page === 1 ? c.subText : c.text, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    style={{ padding: '4px 9px', border: `1px solid ${n === page ? c.brand : c.border}`, borderRadius: 6, background: n === page ? c.brand : 'transparent', color: n === page ? '#fff' : c.text, cursor: 'pointer', fontSize: 12, fontWeight: n === page ? 700 : 400 }}>
                    {n}
                  </button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 8px', border: `1px solid ${c.border}`, borderRadius: 6, background: 'transparent', color: page === totalPages ? c.subText : c.text, cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column — calendar */}
        <div>
          <DarkCalendar
            invoiceDates={invoiceDates}
            calFilter={calFilter}
            onDayClick={handleDayClick}
            onMonthClick={handleMonthClick}
            c={c}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Invoice Drawer */}
      {openInvoice && (
        <InvoiceDrawer invoice={openInvoice} settings={settings} badgeStyle={badgeStyle} isDark={isDark} c={c} onClose={() => setOpenInvoice(null)} isMobile={isMobile} />
      )}

      {/* Payment Status Dialog (view + reply) */}
      {statusInvoice && (
        <PaymentStatusDialog
          invoice={statusInvoice}
          isDark={isDark}
          c={c}
          onClose={() => setStatusInvoice(null)}
          onChanged={() => setRefreshKey(k => k + 1)}
          isMobile={isMobile}
        />
      )}

      {/* Pay Invoice Dialog */}
      {payInvoice && (
        <PayInvoiceDialog
          invoice={payInvoice}
          settings={settings}
          isDark={isDark}
          c={c}
          onClose={() => setPayInvoice(null)}
          onSubmitted={() => setRefreshKey(k => k + 1)}
          isMobile={isMobile}
        />
      )}

      {/* Tweaks panel */}
      {showTweaks && (
        <div style={{ position: 'fixed', bottom: 80, right: isMobile ? 12 : 24, left: isMobile ? 12 : 'auto', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 300, minWidth: isMobile ? 'auto' : 200 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.subText, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>Badge Style</div>
          {['filled', 'outline', 'dot'].map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input type="radio" name="badgeStyle" value={s} checked={badgeStyle === s} onChange={() => setBadgeStyle(s)} style={{ accentColor: c.brand }} />
              <span style={{ fontSize: 13, color: c.text, textTransform: 'capitalize' }}>{s}</span>
              <BadgeComponent status="paid" style={s} />
            </label>
          ))}
          <button onClick={() => setShowTweaks(false)} style={{ marginTop: 8, width: '100%', padding: '6px', border: `1px solid ${c.border}`, borderRadius: 6, background: 'transparent', color: c.subText, cursor: 'pointer', fontSize: 12 }}>Close</button>
        </div>
      )}
    </div>
  );
}
