import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Search, Download, RefreshCw, Shield, Users, Zap, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';

const ACTION_MAP = {
  new_registration: { label: 'New Registration', color: '#60a5fa', bg: '#1a3052' },
  update: { label: 'Status Update', color: '#4ade80', bg: '#1a3020' },
  expiration: { label: 'Expiration Alert', color: '#fb923c', bg: '#3b2508' },
  announcement: { label: 'Announcement', color: '#a78bfa', bg: '#2a1a4a' },
  account_rejected: { label: 'Account Rejected', color: '#f87171', bg: '#3a1515' },
  account_confirmed: { label: 'Account Confirmed', color: '#34d399', bg: '#0d2b1e' },
  ticket: { label: 'Ticket', color: '#38bdf8', bg: '#0c2233' },
  payment: { label: 'Payment', color: '#facc15', bg: '#2b2008' },
};

function getAction(type) {
  return ACTION_MAP[type] || { label: type || 'Activity', color: '#a0a0a0', bg: 'rgba(255,255,255,0.06)' };
}

function AdminActivityLogPage({ isDark = true }) {
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [days, setDays] = useState(30);

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', panel: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', panel: '#f5f5f5' };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: notifs }, { data: custs }] = await Promise.all([
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('customers').select('id, name, email').order('name'),
    ]);
    setLogs(notifs || []);
    setCustomers(custs || []);
    setLoading(false);
  };

  const custMap = useMemo(() => {
    const m = {};
    customers.forEach(c => { m[c.id] = c; });
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
        const name = l.customer_id ? custMap[l.customer_id]?.name || '' : 'Admin';
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
  const securityLogs = useMemo(() => filtered.filter(l => l.type === 'account_rejected' || l.type === 'account_confirmed').slice(0, 5), [filtered]);
  const allTypes = useMemo(() => ['All', ...Array.from(new Set(logs.map(l => l.type).filter(Boolean)))], [logs]);

  const thS = { textAlign: 'left', padding: '10px 16px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '12px 16px', borderTop: `1px solid ${c.border}`, fontSize: 13, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
      {/* Main table */}
      <div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search user, action, description..."
              style={{ width: '100%', padding: '8px 12px 8px 32px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 9, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {[
            { label: 'Last 7d', val: 7 }, { label: 'Last 30d', val: 30 }, { label: 'Last 90d', val: 90 },
          ].map(o => (
            <button key={o.val} onClick={() => setDays(o.val)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${days === o.val ? c.brand : c.border}`, background: days === o.val ? (isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.1)') : c.card, color: days === o.val ? c.brand : c.subText, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{o.label}</button>
          ))}
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '7px 10px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {['All', 'Admin', 'Customer'].map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ padding: '7px 10px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {allTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Actions' : getAction(t).label}</option>)}
          </select>
          <button onClick={loadData} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.subText, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Table */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: c.brand, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>Activity Log</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: c.subText }}>{filtered.length} entries</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.subText }}>Loading…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <tr key={log.id}>
                        <td style={i % 2 === 0 ? tdS : tdAlt}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAdmin ? 'rgba(232,123,53,0.2)' : 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: isAdmin ? c.brand : '#60a5fa' }}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: c.text }}>{name}</div>
                              {email && <div style={{ fontSize: 11, color: c.subText }}>{email}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={i % 2 === 0 ? tdS : tdAlt}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: isAdmin ? 'rgba(232,123,53,0.15)' : 'rgba(96,165,250,0.1)', color: isAdmin ? c.brand : '#60a5fa' }}>
                            {isAdmin ? 'Admin' : 'Customer'}
                          </span>
                        </td>
                        <td style={i % 2 === 0 ? tdS : tdAlt}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: isDark ? action.bg : action.color + '22', color: action.color }}>
                            {action.label}
                          </span>
                        </td>
                        <td style={i % 2 === 0 ? tdS : tdAlt}>
                          <div style={{ fontWeight: 500, fontSize: 13, color: c.text, maxWidth: 260 }}>{log.title || '—'}</div>
                          {log.message && <div style={{ fontSize: 11, color: c.subText, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{log.message}</div>}
                        </td>
                        <td style={i % 2 === 0 ? tdS : tdAlt}>
                          <div style={{ fontSize: 13, color: c.subText, whiteSpace: 'nowrap' }}>
                            {log.created_at ? format(parseISO(log.created_at), 'MMM dd, yyyy') : '—'}
                          </div>
                          <div style={{ fontSize: 11, color: c.subText }}>
                            {log.created_at ? format(parseISO(log.created_at), 'HH:mm:ss') : ''}
                          </div>
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
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Summary */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${c.border}`, fontWeight: 700, fontSize: 13, color: c.text }}>Log Summary</div>
          <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total Logs', value: filtered.length, icon: Activity, color: '#60a5fa' },
              { label: 'Unique Users', value: uniqueUsers, icon: Users, color: '#4ade80' },
              { label: 'Actions', value: actionCounts.length, icon: Zap, color: c.brand },
              { label: 'Alerts', value: securityLogs.length, icon: Shield, color: '#f87171' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Actions */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${c.border}`, fontWeight: 700, fontSize: 13, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} color={c.brand} /> Top Actions
          </div>
          <div style={{ padding: '10px 16px 14px' }}>
            {actionCounts.length === 0 && <div style={{ color: c.subText, fontSize: 12, padding: '8px 0' }}>No data</div>}
            {actionCounts.map(([type, count]) => {
              const action = getAction(type);
              const pct = filtered.length ? Math.round((count / filtered.length) * 100) : 0;
              return (
                <div key={type} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: c.text, fontWeight: 500 }}>{action.label}</span>
                    <span style={{ fontSize: 12, color: c.subText }}>{count}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: action.color, borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Security Alerts */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${c.border}`, fontWeight: 700, fontSize: 13, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} color="#f87171" /> Security Alerts
          </div>
          <div style={{ padding: '10px 16px 14px' }}>
            {securityLogs.length === 0 && <div style={{ color: c.subText, fontSize: 12, padding: '8px 0' }}>No alerts</div>}
            {securityLogs.map(log => {
              const cust = log.customer_id ? custMap[log.customer_id] : null;
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: `1px solid ${c.border}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{log.title || getAction(log.type).label}</div>
                    <div style={{ fontSize: 11, color: c.subText }}>
                      {cust?.name || 'Unknown'} · {log.created_at ? format(parseISO(log.created_at), 'MMM dd, HH:mm') : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminActivityLogPage;
