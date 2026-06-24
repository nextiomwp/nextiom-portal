// src/components/customer/CustomerQuotationsPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Calendar as CalendarIcon, CheckCircle, Clock,
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Eye, Download, X, Globe, MapPin, Phone, RefreshCw, ThumbsUp, CreditCard, PenTool, Info, Check, AlertTriangle
} from 'lucide-react';
import { getCustomerQuotations, fmtCurrency, updateQuotationStatus } from '@/lib/quotations';
import { getPublicInvoiceSettings } from '@/lib/invoices';
import { useToast } from '@/components/ui/use-toast';

const PAGE_SIZE = 6;

function parseDateStr(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function monthKey(d) { return `${d.getFullYear()}-${d.getMonth()}`; }
function dayKey(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function fmtMonthYear(d) { return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
function fmtDay(d) { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }

function formatCurrencyBreakdown(list) {
  const totals = (list || []).reduce((acc, q) => {
    const cur = q.currency === 'USD' ? 'USD' : 'LKR';
    acc[cur] += q.total || 0;
    return acc;
  }, { LKR: 0, USD: 0 });

  return ['LKR', 'USD']
    .filter(cur => totals[cur] > 0)
    .map(cur => fmtCurrency(totals[cur], cur))
    .join(' / ') || fmtCurrency(0, 'LKR');
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

function DarkCalendar({ quotationDates, calFilter, onDayClick, onMonthClick, c, isDark }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const quotationDayKeys = new Set(quotationDates.map(d => dayKey(d)));
  const isMonthFiltered = calFilter.mode === 'month' && calFilter.year === viewYear && calFilter.month === viewMonth;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const brand = c.brand;
  const todayKey = dayKey(today);

  let footerText = 'Showing all quotations';
  if (calFilter.mode === 'day') footerText = `Showing ${fmtDay(new Date(calFilter.year, calFilter.month, calFilter.day))}`;
  else if (calFilter.mode === 'month') footerText = `Showing ${fmtMonthYear(new Date(calFilter.year, calFilter.month, 1))}`;

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><ChevronLeft size={16} /></button>
        <button
          onClick={() => onMonthClick(viewYear, viewMonth)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: isMonthFiltered ? brand : c.text, padding: '2px 8px', borderRadius: 6, backgroundColor: isMonthFiltered ? `rgba(232,123,53,0.12)` : 'transparent' }}
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
            const hasQuotation = quotationDayKeys.has(cellDayKey);
            const isSelected = calFilter.mode === 'day' && calFilter.year === viewYear && calFilter.month === viewMonth && calFilter.day === day;
            const isMonthTinted = calFilter.mode === 'month' && calFilter.year === viewYear && calFilter.month === viewMonth;
            return (
              <div key={idx}
                onClick={() => onDayClick(viewYear, viewMonth, day)}
                style={{
                  textAlign: 'center', borderRadius: 7, padding: '5px 0', cursor: 'pointer', position: 'relative',
                  background: isSelected ? brand : isMonthTinted ? 'rgba(232,123,53,0.10)' : 'transparent',
                  color: isSelected ? '#fff' : hasQuotation ? (isDark ? '#fff' : '#1a1a1a') : c.subText,
                  fontWeight: hasQuotation || isToday ? 700 : 400,
                  fontSize: 12,
                  border: isToday && !isSelected ? `1.5px dashed ${brand}` : '1.5px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? brand : isMonthTinted ? 'rgba(232,123,53,0.10)' : 'transparent'; }}
              >
                {day}
                {hasQuotation && !isSelected && (
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

function QuotationDrawer({ quotation, settings, isDark, c, onClose, isMobile = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!quotation) return null;

  const items = quotation.items || [];
  const subtotal = items.reduce((s, it) => s + (it.qty || 1) * (it.unit_price || 0), 0);
  const cur = quotation.currency === 'USD' ? 'USD' : 'LKR';

  const handleDownload = () => {
    localStorage.setItem('nxt_quotation_print', JSON.stringify({ ...quotation, settings }));
    window.open('/quotations/print', '_blank');
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: isMobile ? '100vw' : 640, maxWidth: '100vw', background: c.card, borderLeft: `1px solid ${c.border}`, boxShadow: '-4px 0 32px rgba(0,0,0,0.3)', zIndex: 201, display: 'flex', flexDirection: 'column', overflowY: 'auto', animation: 'slideIn 0.2s ease' }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        
        {/* Drawer header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} style={{ color: c.brand }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Quotation {quotation.quotation_no}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        {/* PDF-style document */}
        <div style={{ margin: '20px 24px', background: '#f7f5f1', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', flex: 1, minHeight: 0, position: 'relative' }}>
          <div style={{ padding: '32px 36px', color: '#1a1a1a', position: 'relative', zIndex: 1 }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#e87b35', letterSpacing: 2 }}>{settings?.company_name || 'NEXTIOM'}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{settings?.address || 'Niwandama, Ja Ela – 11350'}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{settings?.phone || '+94 70 203 2323'}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{settings?.website || 'https://nextiom.com/'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: '#1a1a1a' }}>QUOTATION</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#e87b35', marginTop: 4 }}>#{quotation.quotation_no}</div>
              </div>
            </div>

            {/* Bill to + dates */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1.5px solid #e0ddd8' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>Quoted To</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{quotation.client_name}</div>
                {quotation.client_company && <div style={{ fontSize: 12, color: '#555' }}>{quotation.client_company}</div>}
                {quotation.client_email && <div style={{ fontSize: 12, color: '#555' }}>{quotation.client_email}</div>}
                {quotation.client_phone && <div style={{ fontSize: 12, color: '#555' }}>{quotation.client_phone}</div>}
                {quotation.client_address && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{quotation.client_address}</div>}
              </div>
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#888' }}>Date</span>
                    <span style={{ fontWeight: 600 }}>{quotation.quotation_date || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#888' }}>Valid Until</span>
                    <span style={{ fontWeight: 600 }}>{quotation.valid_until || '—'}</span>
                  </div>
                  {quotation.project_timeline && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#888' }}>Timeline</span>
                      <span style={{ fontWeight: 600 }}>{quotation.project_timeline}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line items */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 20 }}>
              <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse' }}>
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
                        {fmtCurrency(item.qty * item.unit_price, cur)}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '12px 10px', textAlign: 'center', color: '#888', fontSize: 12, fontStyle: 'italic' }}>No line items</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#888' }}>Subtotal</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtCurrency(subtotal, cur)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, borderTop: '2px solid #1a1a1a', paddingTop: 8 }}>
                  <span>Grand Total</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#e87b35' }}>{fmtCurrency(quotation.total ?? subtotal, cur)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method / Terms */}
            {settings?.bank_name && (
              <div style={{ marginTop: 24, padding: '12px 14px', background: '#f0ede8', borderRadius: 8, fontSize: 11, color: '#666', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Bank Transfer Details:</div>
                <div>Bank: {settings.bank_name} / Branch: {settings.bank_branch}</div>
                <div>Account: {settings.account_name}</div>
                <div style={{ fontFamily: 'monospace' }}>A/C #: {settings.account_no}</div>
              </div>
            )}

            {/* Notes */}
            {quotation.notes && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#f0ede8', borderRadius: 8, fontSize: 11, color: '#666', lineHeight: 1.6, borderLeft: '3px solid #e87b35' }}>
                {quotation.notes}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            <Download size={14} /> Download PDF
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: c.subText }}>
            Validity: {quotation.valid_until}
          </span>
        </div>
      </div>
    </>
  );
}

export default function CustomerQuotationsPage({ user, isDark, c }) {
  const { toast } = useToast();
  const [quotations, setQuotations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [calFilter, setCalFilter] = useState({ mode: 'none' });
  const [openQuotation, setOpenQuotation] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStatusChange = async (qId, status) => {
    try {
      await updateQuotationStatus(qId, status, 'customer');
      toast({ 
        title: `Quotation ${status === 'accepted' ? 'Accepted' : 'Declined'}`, 
        description: `The quotation has been successfully ${status}.` 
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error(err);
      toast({ 
        title: 'Error', 
        description: 'Failed to update quotation status.', 
        variant: 'destructive' 
      });
    }
  };
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });

  const email = user?.email || '';

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    Promise.all([getCustomerQuotations(email), getPublicInvoiceSettings()])
      .then(([qs, sett]) => { setQuotations(qs || []); setSettings(sett); })
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

  const quotationDates = useMemo(() =>
    quotations.map(q => parseDateStr(q.quotation_date)).filter(Boolean), [quotations]);

  const filtered = useMemo(() => {
    let arr = quotations.filter(q => {
      if (query) {
        const queryLower = query.toLowerCase();
        const desc = (q.quotation_no + ' ' + (q.items || []).map(it => it.description).join(' ')).toLowerCase();
        if (!desc.includes(queryLower)) return false;
      }
      if (calFilter.mode === 'day') {
        const d = parseDateStr(q.quotation_date);
        if (!d) return false;
        if (d.getFullYear() !== calFilter.year || d.getMonth() !== calFilter.month || d.getDate() !== calFilter.day) return false;
      } else if (calFilter.mode === 'month') {
        const d = parseDateStr(q.quotation_date);
        if (!d) return false;
        if (d.getFullYear() !== calFilter.year || d.getMonth() !== calFilter.month) return false;
      }
      return true;
    });

    arr.sort((a, b) => {
      const da = new Date(a.quotation_date || 0), db = new Date(b.quotation_date || 0);
      return sortDir === 'asc' ? da - db : db - da;
    });

    return arr;
  }, [quotations, query, calFilter, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [query, calFilter, sortDir]);

  const totalCount = quotations.length;
  const grossVolume = formatCurrencyBreakdown(quotations);

  const activeQuotations = useMemo(() => {
    const today = new Date();
    return quotations.filter(q => {
      const status = q.status || 'active';
      if (status === 'accepted') return true;
      if (status === 'declined' || status === 'expired') return false;
      if (!q.valid_until) return true;
      const valid = new Date(q.valid_until + 'T23:59:59');
      return valid >= today;
    });
  }, [quotations]);

  const expiredQuotations = useMemo(() => {
    const today = new Date();
    return quotations.filter(q => {
      const status = q.status || 'active';
      if (status === 'declined' || status === 'expired') return true;
      if (!q.valid_until) return false;
      const valid = new Date(q.valid_until + 'T23:59:59');
      return valid < today;
    });
  }, [quotations]);

  const activeCount = activeQuotations.length;
  const expiredCount = expiredQuotations.length;

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

  const handleDownload = (q) => {
    localStorage.setItem('nxt_quotation_print', JSON.stringify({ ...q, settings }));
    window.open('/quotations/print', '_blank');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Quotations</h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 4 }}>View, print, and approve quotation estimates assigned to you</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={() => setRefreshKey(k => k + 1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile icon={<FileText size={18} style={{ color: c.brand }} />} label="Total Quotations" value={totalCount} sub="Assigned to your email" c={c} isDark={isDark} />
        <KpiTile icon={<CheckCircle size={18} style={{ color: '#22c55e' }} />} label="Active Estimates" value={activeCount} sub="Valid and open" subColor="#22c55e" c={c} isDark={isDark} />
        <KpiTile icon={<Download size={18} style={{ color: '#3b82f6' }} />} label="Gross Value" value={grossVolume} sub="Total potential" subColor="#3b82f6" c={c} isDark={isDark} />
        <KpiTile icon={<Clock size={18} style={{ color: '#ef4444' }} />} label="Expired" value={expiredCount} sub="Past valid date" subColor="#ef4444" c={c} isDark={isDark} />
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* All Quotations list */}
        <div style={cardS}>
          {/* Card header */}
          <div style={{ padding: '15px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: c.brand }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>All Quotations</h3>
            <span style={{ fontSize: 11, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: c.subText, padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>{filtered.length}</span>
          </div>

          {/* Search, Sort and Filters Toolbar */}
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 10, flexWrap: 'wrap', background: isDark ? 'rgba(255,255,255,0.01)' : '#fafafa' }}>
            <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 0 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search quotations…"
                style={{ width: '100%', padding: '7px 10px 7px 30px', border: `1px solid ${c.borderStrong}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            
            <button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: `1px solid ${c.borderStrong}`, background: isDark ? '#22252C' : '#fff', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
            >
              Date: {sortDir === 'desc' ? 'Newest' : 'Oldest'}
            </button>
          </div>

          {/* Quotations List */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.subText, fontSize: 13 }}>Loading quotations…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: c.subText }}>
              <FileText size={44} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>No quotations found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>There are no quotations matching your current filters.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thS}>Quotation No</th>
                    <th style={thS}>Date</th>
                    <th style={thS}>Valid Until</th>
                    <th style={thS}>Amount</th>
                    <th style={thS}>Status</th>
                    <th style={thS}>Decision</th>
                    <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((q, index) => {
                    const isAlt = index % 2 === 1;
                    const style = isAlt ? tdAlt : tdS;
                    const cur = q.currency === 'USD' ? 'USD' : 'LKR';
                    
                    const isExpired = q.valid_until && new Date(q.valid_until + 'T23:59:59') < new Date();
                    
                    return (
                      <tr key={q.id} style={{ borderBottom: index === pageItems.length - 1 ? 'none' : `1px solid ${c.border}` }}>
                        <td style={{ ...style, fontFamily: 'monospace', fontWeight: 600, color: c.brand }}>{q.quotation_no}</td>
                        <td style={style}>{q.quotation_date}</td>
                        <td style={style}>{q.valid_until}</td>
                        <td style={{ ...style, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{fmtCurrency(q.total, cur)}</td>
                        <td style={style}>
                          {q.status === 'accepted' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.12)', borderRadius: 20, padding: '2px 9px' }}>
                              Accepted
                            </span>
                          ) : q.status === 'declined' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', borderRadius: 20, padding: '2px 9px' }}>
                              Declined
                            </span>
                          ) : (q.status === 'expired' || ((q.status || 'active') === 'active' && q.valid_until && new Date(q.valid_until + 'T23:59:59') < new Date())) ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#888', background: 'rgba(136,136,136,0.12)', borderRadius: 20, padding: '2px 9px' }}>
                              Expired
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#e87b35', background: 'rgba(232,123,53,0.12)', borderRadius: 20, padding: '2px 9px' }}>
                              Active
                            </span>
                          )}
                        </td>
                        <td style={style}>
                          {((q.status || 'active') === 'active' && !isExpired) ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => handleStatusChange(q.id, 'accepted')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '5px 8px',
                                  background: 'rgba(34,197,94,0.15)',
                                  border: '1px solid rgba(34,197,94,0.3)',
                                  color: '#22c55e',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.25)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.15)'}
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleStatusChange(q.id, 'declined')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '5px 8px',
                                  background: 'rgba(239,68,68,0.15)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  color: '#ef4444',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: c.subText, fontStyle: 'italic' }}>
                              {q.status === 'accepted' ? 'Accepted' : q.status === 'declined' ? 'Declined' : 'No Action'}
                            </span>
                          )}
                        </td>
                        <td style={{ ...style, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => setOpenQuotation(q)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'transparent', border: `1.5px solid ${c.border}`, color: c.text, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              onClick={() => handleDownload(q)}
                              style={{ display: 'inline-flex', alignItems: 'center', padding: '6px', background: 'transparent', border: `1.5px solid ${c.border}`, color: c.subText, borderRadius: 6, cursor: 'pointer' }}
                              title="Download PDF"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination footer */}
              {totalPages > 1 && (
                <div style={{ padding: '14px 18px', borderTop: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.005)' }}>
                  <div style={{ fontSize: 12, color: c.subText }}>
                    Showing <strong>{a}</strong> to <strong>{b}</strong> of {filtered.length} quotations
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{ padding: '5px 10px', border: `1px solid ${c.border}`, background: c.card, color: c.text, borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{ padding: '5px 10px', border: `1px solid ${c.border}`, background: c.card, color: c.text, borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: calendar */}
        {!isMobile && (
          <DarkCalendar
            quotationDates={quotationDates}
            calFilter={calFilter}
            onDayClick={handleDayClick}
            onMonthClick={handleMonthClick}
            c={c}
            isDark={isDark}
          />
        )}
      </div>

      {/* Details drawer */}
      <QuotationDrawer
        quotation={openQuotation}
        settings={settings}
        isDark={isDark}
        c={c}
        onClose={() => setOpenQuotation(null)}
        isMobile={isMobile}
      />
    </div>
  );
}
