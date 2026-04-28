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

function CustomerProfileAdminView({ customer, onBack }) {
  const c = {
    bg: '#1c1c1c', sidebar: '#252525', border: '#333', text: '#fff',
    subText: '#a0a0a0', card: '#2a2a2a', hover: '#3a3a3a', brand: '#e87b35'
  };

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
    const name = parts[0] || '-';
    const domainPart = parts.find(p => p.startsWith('Domain:'));
    const domain = domainPart ? domainPart.replace('Domain:', '').trim() : '-';
    return { name, domain };
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

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 };
  const thS = { textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 1, background: c.hover };
  const tdS = { padding: '12px 16px', borderTop: `1px solid ${c.border}`, fontSize: 14, color: c.text };
  const emptyS = { padding: 24, textAlign: 'center', color: c.subText, fontSize: 13 };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const col = s === 'approved' ? { bg: '#1e3a5f', color: '#5b9aff' }
      : s === 'completed' ? { bg: '#1e4028', color: '#639922' }
      : s === 'pending' ? { bg: '#382512', color: '#ba7517' }
      : { bg: '#3a1515', color: '#ef4444' };
    return <span style={{ background: col.bg, color: col.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{status || '-'}</span>;
  };

  const Btn = ({ onClick, color, children, title }) => (
    <button onClick={onClick} title={title} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: `1px solid ${color}`, background: 'transparent', color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );

  const SectionHeader = ({ title }) => (
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}`, fontWeight: 700, fontSize: 15, color: c.text }}>{title}</div>
  );

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: c.subText, cursor: 'pointer', marginBottom: 20, fontSize: 14, padding: 0 }}>
        <ChevronLeft size={16} /> Back to Customers
      </button>

      {/* Profile Card */}
      <div style={{ ...cardS, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{customerData.name}</div>
            <div style={{ fontSize: 13, color: c.subText }}>Customer since {customerData.created_at ? format(new Date(customerData.created_at), 'MMM dd, yyyy') : '-'}</div>
          </div>
          <button onClick={handleSaveCustomer} disabled={isSaving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
            {isSaving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { icon: <Mail size={12} />, label: 'Email', key: 'email' },
            { icon: <Phone size={12} />, label: 'Phone', key: 'phone' },
            { icon: <Building size={12} />, label: 'Company', key: 'company' },
            { icon: <Globe size={12} />, label: 'Country', key: 'country' }
          ].map(f => (
            <div key={f.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{f.icon} {f.label}</div>
              <input
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                value={customerData[f.key] || ''}
                onChange={e => setCustomerData({ ...customerData, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Approved Domains */}
      <div style={cardS}>
        <SectionHeader title="Domains" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Domain</th>
              <th style={thS}>Status</th>
              <th style={thS}>Expiry</th>
              <th style={{ ...thS, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {approvedDomains.map(d => (
              <tr key={d.id}>
                <td style={tdS}>{d.domain_name || '-'}</td>
                <td style={tdS}><StatusBadge status={d.status} /></td>
                <td style={tdS}>{d.expiry_date ? format(new Date(d.expiry_date), 'MMM dd, yyyy') : '-'}</td>
                <td style={{ ...tdS, textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <Btn color={c.brand} onClick={() => sendExpiryReminder('domain', d)} title="Send expiry reminder"><Bell size={12} /> Notify</Btn>
                    <Btn color="#ef4444" onClick={() => deleteItem('domain', d.id)} title="Delete"><Trash2 size={12} /> Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {approvedDomains.length === 0 && <tr><td colSpan={4} style={emptyS}>No domains found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Approved Hosting Packages */}
      <div style={cardS}>
        <SectionHeader title="Hosting Packages" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Package</th>
              <th style={thS}>Domain</th>
              <th style={thS}>Status</th>
              <th style={thS}>Expiry</th>
              <th style={{ ...thS, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {approvedHosting.map(h => {
              const { name, domain } = parsePackage(h.package_type);
              return (
                <tr key={h.id}>
                  <td style={tdS}>{name}</td>
                  <td style={tdS}>{domain}</td>
                  <td style={tdS}><StatusBadge status={h.status} /></td>
                  <td style={tdS}>{h.expiry_date ? format(new Date(h.expiry_date), 'MMM dd, yyyy') : '-'}</td>
                  <td style={{ ...tdS, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <Btn color={c.brand} onClick={() => sendExpiryReminder('hosting', h)} title="Send expiry reminder"><Bell size={12} /> Notify</Btn>
                      <Btn color="#ef4444" onClick={() => deleteItem('hosting', h.id)} title="Delete"><Trash2 size={12} /> Delete</Btn>
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
        <SectionHeader title="Pending Domain Requests" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Domain</th>
              <th style={thS}>Status</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingDomainReqs.map(r => (
              <tr key={r.id}>
                <td style={tdS}>{r.domain_name || '-'}</td>
                <td style={tdS}><StatusBadge status={r.status} /></td>
                <td style={{ ...tdS, textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <Btn color="#16a34a" onClick={() => updateRequestStatus('domain', r.id, 'approved')}>Approve</Btn>
                    <Btn color="#dc2626" onClick={() => updateRequestStatus('domain', r.id, 'rejected')}>Reject</Btn>
                    <Btn color={c.subText} onClick={() => deleteItem('domain', r.id)}>Delete</Btn>
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
        <SectionHeader title="Pending Hosting Requests" />
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
            {pendingHostingReqs.map(r => {
              const { name, domain } = parsePackage(r.package_type);
              return (
                <tr key={r.id}>
                  <td style={tdS}>{name}</td>
                  <td style={tdS}>{domain}</td>
                  <td style={tdS}><StatusBadge status={r.status} /></td>
                  <td style={{ ...tdS, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <Btn color="#16a34a" onClick={() => updateRequestStatus('hosting', r.id, 'approved')}>Approve</Btn>
                      <Btn color="#dc2626" onClick={() => updateRequestStatus('hosting', r.id, 'rejected')}>Reject</Btn>
                      <Btn color={c.subText} onClick={() => deleteItem('hosting', r.id)}>Delete</Btn>
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
