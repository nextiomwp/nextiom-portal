import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Search, Download, RefreshCw, Shield, Users, Zap, AlertTriangle, TrendingUp, FileText, HelpCircle, Database, Lock } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { getPublicInvoiceSettings, resolveLogoUrl } from '@/lib/invoices';
import { format, subDays, isWithinInterval, parseISO, eachDayOfInterval } from 'date-fns';

const ACTION_MAP = {
  new_registration: { label: 'New Registration', color: '#60a5fa', bg: '#1a3052' },
  update: { label: 'Status Update', color: '#4ade80', bg: '#1a3020' },
  expiration: { label: 'Expiration Alert', color: '#fb923c', bg: '#3b2508' },
  announcement: { label: 'Announcement', color: '#a78bfa', bg: '#2a1a4a' },
  account_rejected: { label: 'Account Rejected', color: '#f87171', bg: '#3a1515' },
  account_confirmed: { label: 'Account Confirmed', color: '#34d399', bg: '#0d2b1e' },
  admin_login: { label: 'Admin Login', color: '#e87b35', bg: '#2b1a0a' },
  ticket: { label: 'Ticket', color: '#38bdf8', bg: '#0c2233' },
  payment: { label: 'Payment', color: '#facc15', bg: '#2b2008' },
};

function getAction(type) {
  return ACTION_MAP[type] || { label: type || 'Activity', color: '#a0a0a0', bg: 'rgba(255,255,255,0.06)' };
}

