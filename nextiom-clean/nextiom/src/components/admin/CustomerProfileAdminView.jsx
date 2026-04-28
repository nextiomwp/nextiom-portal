import React, { useEffect, useState } from 'react';
import { ChevronLeft, Mail, Phone, Building, Globe, Bell, Trash2 } from 'lucide-react';
import {
  getCustomerById,
  updateCustomer,
  getCustomerDomainRequests,
  getCustomerHostingRequests,
  updateDomainRequest,
  updateHostingRequest,
  deleteDomainRequest,
  deleteHostingRequest,
  addNotification
} from '@/lib/storage';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

function CustomerProfileAdminView({ customer, onBack, isDark = true }) {
  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35' };

  const [customerData, setCustomerData] = useState(customer || null);
  const [domainRequests, setDomainRequests] = useState([]);
  const [hostingRequests, setHostingRequests] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadAll = async () => {
    if (!customer?.id) return;
    const [fullCustomer, domReqs, hostReqs] = await Promise.all([
      getCustomerById(customer.id),
      getCustomerDomainRequests(customer.id),
      getCustomerHostingRequests(customer.id)
    ]);
    setCustomerData(fullCustomer || customer);
    setDomainRequests(domReqs || []);
    setHostingRequests(hostReqs || []);
  };

  useEffect(() => { loadAll(); }, [customer?.id]);

  if (!customerData) return null;

  const isApproved = (s) => ['approved', 'completed'].includes(String(s || '').toLowerCase());
  const isPending = (s) => String(s || '').toLowerCase() === 'pending';

  const approvedDomains = domainRequests.filter(r => isApproved(r.status));
  const approvedHosting = hostingRequests.filter(r => isApproved(r.status));
  const pendingDomainReqs = domainRequests.filter(r => isPending(r.status));
  const pendingHostingReqs = hostingRequests.filter(r => isPending(r.status));

  const parsePackage = (packageType) => {
    const parts = (packageType || '').split(' | ');
    const name = parts[0]?.trim() || '-';
    const domainPart = parts.find(p => p.startsWith('Domain:'));
    const domain = domainPart ? domainPart.replace('Domain:', '').trim() : '-';
    const billingPart = parts.find(p => p.startsWith('Billing:'));
    const billing = billingPart ? billingPart.replace('Billing:', '').trim().toLowerCase() : 'yearly';
    return { name, domain, billing };
  };

  const computeExpiry = (packageType, createdAt) => {
    if (!createdAt) return null;
    const { billing } = parsePackage(packageType);
    const d = new Date(createdAt);
    if (billing.includes('month')) d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d;
  };

  const updateRequestStatus = async (type, id, status) => {
    if (type === 'domain') await updateDomainRequest(id, { status, updated_at: new Date().toISOString() });
    else await updateHostingRequest(id, { status, updated_at: new Date().toISOString() });
    await loadAll();
    toast({ title: 'Updated', description: `Request marked as ${status}.` });
  };

  const deleteItem = async (type, id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    if (type === 'domain') await deleteDomainRequest(id);
    else await deleteHostingRequest(id);
    await loadAll();
    toast({ title: 'Deleted', description: 'Item removed successfully.' });
  };

  const sendExpiryReminder = async (type, item) => {
    const today = new Date();
    const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
    const daysLeft = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
    let title, message;
    if (type === 'domain') {
      title = `Domain Renewal Reminder — ${item.domain_name}`;
      message = daysLeft !== null
        ? `Your domain "${item.domain_name}" will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please renew promptly to avoid service disruption.`
        : `Please renew your domain "${item.domain_name}" to ensure continued service.`;
    } else {
      const { name } = parsePackage(item.package_type);
      title = `Hosting Renewal Reminder — ${name}`;
      message = `Your hosting package "${name}" is due for renewal. Please contact us to avoid any service interruption.`;
    }
    await addNotification({ customer_id: customerData.id, type: 'expiration', title, message });
    toast({ title: 'Notification Sent', description: 'Expiry reminder sent to customer.' });
  };

  const handleSaveCustomer = async () => {
    setIsSaving(true);
    try {
      await updateCustomer(customerData.id, {
        name: customerData.name, email: customerData.email,
        phone: customerData.phone, company: customerData.company, country: customerData.country
      });
      toast({ title: 'Customer Updated', description: 'Profile saved.' });
      await loadAll();
    } finally { setIsSaving(false); }
  };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };

  const thS = {
    textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700,
    color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2,
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
    borderBottom: `1px solid ${c.border}`
  };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const col = isDark
      ? s === 'approved' ? { bg: '#1a3052', color: '#60a5fa', dot: '#60a5fa' }
        : s === 'completed' ? { bg: '#1a3020', color: '#4ade80', dot: '#4ade80' }
        : s === 'pending' ? { bg: '#3b2508', color: '#fb923c', dot: '#fb923c' }
        : { bg: '#3a1515', color: '#f87171', dot: '#f87171' }
      : s === 'approved' ? { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' }
        : s === 'completed' ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
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
      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
      whiteSpace: 'nowrap'
    }}>
      {children}
    </button>
  );

  const SectionHeader = ({ title, accent }) => (
    <div style={{
      padding: '15px 20px', borderBottom: `1px solid ${c.border}`,
      display: 'flex', alignItems: 'center', gap: 10,
      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'
    }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: accent || c.brand, flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 14, color: c.text, letterSpacing: 0.3 }}>{title}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        color: c.subText, cursor: 'pointer', marginBottom: 24, fontSize: 13.5, padding: '6px 0',
        fontWeight: 500, transition: 'color 0.15s'
      }}>
        <ChevronLeft size={16} /> Back to Customers
      </button>

      {/* Profile Card */}
      <div style={{ ...cardS }}>
        <div style={{
          padding: '20px 24px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderBottom: `1px solid ${c.border}`,
          background: isDark ? 'rgba(232,123,53,0.07)' : 'rgba(232,123,53,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 24, background: c.brand,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0
            }}>
              {(customerData.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.text }}>{customerData.name}</div>
              <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>
                Customer since {customerData.created_at ? format(new Date(customerData.created_at), 'MMM dd, yyyy') : '-'}
              </div>
            </div>
          </div>
          <button onClick={handleSaveCustomer} disabled={isSaving} style={{
            padding: '9px 22px', borderRadius: 9, border: 'none', background: c.brand,
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: isSaving ? 'default' : 'pointer',
            opacity: isSaving ? 0.65 : 1, transition: 'opacity 0.2s'
          }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { icon: <Mail size={13} />, label: 'Email', key: 'email' },
            { icon: <Phone size={13} />, label: 'Phone', key: 'phone' },
            { icon: <Building size={13} />, label: 'Company', key: 'company' },
            { icon: <Globe size={13} />, label: 'Country', key: 'country' }
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {f.icon} {f.label}
              </label>
              <input
                style={{
                  width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`,
                  borderRadius: 9, background: c.bg, color: c.text, fontSize: 14,
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s'
                }}
                value={customerData[f.key] || ''}
                onChange={e => setCustomerData({ ...customerData, [f.key]: e.target.value })}
                onFocus={e => e.target.style.borderColor = c.brand}
                onBlur={e => e.target.style.borderColor = c.border}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Approved Domains */}
      <div style={cardS}>
        <SectionHeader title="Active Domains" accent="#378ADD" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Domain Name</th>
              <th style={thS}>Status</th>
              <th style={thS}>Expiry Date</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvedDomains.map((d, i) => (
              <tr key={d.id}>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb' }}>{d.domain_name || '-'}</span>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={d.status} /></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ color: d.expiry_date ? c.text : c.subText }}>
                    {d.expiry_date ? format(new Date(d.expiry_date), 'MMM dd, yyyy') : '—'}
                  </span>
                </td>
                <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Btn color={c.brand} onClick={() => sendExpiryReminder('domain', d)} title="Send expiry reminder"><Bell size={12} /> Notify</Btn>
                    <Btn color="#ef4444" onClick={() => deleteItem('domain', d.id)} title="Delete domain"><Trash2 size={12} /> Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {approvedDomains.length === 0 && <tr><td colSpan={4} style={emptyS}>No active domains</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Approved Hosting Packages */}
      <div style={cardS}>
        <SectionHeader title="Hosting Packages" accent="#639922" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Package</th>
              <th style={thS}>Domain</th>
              <th style={thS}>Status</th>
              <th style={thS}>Expiry Date</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvedHosting.map((h, i) => {
              const { name, domain } = parsePackage(h.package_type);
              const expiry = h.expiry_date ? new Date(h.expiry_date) : computeExpiry(h.package_type, h.updated_at || h.created_at);
              const row = i % 2 === 0 ? tdS : tdAlt;
              return (
                <tr key={h.id}>
                  <td style={row}><span style={{ fontWeight: 600, color: c.text }}>{name}</span></td>
                  <td style={row}><span style={{ fontFamily: 'monospace', color: isDark ? '#a5b4fc' : '#4f46e5' }}>{domain}</span></td>
                  <td style={row}><StatusBadge status={h.status} /></td>
                  <td style={row}>
                    <span style={{ color: expiry ? c.text : c.subText }}>
                      {expiry ? format(expiry, 'MMM dd, yyyy') : '—'}
                    </span>
                  </td>
                  <td style={{ ...row, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Btn color={c.brand} onClick={() => sendExpiryReminder('hosting', h)} title="Send expiry reminder"><Bell size={12} /> Notify</Btn>
                      <Btn color="#ef4444" onClick={() => deleteItem('hosting', h.id)} title="Delete package"><Trash2 size={12} /> Delete</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {approvedHosting.length === 0 && <tr><td colSpan={5} style={emptyS}>No hosting packages found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pending Domain Requests */}
      <div style={cardS}>
        <SectionHeader title="Pending Domain Requests" accent="#ba7517" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Domain</th>
              <th style={thS}>Status</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingDomainReqs.map((r, i) => (
              <tr key={r.id}>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb' }}>{r.domain_name || '-'}</span>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={r.status} /></td>
                <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Btn color="#16a34a" filled onClick={() => updateRequestStatus('domain', r.id, 'approved')}>Approve</Btn>
                    <Btn color="#dc2626" onClick={() => updateRequestStatus('domain', r.id, 'rejected')}>Reject</Btn>
                    <Btn color={c.subText} onClick={() => deleteItem('domain', r.id)}><Trash2 size={12} /></Btn>
                  </div>
                </td>
              </tr>
            ))}
            {pendingDomainReqs.length === 0 && <tr><td colSpan={3} style={emptyS}>No pending domain requests</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pending Hosting Requests */}
      <div style={cardS}>
        <SectionHeader title="Pending Hosting Requests" accent="#8b5cf6" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Package</th>
              <th style={thS}>Domain</th>
              <th style={thS}>Status</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingHostingReqs.map((r, i) => {
              const { name, domain } = parsePackage(r.package_type);
              const row = i % 2 === 0 ? tdS : tdAlt;
              return (
                <tr key={r.id}>
                  <td style={row}><span style={{ fontWeight: 600, color: c.text }}>{name}</span></td>
                  <td style={row}><span style={{ fontFamily: 'monospace', color: isDark ? '#a5b4fc' : '#4f46e5' }}>{domain}</span></td>
                  <td style={row}><StatusBadge status={r.status} /></td>
                  <td style={{ ...row, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Btn color="#16a34a" filled onClick={() => updateRequestStatus('hosting', r.id, 'approved')}>Approve</Btn>
                      <Btn color="#dc2626" onClick={() => updateRequestStatus('hosting', r.id, 'rejected')}>Reject</Btn>
                      <Btn color={c.subText} onClick={() => deleteItem('hosting', r.id)}><Trash2 size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pendingHostingReqs.length === 0 && <tr><td colSpan={4} style={emptyS}>No pending hosting requests</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomerProfileAdminView;
