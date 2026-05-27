import React, { useEffect, useState } from 'react';
import { ChevronLeft, Mail, Phone, Building, Globe, Bell, Trash2, KeyRound, Package, Edit, RefreshCw, Infinity } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  getCustomerById,
  updateCustomer,
  getCustomerDomainRequests,
  getCustomerHostingRequests,
  updateDomainRequest,
  updateHostingRequest,
  deleteDomainRequest,
  deleteHostingRequest,
  addNotification,
  getLicenses,
  updateLicense,
  deleteLicense,
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
  const [licenses, setLicenses] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { toast } = useToast();

  const loadAll = async () => {
    if (!customer?.id) return;
    const [fullCustomer, domReqs, hostReqs, lics] = await Promise.all([
      getCustomerById(customer.id),
      getCustomerDomainRequests(customer.id),
      getCustomerHostingRequests(customer.id),
      getLicenses(customer.id),
    ]);
    setCustomerData(fullCustomer || customer);
    setDomainRequests(domReqs || []);
    setHostingRequests(hostReqs || []);
    setLicenses(lics || []);
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
    const req = type === 'domain'
      ? domainRequests.find(r => r.id === id)
      : hostingRequests.find(r => r.id === id);
    if (type === 'domain') await updateDomainRequest(id, { status, updated_at: new Date().toISOString() });
    else await updateHostingRequest(id, { status, updated_at: new Date().toISOString() });
    const label = type === 'domain' ? (req?.domain_name || 'Domain') : (parsePackage(req?.package_type || '').name || 'Hosting');
    addNotification({ customer_id: null, type: 'request_updated', title: `${type === 'domain' ? 'Domain' : 'Hosting'} Request Updated — ${label}`, message: `Admin set ${label} request to "${status}" for ${customerData.name}.` }).catch(() => {});
    await loadAll();
    toast({ title: 'Updated', description: `Request marked as ${status}.` });
  };

  const deleteItem = async (type, id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    const req = type === 'domain'
      ? [...domainRequests].find(r => r.id === id)
      : [...hostingRequests].find(r => r.id === id);
    if (type === 'domain') await deleteDomainRequest(id);
    else await deleteHostingRequest(id);
    const label = type === 'domain' ? (req?.domain_name || 'Domain') : (parsePackage(req?.package_type || '').name || 'Hosting');
    addNotification({ customer_id: null, type: 'delete', title: `${type === 'domain' ? 'Domain' : 'Hosting'} Request Deleted — ${label}`, message: `Admin deleted ${label} request for ${customerData.name}.` }).catch(() => {});
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

  const handleSendPasswordReset = async () => {
    if (!customerData?.email) return;
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(customerData.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSendingReset(false);
    if (error) {
      const msg = error.message || '';
      const friendly = msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('over_email') || error.status === 429
        ? 'Email rate limit reached (3/hour). Please wait before trying again.'
        : msg || 'Failed to send reset email.';
      toast({ title: 'Error', description: friendly, variant: 'destructive' });
    } else {
      toast({ title: 'Reset Email Sent', description: `Password reset link sent to ${customerData.email}.` });
    }
  };

  const handleSaveCustomer = async () => {
    setIsSaving(true);
    try {
      await updateCustomer(customerData.id, {
        name: customerData.name, email: customerData.email,
        phone: customerData.phone, company: customerData.company, country: customerData.country
      });
      addNotification({ customer_id: null, type: 'customer_updated', title: `Customer Updated — ${customerData.name}`, message: `Admin updated profile for ${customerData.name} (${customerData.email}).` }).catch(() => {});
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
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSendPasswordReset} disabled={isSendingReset} title="Send password reset email to this customer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9, border: `1.5px solid ${c.brand}`,
              background: 'transparent', color: c.brand, fontSize: 12, fontWeight: 600,
              cursor: isSendingReset ? 'default' : 'pointer', opacity: isSendingReset ? 0.65 : 1,
              transition: 'opacity 0.2s, background 0.15s', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (!isSendingReset) e.currentTarget.style.background = 'rgba(232,123,53,0.08)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <KeyRound size={13} />
              {isSendingReset ? 'Sending…' : 'Send Password Reset'}
            </button>
            <button onClick={handleSaveCustomer} disabled={isSaving} style={{
              padding: '9px 22px', borderRadius: 9, border: 'none', background: c.brand,
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: isSaving ? 'default' : 'pointer',
              opacity: isSaving ? 0.65 : 1, transition: 'opacity 0.2s'
            }}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
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

      {/* Row 1: Active Domains | Hosting Packages */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...cardS, marginBottom: 0 }}>
          <SectionHeader title="Active Domains" accent="#378ADD" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thS}>Domain</th>
                  <th style={thS}>Status</th>
                  <th style={thS}>Expiry</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedDomains.map((d, i) => (
                  <tr key={d.id}>
                    <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb', fontSize: 12 }}>{d.domain_name || '-'}</span></td>
                    <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={d.status} /></td>
                    <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: d.expiry_date ? c.text : c.subText, fontSize: 12 }}>{d.expiry_date ? format(new Date(d.expiry_date), 'MMM dd, yy') : '—'}</span></td>
                    <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <Btn color={c.brand} onClick={() => sendExpiryReminder('domain', d)}><Bell size={11} /></Btn>
                        <Btn color="#ef4444" onClick={() => deleteItem('domain', d.id)}><Trash2 size={11} /></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
                {approvedDomains.length === 0 && <tr><td colSpan={4} style={emptyS}>No active domains</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...cardS, marginBottom: 0 }}>
          <SectionHeader title="Hosting Packages" accent="#639922" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thS}>Package</th>
                  <th style={thS}>Status</th>
                  <th style={thS}>Expiry</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedHosting.map((h, i) => {
                  const { name } = parsePackage(h.package_type);
                  const expiry = h.expiry_date ? new Date(h.expiry_date) : computeExpiry(h.package_type, h.updated_at || h.created_at);
                  const row = i % 2 === 0 ? tdS : tdAlt;
                  return (
                    <tr key={h.id}>
                      <td style={row}><span style={{ fontWeight: 600, color: c.text, fontSize: 12 }}>{name}</span></td>
                      <td style={row}><StatusBadge status={h.status} /></td>
                      <td style={row}><span style={{ color: expiry ? c.text : c.subText, fontSize: 12 }}>{expiry ? format(expiry, 'MMM dd, yy') : '—'}</span></td>
                      <td style={{ ...row, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <Btn color={c.brand} onClick={() => sendExpiryReminder('hosting', h)}><Bell size={11} /></Btn>
                          <Btn color="#ef4444" onClick={() => deleteItem('hosting', h.id)}><Trash2 size={11} /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {approvedHosting.length === 0 && <tr><td colSpan={4} style={emptyS}>No hosting packages</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 2: Pending Domain Requests | Pending Hosting Requests */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...cardS, marginBottom: 0 }}>
          <SectionHeader title="Pending Domain Requests" accent="#ba7517" />
          <div style={{ overflowX: 'auto' }}>
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
                    <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb', fontSize: 12 }}>{r.domain_name || '-'}</span></td>
                    <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={r.status} /></td>
                    <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <Btn color="#16a34a" filled onClick={() => updateRequestStatus('domain', r.id, 'approved')}>✓</Btn>
                        <Btn color="#dc2626" onClick={() => updateRequestStatus('domain', r.id, 'rejected')}>✗</Btn>
                        <Btn color={c.subText} onClick={() => deleteItem('domain', r.id)}><Trash2 size={11} /></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingDomainReqs.length === 0 && <tr><td colSpan={3} style={emptyS}>No pending requests</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...cardS, marginBottom: 0 }}>
          <SectionHeader title="Pending Hosting Requests" accent="#8b5cf6" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thS}>Package</th>
                  <th style={thS}>Status</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingHostingReqs.map((r, i) => {
                  const { name } = parsePackage(r.package_type);
                  const row = i % 2 === 0 ? tdS : tdAlt;
                  return (
                    <tr key={r.id}>
                      <td style={row}><span style={{ fontWeight: 600, color: c.text, fontSize: 12 }}>{name}</span></td>
                      <td style={row}><StatusBadge status={r.status} /></td>
                      <td style={{ ...row, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <Btn color="#16a34a" filled onClick={() => updateRequestStatus('hosting', r.id, 'approved')}>✓</Btn>
                          <Btn color="#dc2626" onClick={() => updateRequestStatus('hosting', r.id, 'rejected')}>✗</Btn>
                          <Btn color={c.subText} onClick={() => deleteItem('hosting', r.id)}><Trash2 size={11} /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pendingHostingReqs.length === 0 && <tr><td colSpan={3} style={emptyS}>No pending requests</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assigned Products */}
      <div style={{ ...cardS, marginBottom: 0 }}>
        <SectionHeader title="Assigned Products" accent="#6366f1" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Product</th>
                <th style={thS}>Type</th>
                <th style={thS}>License Type</th>
                <th style={thS}>License Key</th>
                <th style={thS}>Status</th>
                <th style={thS}>Expiry</th>
                <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic, i) => {
                const row = i % 2 === 0 ? tdS : tdAlt;
                const lt = lic.product?.license_type || lic.license_type || 'one_time';
                const ltLabel = lt === 'one_time' ? 'One Time' : lt === 'yearly' ? 'Yearly' : 'Lifetime';
                const ltColor = lt === 'one_time' ? '#22c55e' : lt === 'yearly' ? '#f59e0b' : '#6366f1';
                return (
                  <tr key={lic.id}>
                    <td style={row}><span style={{ fontWeight: 600, color: c.text, fontSize: 13 }}>{lic.name}</span></td>
                    <td style={row}><span style={{ color: c.subText, fontSize: 12 }}>{lic.product?.type || '-'}</span></td>
                    <td style={row}>
                      <span style={{ color: ltColor, fontWeight: 500, fontSize: 12 }}>{ltLabel}</span>
                    </td>
                    <td style={row}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: c.subText }}>{lic.license_key || '-'}</span>
                    </td>
                    <td style={row}><StatusBadge status={lic.status} /></td>
                    <td style={row}>
                      <span style={{ color: c.text, fontSize: 12 }}>
                        {lt === 'yearly'
                          ? (lic.expiry_date ? format(new Date(lic.expiry_date), 'MMM dd, yyyy') : '—')
                          : lt === 'lifetime' ? 'Lifetime' : 'One Time'}
                      </span>
                    </td>
                    <td style={{ ...row, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <Btn color={c.brand} onClick={async () => {
                          const next = lic.status === 'Active' ? 'Disabled' : 'Active';
                          await updateLicense(lic.id, { status: next });
                          addNotification({ customer_id: null, type: 'license_updated', title: `License ${next} — ${lic.products?.name || 'Product'}`, message: `Admin set license for "${lic.products?.name || 'a product'}" to ${next} for ${customerData.name}.` }).catch(() => {});
                          await loadAll();
                          toast({ title: 'License updated', description: `Status set to ${next}.` });
                        }}>
                          <Edit size={11} /> {lic.status === 'Active' ? 'Disable' : 'Enable'}
                        </Btn>
                        <Btn color="#ef4444" onClick={async () => {
                          if (!confirm('Revoke this product license? Customer will lose access.')) return;
                          await deleteLicense(lic.id);
                          addNotification({ customer_id: null, type: 'delete', title: `License Revoked — ${lic.products?.name || 'Product'}`, message: `Admin revoked license for "${lic.products?.name || 'a product'}" from ${customerData.name}.` }).catch(() => {});
                          await loadAll();
                          toast({ title: 'License revoked', description: 'Product access removed.' });
                        }}>
                          <Trash2 size={11} /> Delete
                        </Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {licenses.length === 0 && <tr><td colSpan={7} style={emptyS}>No products assigned</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CustomerProfileAdminView;
