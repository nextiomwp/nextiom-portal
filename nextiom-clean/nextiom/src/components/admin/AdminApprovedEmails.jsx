import React, { useState, useEffect } from 'react';
import { Search, Edit, Loader2, Trash2, Bell, X, ChevronDown, Server, Key, User as UserIcon } from 'lucide-react';
import { getEmailRequests, updateEmailRequest, deleteEmailRequest, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import AssignEmailDialog from '@/components/dialogs/AssignEmailDialog';

function parseEmailNameType(raw) {
  if (!raw) return { emailType: '—', planName: '—', billing: '—' };
  const parts = raw.split('|').map(s => s.trim());
  const mainPart = parts[0] || '';
  const dashIdx = mainPart.indexOf(' - ');
  const emailType = dashIdx >= 0 ? mainPart.slice(0, dashIdx).trim() : mainPart;
  const planName = dashIdx >= 0 ? mainPart.slice(dashIdx + 3).trim() : '—';
  const billingPart = parts.find(p => p.startsWith('Billing:'));
  const billing = billingPart ? billingPart.replace('Billing:', '').trim() : '—';
  return { emailType, planName, billing };
}

function AdminApprovedEmails({ isDark = true }) {
  const [emails, setEmails] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expFilter, setExpFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)', input: '#22252C', overlay: 'rgba(0,0,0,0.6)' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: 'var(--brand-color)', input: '#f5f5f5', overlay: 'rgba(0,0,0,0.4)' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };
  const inpS = { width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.input, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const col = isDark
      ? s === 'active' || s === 'approved' ? { bg: '#1a3020', color: '#4ade80', dot: '#4ade80' }
        : s === 'pending' ? { bg: '#3b2508', color: '#fb923c', dot: '#fb923c' }
          : s === 'expired' ? { bg: '#3a1515', color: '#f87171', dot: '#f87171' }
            : { bg: '#1e2d40', color: '#60a5fa', dot: '#60a5fa' }
      : s === 'active' || s === 'approved' ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
        : s === 'pending' ? { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' }
          : s === 'expired' ? { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' }
            : { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
        {status || '-'}
      </span>
    );
  };

  const Btn = ({ onClick, color, children, title }) => (
    <button onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${color}`, background: 'transparent',
      color, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
    }}>
      {children}
    </button>
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getEmailRequests();
      setEmails((data || []).filter(h => ['approved', 'active', 'completed'].includes(String(h.status || '').toLowerCase())));
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load email data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const billingMonths = (billing) => {
    const b = String(billing || '').toLowerCase();
    if (b.includes('yearly') || b.includes('annual')) return 12;
    if (b.includes('6')) return 6;
    if (b.includes('3')) return 3;
    return 1; // monthly default
  };

  const calcExpiry = (h) => {
    if (h.expiry_date) return new Date(h.expiry_date);
    if (!h.updated_at) return null;
    const { billing } = parseEmailNameType(h.package_type);
    const base = new Date(h.updated_at);
    base.setMonth(base.getMonth() + billingMonths(billing));
    return base;
  };

  const daysUntilExpiry = (expiry) => {
    if (!expiry) return null;
    return Math.ceil((new Date(expiry) - new Date()) / 86400000);
  };

  const FILTER_OPTIONS = [
    { key: 'all', label: 'All types' },
    { key: '30', label: 'Expire in 1 month' },
    { key: '7', label: 'Expire in 7 days' },
    { key: '3', label: 'Expire in 3 days' },
    { key: '1', label: 'Expire tomorrow' },
  ];

  const filteredEmails = emails.filter(h => {
    const parsed = parseEmailNameType(h.package_type);
    const matchSearch =
      (parsed.emailType + ' ' + parsed.planName + ' ' + (h.customers?.name || '') + ' ' + (h.package_type || ''))
        .toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (expFilter === 'all') return true;
    const expiryDate = calcExpiry(h);
    const days = expiryDate ? daysUntilExpiry(expiryDate) : null;
    if (days === null) return false;
    const limit = parseInt(expFilter);
    return days >= 0 && days <= limit;
  });

  const openEdit = (h) => {
    setEditItem(h);
  };

  const handleDelete = async (h) => {
    const parsed = parseEmailNameType(h.package_type);
    if (!window.confirm(`Delete approved email "${parsed.emailType} - ${parsed.planName}" for ${h.customers?.name || 'this customer'}? This cannot be undone.`)) return;
    try {
      await deleteEmailRequest(h.id);
      const label = `${parsed.emailType} — ${parsed.planName}`;
      addNotification({ customer_id: null, type: 'delete', title: `Email Deleted — ${label}`, message: `Admin permanently deleted email record for ${h.customers?.name || 'a customer'} (${label}).` }).catch(() => { });
      toast({ title: 'Email Deleted', description: 'Email record has been removed.' });
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete email', variant: 'destructive' });
    }
  };

  const handleNotify = async (h) => {
    if (!h.customer_id) { toast({ title: 'Error', description: 'No customer linked.', variant: 'destructive' }); return; }
    const days = daysUntilExpiry(h.expiry_date);
    const parsed = parseEmailNameType(h.package_type);
    const daysText = days !== null ? `${days} day${days !== 1 ? 's' : ''}` : 'soon';
    const expiryStr = h.expiry_date ? new Date(h.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const packageName = `${parsed.emailType} — ${parsed.planName}`;
    try {
      await addNotification({
        customer_id: h.customer_id,
        type: 'email_expiry',
        title: `Email Expiry Notice — ${packageName}`,
        message: `Dear valued customer,\n\nThis is a courtesy reminder that your email package (${packageName}) is scheduled to expire in ${daysText} (on ${expiryStr}).\n\nTo ensure continued availability of your website and associated services, we strongly recommend renewing your email plan before the expiry date. Service interruptions may occur if the package is not renewed in time.\n\nFor assistance with renewal or to explore upgrade options, please reach out to our support team.\n\nBest regards,\nNEXTIOM Team`,
      });
      toast({ title: 'Notification Sent', description: `Expiry reminder sent for ${packageName}.` });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to send notification', variant: 'destructive' });
    }
  };

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Loader2 className="animate-spin" size={28} style={{ color: c.brand }} />
    </div>
  );

  const activeFilterLabel = FILTER_OPTIONS.find(o => o.key === expFilter)?.label || 'All types';

  return (
    <div>
      <style>{`
        .email-table-wrapper {
          display: block;
        }
        .email-cards-wrapper {
          display: none;
        }
        @media (max-width: 768px) {
          .email-table-wrapper {
            display: none;
          }
          .email-cards-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
          }
        }
      `}</style>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: `1.5px solid ${c.border}`, borderRadius: 10, background: c.input, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
            placeholder="Search email type, plan or customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: `1.5px solid ${expFilter !== 'all' ? c.brand : c.border}`, borderRadius: 10, background: expFilter !== 'all' ? (isDark ? 'var(--brand-color-light)' : 'rgba(232,123,53,0.06)') : c.input, color: expFilter !== 'all' ? c.brand : c.text, fontSize: 13, fontWeight: expFilter !== 'all' ? 600 : 400, cursor: 'pointer' }}
          >
            {activeFilterLabel} <ChevronDown size={14} style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
          </button>
          {filterOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 20, minWidth: 180 }}>
              {FILTER_OPTIONS.map(opt => (
                <div key={opt.key}
                  onClick={() => { setExpFilter(opt.key); setFilterOpen(false); }}
                  style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: expFilter === opt.key ? c.brand : c.text, fontWeight: expFilter === opt.key ? 600 : 400, background: expFilter === opt.key ? (isDark ? 'var(--brand-color-light)' : 'rgba(232,123,53,0.06)') : 'transparent' }}>
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={cardS}>
        <div style={{ padding: '15px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: '#639922', flexShrink: 0 }} />
          <Server size={15} style={{ color: '#639922' }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: c.text, letterSpacing: 0.3 }}>Approved Emails</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: c.subText }}>{filteredEmails.length} record{filteredEmails.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="email-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Email</th>
                <th style={thS}>Customer</th>
                <th style={thS}>Status</th>
                <th style={thS}>Start Date</th>
                <th style={thS}>Expiry</th>
                <th style={thS}>Auto Renew</th>
                <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.map((h, i) => {
                const parsed = parseEmailNameType(h.package_type);
                const expiryDate = calcExpiry(h);
                const days = expiryDate ? daysUntilExpiry(expiryDate) : null;
                const urgentColor = days !== null && days <= 7 ? '#ef4444' : days !== null && days <= 30 ? '#f97316' : null;
                return (
                  <tr key={h.id}>
                    <td style={i % 2 === 0 ? tdS : tdAlt}>
                      <span style={{ fontWeight: 600, color: isDark ? '#86efac' : '#15803d' }}>{h.email || '—'}</span>
                    </td>
                    <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: c.text }}>{h.customers?.name || 'Unknown'}</span></td>
                    <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={h.status} /></td>
                    <td style={i % 2 === 0 ? tdS : tdAlt}>
                      <span style={{ color: c.subText, fontSize: 12 }}>{h.start_date ? new Date(h.start_date).toLocaleDateString() : h.created_at ? new Date(h.created_at).toLocaleDateString() : '—'}</span>
                    </td>
                    <td style={i % 2 === 0 ? tdS : tdAlt}>
                      {expiryDate ? (
                        <div>
                          <span style={{ color: urgentColor || c.text }}>{expiryDate.toLocaleDateString()}</span>
                          {days !== null && (
                            <div style={{ fontSize: 11, color: urgentColor || c.subText, marginTop: 2 }}>
                              {days <= 0 ? 'Expired' : `in ${days} day${days !== 1 ? 's' : ''}`}
                            </div>
                          )}
                        </div>
                      ) : <span style={{ color: c.subText }}>—</span>}
                    </td>
                    <td style={i % 2 === 0 ? tdS : tdAlt}>
                      <span style={{ color: h.auto_renew ? '#16a34a' : c.subText, fontWeight: 600, fontSize: 12 }}>{h.auto_renew ? 'Enabled' : 'Disabled'}</span>
                    </td>
                    <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Btn color="#378ADD" onClick={() => openEdit(h)} title="Edit"><Edit size={12} /> Edit</Btn>
                        <Btn color={c.brand} onClick={() => handleNotify(h)} title="Send expiry notification"><Bell size={12} /> Notify</Btn>
                        <Btn color="#ef4444" onClick={() => handleDelete(h)} title="Delete"><Trash2 size={12} /> Delete</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEmails.length === 0 && <tr><td colSpan={7} style={emptyS}>No approved emails found</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="email-cards-wrapper">
          {filteredEmails.map((h) => {
            const parsed = parseEmailNameType(h.package_type);
            const expiryDate = calcExpiry(h);
            const days = expiryDate ? daysUntilExpiry(expiryDate) : null;
            const urgentColor = days !== null && days <= 7 ? '#ef4444' : days !== null && days <= 30 ? '#f97316' : null;
            return (
              <div key={h.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#86efac' : '#15803d', fontSize: 14 }}>{h.email || '—'}</span>
                    <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>{h.plan_name || parsed.planName || '—'}</div>
                  </div>
                  <StatusBadge status={h.status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, padding: '8px 0' }}>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Customer</div>
                    <div style={{ color: c.text, fontWeight: 500, marginTop: 2 }}>{h.customers?.name || 'Unknown'}</div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Start Date</div>
                    <div style={{ color: c.text, marginTop: 2 }}>
                      {h.start_date ? new Date(h.start_date).toLocaleDateString() : h.created_at ? new Date(h.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Expiry Date</div>
                    <div style={{ color: urgentColor || c.text, marginTop: 2, fontWeight: urgentColor ? 600 : 400 }}>
                      {expiryDate ? expiryDate.toLocaleDateString() : '—'}
                      {days !== null && (
                        <span style={{ fontSize: 10, display: 'block', color: urgentColor || c.subText, marginTop: 1 }}>
                          {days <= 0 ? '(Expired)' : `(in ${days} day${days !== 1 ? 's' : ''})`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Auto Renew</div>
                    <div style={{ color: h.auto_renew ? '#16a34a' : c.subText, fontWeight: 600, marginTop: 2 }}>{h.auto_renew ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Btn color="#378ADD" onClick={() => openEdit(h)} title="Edit"><Edit size={12} /> Edit</Btn>
                  <Btn color={c.brand} onClick={() => handleNotify(h)} title="Send expiry notification"><Bell size={12} /> Notify</Btn>
                  <Btn color="#ef4444" onClick={() => handleDelete(h)} title="Delete"><Trash2 size={12} /> Delete</Btn>
                </div>
              </div>
            );
          })}
          {filteredEmails.length === 0 && <div style={emptyS}>No approved emails found</div>}
        </div>
      </div>

      <AssignEmailDialog
        open={!!editItem}
        onClose={() => setEditItem(null)}
        customer={{
          id: editItem?.customer_id,
          name: editItem?.customers?.name || 'Customer',
          email: editItem?.customers?.email || ''
        }}
        request={editItem}
        c={c}
        isEditMode={true}
        onSuccess={() => {
          setEditItem(null);
          loadData();
        }}
      />
    </div>
  );
}

export default AdminApprovedEmails;
