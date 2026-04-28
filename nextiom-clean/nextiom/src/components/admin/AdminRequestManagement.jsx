import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { getDomainRequests, updateDomainRequest, REQUEST_STATUS, getCustomers, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function AdminRequestManagement({ isDark = true }) {
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
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
      ? s === 'approved' || s === 'completed' ? { bg: '#1a3020', color: '#4ade80', dot: '#4ade80' }
        : s === 'pending' ? { bg: '#3b2508', color: '#fb923c', dot: '#fb923c' }
        : { bg: '#3a1515', color: '#f87171', dot: '#f87171' }
      : s === 'approved' || s === 'completed' ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
        : s === 'pending' ? { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' }
        : { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
        {status || '-'}
      </span>
    );
  };

  const Btn = ({ onClick, color, children, filled }) => (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${color}`,
      background: filled ? color : 'transparent',
      color: filled ? '#fff' : color,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
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
    const [reqs, custs] = await Promise.all([getDomainRequests(), getCustomers()]);
    setRequests(reqs || []);
    setCustomers(custs || []);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const req = requests.find(r => r.id === id);
    await updateDomainRequest(id, { status: String(newStatus).toLowerCase(), updated_at: new Date().toISOString() });
    if (req?.customer_id) {
      const isApproved = String(newStatus).toLowerCase() === REQUEST_STATUS.COMPLETED.toLowerCase() || String(newStatus).toLowerCase() === 'approved';
      await addNotification({
        customer_id: req.customer_id,
        type: isApproved ? 'update' : 'expiration',
        title: isApproved ? `Domain Request Approved — ${req.domain_name}` : `Domain Request Rejected — ${req.domain_name}`,
        message: isApproved ? `Your domain request for ${req.domain_name} has been approved.` : `Your domain request for ${req.domain_name} has been declined.`
      }).catch(() => {});
    }
    toast({ title: 'Request Updated', description: `Request marked as ${newStatus}` });
    loadData();
  };

  const getCustomerName = (req) => req.customers?.name || customers.find(cu => cu.id === req.customer_id)?.name || 'Unknown';
  const isPending = (status) => String(status || '').toLowerCase() === 'pending';
  const formatStatus = (status) => { if (!status) return 'Unknown'; const n = String(status).toLowerCase(); return n.charAt(0).toUpperCase() + n.slice(1); };

  return (
    <div>
      <div style={cardS}>
        <SectionHeader title="Domain Requests" accent="#ba7517" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Type</th>
              <th style={thS}>Domain</th>
              <th style={thS}>Customer</th>
              <th style={thS}>Status</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req, i) => (
              <tr key={req.id}>
                <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ fontWeight: 600 }}>{req.type || 'New Registration'}</span></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb' }}>{req.domain_name || '—'}</span>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: c.subText }}>{getCustomerName(req)}</span></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={formatStatus(req.status)} /></td>
                <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                  {isPending(req.status) && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Btn color="#16a34a" filled onClick={() => handleStatusUpdate(req.id, REQUEST_STATUS.COMPLETED)}><CheckCircle size={12} /> Approve</Btn>
                      <Btn color="#ef4444" onClick={() => handleStatusUpdate(req.id, REQUEST_STATUS.REJECTED)}><XCircle size={12} /> Reject</Btn>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={5} style={emptyS}>No domain requests found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminRequestManagement;