function ExportModal({ open, onClose, onCSV, onPDF, isDark, c }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: '28px 28px 24px', maxWidth: 380, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Download size={18} color={c.brand} />
          <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Export Activity Log</span>
        </div>
        <p style={{ fontSize: 13, color: c.subText, marginBottom: 20 }}>Choose your preferred export format:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <button onClick={onCSV} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#f9f9f9', color: c.text, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#4ade80'}
            onMouseLeave={e => e.currentTarget.style.borderColor = c.border}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={18} color="#4ade80" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>CSV</div>
              <div style={{ fontSize: 12, color: c.subText }}>Comma-separated values — open in Excel / Sheets</div>
            </div>
          </button>
          <button onClick={onPDF} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#f9f9f9', color: c.text, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.borderColor = c.border}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={18} color="#f87171" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>PDF</div>
              <div style={{ fontSize: 12, color: c.subText }}>Printable report with company logo & details</div>
            </div>
          </button>
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function ActivityOverviewChart({ logs, days, isDark, c }) {
  const since = subDays(new Date(), days - 1);
  const dayRange = eachDayOfInterval({ start: since, end: new Date() });
  const counts = dayRange.map(d => {
    const dayStr = format(d, 'yyyy-MM-dd');
    return logs.filter(l => l.created_at && l.created_at.startsWith(dayStr)).length;
  });
  const maxCount = Math.max(...counts, 1);
  const labels = dayRange.map(d => format(d, days <= 7 ? 'EEE' : days <= 14 ? 'dd' : 'MMM dd'));
  const show = days <= 14 ? dayRange : dayRange.filter((_, i) => i % Math.ceil(dayRange.length / 12) === 0 || i === dayRange.length - 1);
  const showIdxs = show.map(d => dayRange.findIndex(dd => format(dd, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd')));

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
        {counts.map((count, i) => {
          const h = maxCount > 0 ? Math.max(4, Math.round((count / maxCount) * 72)) : 4;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 80, gap: 2 }} title={`${labels[i]}: ${count} events`}>
              <div style={{ width: '100%', height: h, borderRadius: '3px 3px 0 0', background: count > 0 ? `rgba(232,123,53,${0.4 + (count / maxCount) * 0.6})` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'), transition: 'height 0.3s', minWidth: 4 }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
        {counts.map((_, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: c.subText, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {showIdxs.includes(i) ? labels[i] : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminActivityLogPage({ isDark = true }) {
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [days, setDays] = useState(30);
  const [exportOpen, setExportOpen] = useState(false);

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', panel: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', panel: '#f5f5f5' };

  const cardStyle = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: notifs }, { data: custs }] = await Promise.all([
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('customers').select('id, name, email').order('name'),
    ]);
    setLogs(notifs || []);
    setCustomers(custs || []);
    setLoading(false);
  };

  const custMap = useMemo(() => {
    const m = {};
    customers.forEach(cu => { m[cu.id] = cu; });
    return m;
  }, [customers]);

  const filtered = useMemo(() => {
    const since = subDays(new Date(), days);
    return logs.filter(l => {
      const date = l.created_at ? parseISO(l.created_at) : null;
      if (date && !isWithinInterval(date, { start: since, end: new Date() })) return false;
      const isAdmin = !l.customer_id;
      if (roleFilter === 'Admin' && !isAdmin) return false;
      if (roleFilter === 'Customer' && isAdmin) return false;
      if (actionFilter !== 'All' && l.type !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = l.customer_id ? (custMap[l.customer_id]?.name || '') : 'Admin';
        if (!l.title?.toLowerCase().includes(q) && !l.message?.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, days, roleFilter, actionFilter, search, custMap]);

  const actionCounts = useMemo(() => {
    const m = {};
    filtered.forEach(l => { m[l.type || 'unknown'] = (m[l.type || 'unknown'] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const uniqueUsers = useMemo(() => new Set(filtered.map(l => l.customer_id || 'admin')).size, [filtered]);
  const securityLogs = useMemo(() => filtered.filter(l => l.type === 'account_rejected' || l.type === 'account_confirmed' || l.type === 'admin_login').slice(0, 5), [filtered]);
  const allTypes = useMemo(() => ['All', ...Array.from(new Set(logs.map(l => l.type).filter(Boolean)))], [logs]);

  const dateLabel = `Last ${days} days`;

  const handleCSV = () => {
    const rows = [['#', 'User', 'Email', 'Role', 'Action', 'Title', 'Message', 'Date & Time']];
    filtered.forEach((l, i) => {
      const isAdmin = !l.customer_id;
      const cust = custMap[l.customer_id];
      rows.push([
        i + 1,
        isAdmin ? 'Admin' : (cust?.name || 'Unknown'),
        isAdmin ? '' : (cust?.email || ''),
        isAdmin ? 'Admin' : 'Customer',
        getAction(l.type).label,
        (l.title || '').replace(/"/g, '""'),
        (l.message || '').replace(/"/g, '""'),
        l.created_at ? format(parseISO(l.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `activity-log-${format(new Date(), 'yyyyMMdd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const handlePDF = async () => {
    const settings = await getPublicInvoiceSettings();
    let resolvedLogoUrl = '';
    if (settings?.logo_url) {
      try { resolvedLogoUrl = await resolveLogoUrl(settings.logo_url); } catch {}
    }
    const printData = {
      logs: filtered.map(l => ({
        ...l,
        isAdmin: !l.customer_id,
        userName: !l.customer_id ? 'Admin' : (custMap[l.customer_id]?.name || 'Unknown'),
      })),
      settings: { ...settings, resolvedLogoUrl },
      dateLabel,
    };
    localStorage.setItem('nxt_activity_log_print', JSON.stringify(printData));
    window.open('/activity-log/print', '_blank');
    setExportOpen(false);
  };

  const thS = { textAlign: 'left', padding: '10px 16px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}`, whiteSpace: 'nowrap' };
  const tdS = { padding: '12px 16px', borderTop: `1px solid ${c.border}`, fontSize: 13, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };

  return (
    <div>
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} onCSV={handleCSV} onPDF={handlePDF} isDark={isDark} c={c} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 284px', gap: 20, alignItems: 'start' }}>
        {/* LEFT: filters + table + overview */}
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText, pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ width: '100%', padding: '8px 12px 8px 30px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 9, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {[{ l: '7d', v: 7 }, { l: '30d', v: 30 }, { l: '90d', v: 90 }].map(o => (
              <button key={o.v} onClick={() => setDays(o.v)} style={{ padding: '7px 13px', borderRadius: 8, border: `1px solid ${days === o.v ? c.brand : c.border}`, background: days === o.v ? (isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.1)') : c.card, color: days === o.v ? c.brand : c.subText, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{o.l}</button>
            ))}
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '7px 10px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {['All', 'Admin', 'Customer'].map(r => <option key={r}>{r}</option>)}
            </select>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ padding: '7px 10px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {allTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Actions' : getAction(t).label}</option>)}
            </select>
            <button onClick={loadData} style={{ padding: '7px 11px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.subText, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <RefreshCw size={13} />
            </button>
            <button onClick={() => setExportOpen(true)} style={{ padding: '7px 13px', borderRadius: 8, border: `1px solid ${c.brand}`, background: 'rgba(232,123,53,0.12)', color: c.brand, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
              <Download size={13} /> Export
            </button>
          </div>

          {/* Table */}
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: c.brand, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>Activity Log</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: c.subText }}>{filtered.length} entries</span>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: c.subText }}>Loading…</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th style={thS}>User</th>
                      <th style={thS}>Role</th>
                      <th style={thS}>Action</th>
                      <th style={thS}>Description</th>
                      <th style={thS}>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log, i) => {
                      const isAdmin = !log.customer_id;
                      const cust = log.customer_id ? custMap[log.customer_id] : null;
                      const name = isAdmin ? 'Admin' : (cust?.name || 'Customer');
                      const email = isAdmin ? '' : (cust?.email || '');
                      const action = getAction(log.type);
                      return (
                        <tr key={log.id || i}>
                          <td style={i % 2 === 0 ? tdS : tdAlt}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAdmin ? 'rgba(232,123,53,0.18)' : 'rgba(96,165,250,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: isAdmin ? c.brand : '#60a5fa' }}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: c.text }}>{name}</div>
                                {email && <div style={{ fontSize: 11, color: c.subText }}>{email}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={i % 2 === 0 ? tdS : tdAlt}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: isAdmin ? 'rgba(232,123,53,0.14)' : 'rgba(96,165,250,0.1)', color: isAdmin ? c.brand : '#60a5fa' }}>
                              {isAdmin ? 'Admin' : 'Customer'}
                            </span>
                          </td>
                          <td style={i % 2 === 0 ? tdS : tdAlt}>
                            <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: isDark ? action.bg : action.color + '22', color: action.color }}>
                              {action.label}
                            </span>
                          </td>
                          <td style={i % 2 === 0 ? tdS : tdAlt}>
                            <div style={{ fontWeight: 500, fontSize: 13, color: c.text, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.title || '—'}</div>
                            {log.message && <div style={{ fontSize: 11, color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{log.message}</div>}
                          </td>
                          <td style={i % 2 === 0 ? tdS : tdAlt}>
                            <div style={{ fontSize: 13, color: c.text, whiteSpace: 'nowrap' }}>{log.created_at ? format(parseISO(log.created_at), 'MMM dd, yyyy') : '—'}</div>
                            <div style={{ fontSize: 11, color: c.subText }}>{log.created_at ? format(parseISO(log.created_at), 'HH:mm:ss') : ''}</div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' }}>No activity found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity Overview Chart */}
          <div style={cardStyle}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 8, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <TrendingUp size={14} color={c.brand} />
              <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>Activity Overview</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: c.subText }}>Last {days} days</span>
            </div>
            <div style={{ padding: '16px 18px 12px' }}>
              <ActivityOverviewChart logs={filtered} days={days} isDark={isDark} c={c} />
            </div>
          </div>
        </div>

        {/* RIGHT: summary + top actions + security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary */}
          <div style={cardStyle}>
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${c.border}`, fontWeight: 700, fontSize: 13, color: c.text }}>Log Summary</div>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total Logs', value: filtered.length, icon: Activity, color: '#60a5fa' },
                { label: 'Unique Users', value: uniqueUsers, icon: Users, color: '#4ade80' },
                { label: 'Action Types', value: actionCounts.length, icon: Zap, color: c.brand },
                { label: 'Alerts', value: securityLogs.length, icon: Shield, color: '#f87171' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Icon size={12} color={color} />
                    <span style={{ fontSize: 9.5, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Actions */}
          <div style={cardStyle}>
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${c.border}`, fontWeight: 700, fontSize: 13, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={13} color={c.brand} /> Top Actions
            </div>
            <div style={{ padding: '12px 16px 14px' }}>
              {actionCounts.length === 0 && <div style={{ color: c.subText, fontSize: 12 }}>No data</div>}
              {actionCounts.map(([type, count]) => {
                const action = getAction(type);
                const pct = filtered.length ? Math.round((count / filtered.length) * 100) : 0;
                return (
                  <div key={type} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: c.text, fontWeight: 500 }}>{action.label}</span>
                      <span style={{ fontSize: 12, color: c.subText }}>{count}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: action.color, borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security Alerts */}
          <div style={cardStyle}>
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${c.border}`, fontWeight: 700, fontSize: 13, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} color="#f87171" /> Recent Security Alerts
            </div>
            <div style={{ padding: '10px 16px 14px' }}>
              {securityLogs.length === 0 && <div style={{ color: c.subText, fontSize: 12 }}>No alerts</div>}
              {securityLogs.map((log, i) => {
                const cust = log.customer_id ? custMap[log.customer_id] : null;
                return (
                  <div key={log.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: i < securityLogs.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: log.type === 'admin_login' ? c.brand : '#f87171', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{log.title || getAction(log.type).label}</div>
                      <div style={{ fontSize: 11, color: c.subText }}>{(!log.customer_id ? 'Admin' : cust?.name) || 'Unknown'} · {log.created_at ? format(parseISO(log.created_at), 'MMM dd, HH:mm') : '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginTop: 20 }}>
        {[
          { icon: HelpCircle, color: '#60a5fa', title: 'What is Activity Log?', desc: 'Tracks all system events — admin logins, customer registrations, approvals, rejections, and status changes.' },
          { icon: Shield, color: '#a78bfa', title: 'Why Activity Logs?', desc: 'Provides accountability, helps troubleshoot issues, and maintains an audit trail of all important actions.' },
          { icon: Database, color: '#34d399', title: 'Data Retention', desc: 'Activity records are retained indefinitely until manually removed. Filter by date range to narrow down entries.' },
          { icon: Download, color: c.brand, title: 'Export & Reports', desc: 'Download your activity log as CSV (for spreadsheets) or PDF (formatted report with company branding).', action: true },
          { icon: Lock, color: '#f87171', title: 'Access Control', desc: 'Only authenticated admins can view this page. Customer activity is visible here for transparency and oversight.' },
        ].map(({ icon: Icon, color, title, desc, action }) => (
          <button
            key={title}
            onClick={action ? () => setExportOpen(true) : undefined}
            style={{ background: c.card, border: `1px solid ${action ? color + '44' : c.border}`, borderRadius: 12, padding: '16px', textAlign: 'left', cursor: action ? 'pointer' : 'default', transition: 'border-color 0.15s', boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)' }}
            onMouseEnter={action ? e => e.currentTarget.style.borderColor = color : undefined}
            onMouseLeave={action ? e => e.currentTarget.style.borderColor = color + '44' : undefined}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Icon size={17} color={color} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: c.text, marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 12, color: c.subText, lineHeight: 1.5 }}>{desc}</div>
            {action && <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 600, color }}>Click to export →</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AdminActivityLogPage;
