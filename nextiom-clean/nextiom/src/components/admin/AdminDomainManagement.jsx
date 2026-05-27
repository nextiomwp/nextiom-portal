import React, { useState, useEffect } from 'react';
import { Search, Edit, Loader2, Trash2, Bell, X, ChevronDown } from 'lucide-react';
import { getDomainRequests, updateDomainRequest, deleteDomainRequest, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function AdminDomainManagement({ isDark = true }) {
  const [domains, setDomains] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expFilter, setExpFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editDomain, setEditDomain] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', input: '#22252C', overlay: 'rgba(0,0,0,0.6)' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', input: '#f5f5f5', overlay: 'rgba(0,0,0,0.4)' };

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

  const Btn = ({ onClick, color, children, title }) => (
    <button onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${color}`, background: 'transparent',
      color, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s', whiteSpace: 'nowrap'
    }}>
      {children}
    </button>
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getDomainRequests();
      setDomains((data || []).filter(d => String(d.status || '').toLowerCase() === 'approved'));
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load domains', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
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

  const filteredDomains = domains.filter(d => {
    const matchSearch = (d.domain_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (expFilter === 'all') return true;
    const days = daysUntilExpiry(d.expiry_date);
    if (days === null) return false;
    const limit = parseInt(expFilter);
    return days >= 0 && days <= limit;
  });

  const openEdit = (d) => {
    setEditDomain(d);
    setEditForm({
      domain_name: d.domain_name || '',
      status: d.status || 'approved',
      registration_period: d.registration_period || '',
      expiry_date: d.expiry_date ? d.expiry_date.split('T')[0] : '',
      auto_renew: d.auto_renew ?? true,
      notes: d.notes || '',
      admin_reply: d.admin_reply || '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDomainRequest(editDomain.id, {
        domain_name: editForm.domain_name,
        status: editForm.status,
        registration_period: editForm.registration_period ? Number(editForm.registration_period) : null,
        expiry_date: editForm.expiry_date ? new Date(editForm.expiry_date).toISOString() : null,
        auto_renew: editForm.auto_renew,
        notes: editForm.notes,
        admin_reply: editForm.admin_reply,
      });
      addNotification({ customer_id: null, type: 'request_updated', title: `Domain Updated — ${editForm.domain_name}`, message: `Admin updated domain record for ${editForm.domain_name} (status: ${editForm.status}).` }).catch(() => {});
      toast({ title: 'Domain Updated', description: 'Changes saved successfully.' });
      setEditDomain(null);
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update domain', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete domain "${d.domain_name}"? This cannot be undone.`)) return;
    try {
      await deleteDomainRequest(d.id);
      addNotification({ customer_id: null, type: 'delete', title: `Domain Deleted — ${d.domain_name}`, message: `Admin permanently deleted domain record for ${d.domain_name}.` }).catch(() => {});
      toast({ title: 'Domain Deleted', description: `${d.domain_name} has been removed.` });
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete domain', variant: 'destructive' });
    }
  };

  const handleNotify = async (d) => {
    if (!d.customer_id) { toast({ title: 'Error', description: 'No customer linked to this domain.', variant: 'destructive' }); return; }
    const days = daysUntilExpiry(d.expiry_date);
    const daysText = days !== null ? `${days} day${days !== 1 ? 's' : ''}` : 'soon';
    const expiryStr = d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    try {
      await addNotification({
        customer_id: d.customer_id,
        type: 'domain_expiry',
        title: `Domain Expiry Notice — ${d.domain_name}`,
        message: `Dear valued customer,\n\nThis is a courtesy reminder that your domain ${d.domain_name} is scheduled to expire in ${daysText} (on ${expiryStr}).\n\nTo ensure uninterrupted service and retain ownership of your domain, we strongly recommend renewing it before the expiry date. Expired domains may become available for public registration, which could result in loss of your online presence.\n\nIf you have any questions or require assistance with the renewal process, please don't hesitate to contact our support team.\n\nBest regards,\nNEXTIOM Team`,
      });
      toast({ title: 'Notification Sent', description: `Expiry reminder sent to customer for ${d.domain_name}.` });
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
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 0 260px' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: `1.5px solid ${c.border}`, borderRadius: 10, background: c.input, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
            placeholder="Search domains or customers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Expiry Filter */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: `1.5px solid ${expFilter !== 'all' ? c.brand : c.border}`, borderRadius: 10, background: expFilter !== 'all' ? (isDark ? 'rgba(232,123,53,0.1)' : 'rgba(232,123,53,0.06)') : c.input, color: expFilter !== 'all' ? c.brand : c.text, fontSize: 13, fontWeight: expFilter !== 'all' ? 600 : 400, cursor: 'pointer' }}
          >
            {activeFilterLabel} <ChevronDown size={14} style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
          </button>
          {filterOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 20, minWidth: 180 }}>
              {FILTER_OPTIONS.map(opt => (
                <div key={opt.key}
                  onClick={() => { setExpFilter(opt.key); setFilterOpen(false); }}
                  style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: expFilter === opt.key ? c.brand : c.text, fontWeight: expFilter === opt.key ? 600 : 400, background: expFilter === opt.key ? (isDark ? 'rgba(232,123,53,0.1)' : 'rgba(232,123,53,0.06)') : 'transparent' }}>
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={cardS}>
        <div style={{ padding: '15px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: '#378ADD', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: c.text, letterSpacing: 0.3 }}>Approved Domains</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: c.subText }}>{filteredDomains.length} domain{filteredDomains.length !== 1 ? 's' : ''}</span>
        </div>
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
            {filteredDomains.map((d, i) => {
              const days = daysUntilExpiry(d.expiry_date);
              const urgentColor = days !== null && days <= 7 ? '#ef4444' : days !== null && days <= 30 ? '#f97316' : null;
              return (
                <tr key={d.id}>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb' }}>{d.domain_name}</span>
                  </td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: c.subText }}>{d.customers?.name || 'Unknown'}</span></td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={d.status} /></td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <div>
                      <span style={{ color: urgentColor || c.text }}>
                        {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : '—'}
                      </span>
                      {days !== null && days <= 30 && (
                        <div style={{ fontSize: 11, color: urgentColor || c.subText, marginTop: 2 }}>
                          {days <= 0 ? 'Expired' : `in ${days} day${days !== 1 ? 's' : ''}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Btn color="#378ADD" onClick={() => openEdit(d)} title="Edit"><Edit size={12} /> Edit</Btn>
                      <Btn color={c.brand} onClick={() => handleNotify(d)} title="Send expiry notification"><Bell size={12} /> Notify</Btn>
                      <Btn color="#ef4444" onClick={() => handleDelete(d)} title="Delete"><Trash2 size={12} /> Delete</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredDomains.length === 0 && <tr><td colSpan={5} style={emptyS}>No approved domains found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editDomain && (
        <div style={{ position: 'fixed', inset: 0, background: c.overlay, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setEditDomain(null)}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong || c.border}`, borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: '#378ADD', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: c.text }}>Edit Domain</span>
              </div>
              <button onClick={() => setEditDomain(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Domain Name</label>
                <input style={inpS} value={editForm.domain_name} onChange={e => setEditForm(f => ({ ...f, domain_name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Status</label>
                <select style={{ ...inpS, appearance: 'none' }} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  {['pending', 'approved', 'active', 'expired', 'cancelled', 'registered'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Registration Period (yrs)</label>
                  <input style={inpS} type="number" min="1" value={editForm.registration_period} onChange={e => setEditForm(f => ({ ...f, registration_period: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Expiry Date</label>
                  <input style={inpS} type="date" value={editForm.expiry_date} onChange={e => setEditForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="auto_renew" checked={editForm.auto_renew} onChange={e => setEditForm(f => ({ ...f, auto_renew: e.target.checked }))} style={{ width: 16, height: 16, accentColor: c.brand }} />
                <label htmlFor="auto_renew" style={{ fontSize: 13, color: c.text, cursor: 'pointer' }}>Auto Renew</label>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea style={{ ...inpS, resize: 'vertical', minHeight: 72 }} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Admin Reply</label>
                <textarea style={{ ...inpS, resize: 'vertical', minHeight: 72 }} value={editForm.admin_reply} onChange={e => setEditForm(f => ({ ...f, admin_reply: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setEditDomain(null)} style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDomainManagement;
