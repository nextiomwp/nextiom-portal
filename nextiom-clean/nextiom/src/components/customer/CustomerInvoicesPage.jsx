import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt, Wallet, CheckCircle, AlertTriangle, RefreshCw,
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Eye, Download, X, Globe, Server, Shield, Cpu, Calendar
} from 'lucide-react';
import { getCustomerInvoices, getPublicInvoiceSettings } from '@/lib/invoices';

const PAGE_SIZE = 6;

function svcIcon(type, size = 14) {
  const s = String(type || '').toLowerCase();
  if (s.includes('domain')) return <Globe size={size} />;
  if (s.includes('vps')) return <Cpu size={size} />;
  if (s.includes('ssl')) return <Shield size={size} />;
  return <Server size={size} />;
}

function fmtAmt(n) {
  return 'LKR ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  }[status] || { label: status, color: '#888', bg: 'rgba(136,136,136,0.1)', border: '#888' };

  if (badgeStyle === 'dot') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: cfg.color }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        {cfg.label}
      </span>
    );
  }
  if (badgeStyle === 'outline') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '2px 9px' }}>
        {cfg.label}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, borderRadius: 20, padding: '2px 9px' }}>
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

function InvoiceDrawer({ invoice, settings, badgeStyle, isDark, c, onClose }) {
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
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 640, maxWidth: '95vw', background: c.card, borderLeft: `1px solid ${c.border}`, boxShadow: '-4px 0 32px rgba(0,0,0,0.3)', zIndex: 201, display: 'flex', flexDirection: 'column', overflowY: 'auto', animation: 'slideIn 0.2s ease' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1.5px solid #e0ddd8' }}>
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
                      {fmtAmt(item.qty * item.unit_price)}
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
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtAmt(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: '#888' }}>Tax</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtAmt(tax)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, borderTop: '2px solid #1a1a1a', paddingTop: 8 }}>
                  <span>Total</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#e87b35' }}>{fmtAmt(invoice.total ?? subtotal + tax)}</span>
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
  const [badgeStyle, setBadgeStyle] = useState('filled');
  const [showTweaks, setShowTweaks] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const email = user?.email || '';

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    Promise.all([getCustomerInvoices(email), getPublicInvoiceSettings()])
      .then(([invs, sett]) => { setInvoices(invs || []); setSettings(sett); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email, refreshKey]);

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

  const totalBilled = invoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const outstanding = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue').reduce((s, inv) => s + (inv.total || 0), 0);
  const unpaidCount = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue').length;
  const thisYear = new Date().getFullYear();
  const paidThisYear = invoices.filter(inv => inv.status === 'paid' && new Date(inv.invoice_date || 0).getFullYear() === thisYear).reduce((s, inv) => s + (inv.total || 0), 0);
  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
  const overduePast = invoices.filter(inv => inv.status === 'overdue').reduce((s, inv) => s + (inv.total || 0), 0);

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

  const thS = { padding: '11px 16px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.1, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}`, textAlign: 'left' };
  const tdS = { padding: '13px 16px', borderTop: `1px solid ${c.border}`, fontSize: 13, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.06)' };

  const a = loading ? null : (page - 1) * PAGE_SIZE + 1;
  const b = loading ? null : Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Invoices & Billing</h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 4 }}>View and download your invoices from Nextiom</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setRefreshKey(k => k + 1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowTweaks(!showTweaks)} style={{ padding: '7px 13px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Tweaks</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile icon={<Receipt size={18} style={{ color: c.brand }} />} label="Total Billed" value={fmtAmt(totalBilled)} sub={`Across ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`} c={c} isDark={isDark} />
        <KpiTile icon={<Wallet size={18} style={{ color: '#f59e0b' }} />} label="Outstanding Balance" value={<span style={{ color: c.brand }}>{fmtAmt(outstanding)}</span>} sub={`${unpaidCount} unpaid`} subColor="#f59e0b" c={c} isDark={isDark} />
        <KpiTile icon={<CheckCircle size={18} style={{ color: '#22c55e' }} />} label="Paid This Year" value={<span style={{ color: '#22c55e' }}>{fmtAmt(paidThisYear)}</span>} sub={`${thisYear} to date`} subColor="#22c55e" c={c} isDark={isDark} />
        <KpiTile icon={<AlertTriangle size={18} style={{ color: '#ef4444' }} />} label="Overdue" value={<span style={{ color: '#ef4444' }}>{overdueCount}</span>} sub={`${fmtAmt(overduePast)} past due`} subColor="#ef4444" c={c} isDark={isDark} />
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
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
            <div style={{ position: 'relative', flex: '0 0 220px' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
              <input
                style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                placeholder="Search invoice # or service…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {/* Status segmented */}
            <div style={{ display: 'flex', border: `1.5px solid ${c.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {['all', 'paid', 'unpaid', 'overdue'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: '6px 12px', border: 'none', borderRight: `1px solid ${c.border}`, background: statusFilter === s ? c.brand : 'transparent', color: statusFilter === s ? '#fff' : c.subText, fontSize: 12, fontWeight: statusFilter === s ? 700 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <th style={{ ...thS, textAlign: 'right' }}>Amount</th>
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
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13 }}>{fmtAmt(inv.total)}</span>
                      </td>
                      <td style={{ ...tdS, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button onClick={() => handleDownload(inv)} title="View / Download PDF" style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: c.subText, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            <Eye size={13} /> View PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' }}>
                    {invoices.length === 0 ? 'No invoices found. Contact support if you believe this is an error.' : 'No invoices match your current filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <InvoiceDrawer invoice={openInvoice} settings={settings} badgeStyle={badgeStyle} isDark={isDark} c={c} onClose={() => setOpenInvoice(null)} />
      )}

      {/* Tweaks panel */}
      {showTweaks && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 300, minWidth: 200 }}>
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
