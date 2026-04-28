import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Edit, Plus, Server, Loader2, Trash2, X, Check } from 'lucide-react';
import { getHostingPlans, addHostingPlan, updateHostingPlan, deleteHostingPlan } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const HOSTING_TYPES = ['Shared Hosting', 'VPS Hosting', 'Dedicated Server', 'Cloud Hosting'];
const TYPE_KEY_MAP = {
  'Shared Hosting': 'SHARED',
  'VPS Hosting': 'VPS',
  'Dedicated Server': 'DEDICATED',
  'Cloud Hosting': 'CLOUD'
};
const EMPTY_FORM = { hosting_type: 'Shared Hosting', hosting_type_key: 'SHARED', plan_name: '', storage: '', bandwidth: '', is_active: true };

function AdminHostingManagement({ isDark = true }) {
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', input: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', input: '#fff' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };

  const Btn = ({ onClick, color, children, title, filled }) => (
    <button onClick={onClick} title={title} style={{
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
    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: accent || c.brand, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: c.text, letterSpacing: 0.3 }}>{title}</span>
      </div>
      <button onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        <Plus size={13} /> New Package
      </button>
    </div>
  );

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    try {
      setPlans(await getHostingPlans());
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load hosting plans', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openAdd = () => { setEditingPlan(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (plan) => { setEditingPlan(plan); setForm({ ...plan }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.plan_name.trim()) { toast({ title: 'Error', description: 'Plan name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { ...form, hosting_type_key: TYPE_KEY_MAP[form.hosting_type] || 'SHARED' };
      if (editingPlan) { await updateHostingPlan(editingPlan.id, payload); toast({ title: 'Updated', description: 'Plan updated successfully' }); }
      else { await addHostingPlan(payload); toast({ title: 'Created', description: 'New plan added successfully' }); }
      setShowModal(false);
      loadPlans();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleToggle = async (plan) => {
    try {
      await updateHostingPlan(plan.id, { is_active: !plan.is_active });
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.plan_name}"?`)) return;
    try {
      await deleteHostingPlan(plan.id);
      toast({ title: 'Deleted', description: 'Plan deleted' });
      loadPlans();
    } catch (e) {
      toast({ title: 'Error', description: 'Could not delete', variant: 'destructive' });
    }
  };

  const filtered = plans.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchSearch = p.plan_name.toLowerCase().includes(q) || p.hosting_type.toLowerCase().includes(q);
    const matchType = filterType === 'All' || p.hosting_type === filterType;
    return matchSearch && matchType;
  });

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Loader2 className="animate-spin" size={28} style={{ color: c.brand }} />
    </div>
  );

  const inputStyle = { width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 9, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: `1.5px solid ${c.border}`, borderRadius: 10, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
            placeholder="Search plans..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          style={{ padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 10, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', cursor: 'pointer' }}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="All">All Types</option>
          {HOSTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={cardS}>
        <SectionHeader title="Hosting Packages" accent="#639922" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Hosting Type</th>
              <th style={thS}>Plan</th>
              <th style={thS}>Details</th>
              <th style={thS}>Status</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((plan, i) => (
              <tr key={plan.id}>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ padding: 7, background: isDark ? 'rgba(55,138,221,0.15)' : '#eff6ff', borderRadius: 8 }}>
                      <Server size={14} style={{ color: '#378ADD' }} />
                    </div>
                    <span style={{ fontWeight: 500 }}>{plan.hosting_type}</span>
                  </div>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ fontWeight: 600 }}>{plan.plan_name}</span></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ color: c.subText, fontSize: 13 }}>
                    {plan.storage && plan.storage}{plan.storage && plan.bandwidth && ' · '}{plan.bandwidth && plan.bandwidth}
                    {!plan.storage && !plan.bandwidth && '—'}
                  </span>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleToggle(plan)}
                      style={{ position: 'relative', display: 'inline-flex', height: 22, width: 40, alignItems: 'center', borderRadius: 11, transition: 'background 0.2s', background: plan.is_active ? '#22c55e' : isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <span style={{ display: 'inline-block', height: 16, width: 16, transform: plan.is_active ? 'translateX(21px)' : 'translateX(3px)', borderRadius: 8, background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                    </button>
                    <span style={{ fontSize: 12, color: plan.is_active ? '#22c55e' : c.subText, fontWeight: 600 }}>{plan.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </td>
                <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Btn color="#378ADD" onClick={() => openEdit(plan)} title="Edit"><Edit size={12} /> Edit</Btn>
                    <Btn color="#ef4444" onClick={() => handleDelete(plan)} title="Delete"><Trash2 size={12} /> Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={emptyS}>{plans.length === 0 ? 'No hosting plans yet. Click "+ New Package" to add one.' : 'No plans match your search.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 18, boxShadow: '0 8px 40px rgba(0,0,0,0.4)', width: '100%', maxWidth: 440, margin: '0 16px', padding: 24 }}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: c.text }}>{editingPlan ? 'Edit Plan' : 'New Hosting Package'}</span>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex' }}><X size={18} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Hosting Type</label>
                  <select style={{ ...inputStyle }} value={form.hosting_type} onChange={e => setForm(prev => ({ ...prev, hosting_type: e.target.value, hosting_type_key: TYPE_KEY_MAP[e.target.value] }))}>
                    {HOSTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Plan Name</label>
                  <input style={inputStyle} placeholder="e.g. Basic, Standard, Premium" value={form.plan_name} onChange={e => setForm(prev => ({ ...prev, plan_name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Storage</label>
                    <input style={inputStyle} placeholder="e.g. 10GB" value={form.storage} onChange={e => setForm(prev => ({ ...prev, storage: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Bandwidth</label>
                    <input style={inputStyle} placeholder="e.g. 100GB" value={form.bandwidth} onChange={e => setForm(prev => ({ ...prev, bandwidth: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                    style={{ position: 'relative', display: 'inline-flex', height: 22, width: 40, alignItems: 'center', borderRadius: 11, background: form.is_active ? '#22c55e' : isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <span style={{ display: 'inline-block', height: 16, width: 16, transform: form.is_active ? 'translateX(21px)' : 'translateX(3px)', borderRadius: 8, background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  </button>
                  <span style={{ fontSize: 13, color: c.text }}>{form.is_active ? 'Active – visible to customers' : 'Inactive – hidden from customers'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editingPlan ? 'Save Changes' : 'Add Plan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminHostingManagement;
