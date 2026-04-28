import React, { useState, useEffect } from 'react';
import { Search, Edit, Loader2, Trash2, Bell } from 'lucide-react';
import { getDomains, getCustomers, deleteDomain } from '@/lib/storage';
import AdminDomainDetailsView from './AdminDomainDetailsView';
import { useToast } from '@/components/ui/use-toast';

function AdminDomainManagement({ isDark = true }) {
  const [domains, setDomains] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const col = isDark
      ? s === 'active' || s === 'approved' ? { bg: '#1a3020', color: '#4ade80', dot: '#4ade80' }
        : s === 'pending' ? { bg: '#3b2508', color: '#fb923c', dot: '#fb923c' }
        : { bg: '#3a1515', color: '#f87171', dot: '#f87171' }
      : s === 'active' || s === 'approved' ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
        : s === 'pending' ? { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' }
        : { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
        {status || '-'}
      </span>
    );
  };

  const Btn = ({ onClick, color, children, title, filled }) => (
    <button onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${color}`,
      background: filled ? color : 'transparent',
      color: filled ? '#fff' : color,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s', whiteSpace: 'nowrap'
    }}>
      {children}
    </button>
  );

  const SectionHeader = ({ title, accent }) => (
    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: accent || c.brand, flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 14, color: c.text, letterSpacing: 0.3 }}>{title}</span>
    </div>
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dData, cData] = await Promise.all([getDomains(), getCustomers()]);
      setDomains(dData || []);
      setCustomers(cData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerName = (id) => {
    const cust = customers.find(cu => cu.id === id);
    return cust ? cust.name : 'Unknown';
  };

  const filteredDomains = domains.filter(d =>
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Loader2 className="animate-spin" size={28} style={{ color: c.brand }} />
    </div>
  );

  if (selectedDomain) return (
    <AdminDomainDetailsView
      domain={selectedDomain}
      customer={customers.find(cu => cu.id === selectedDomain.customer_id)}
      onBack={() => { setSelectedDomain(null); loadData(); }}
    />
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: `1.5px solid ${c.border}`, borderRadius: 10, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
            placeholder="Search domains..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={cardS}>
        <SectionHeader title="Domains" accent="#378ADD" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Domain</th>
              <th style={thS}>Customer</th>
              <th style={thS}>Status</th>
              <th style={thS}>Expiry</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDomains.map((d, i) => (
              <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedDomain(d)}>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb' }}>{d.name}</span>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: c.subText }}>{getCustomerName(d.customer_id)}</span></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={d.status} /></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ color: d.expiry_date ? c.text : c.subText }}>
                    {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : '—'}
                  </span>
                </td>
                <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Btn color="#378ADD" onClick={() => setSelectedDomain(d)} title="Edit"><Edit size={12} /> Edit</Btn>
                    <Btn color={c.brand} onClick={() => toast({ title: 'Reminder Sent', description: `Reminder queued for ${d.name}.` })} title="Send Reminder"><Bell size={12} /> Notify</Btn>
                    <Btn color="#ef4444" onClick={async () => { if (window.confirm('Delete this domain?')) { try { await deleteDomain(d.id); loadData(); } catch (e) {} } }} title="Delete"><Trash2 size={12} /> Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDomains.length === 0 && <tr><td colSpan={5} style={emptyS}>No domains found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDomainManagement;
