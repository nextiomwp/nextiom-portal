import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Edit, Plus, Server, Loader2, Trash2, X, Check } from 'lucide-react';
import { getHostingPlans, addHostingPlan, updateHostingPlan, deleteHostingPlan } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_HOSTING_TYPES = ['Shared Hosting', 'VPS Hosting', 'Dedicated Server', 'Cloud Hosting'];

const EMPTY_ROW = () => ({ plan_name: '', storage: '', bandwidth: '', is_active: true });
const EMPTY_EDIT = { hosting_type: '', plan_name: '', storage: '', bandwidth: '', is_active: true };

const Btn = ({ onClick, color, children, title }) => (
  <button onClick={onClick} title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${color}`, background: 'transparent', color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
    {children}
  </button>
);

const Toggle = ({ value, onChange, isDark }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    style={{ position: 'relative', display: 'inline-flex', height: 22, width: 40, alignItems: 'center', borderRadius: 11, background: value ? '#22c55e' : isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
  >
    <span style={{ display: 'inline-block', height: 16, width: 16, transform: value ? 'translateX(21px)' : 'translateX(3px)', borderRadius: 8, background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
  </button>
);

const ModalOverlay = ({ onClose, children }) => (
  <motion.div
    style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 16 }}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    {children}
  </motion.div>
);

const ModalBox = ({ children, wide, c }) => (
  <motion.div
    style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 18, boxShadow: '0 8px 40px rgba(0,0,0,0.4)', width: '100%', maxWidth: wide ? 700 : 460, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
  >
    {children}
  </motion.div>
);

function AdminHostingManagement({ isDark = true }) {
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Add-multiple modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('');
  const [addRows, setAddRows] = useState([EMPTY_ROW()]);

  // Edit single modal
  const [editingPlan, setEditingPlan] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', input: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', input: '#fff' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const inputStyle = { width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 9, background: c.bg, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelS = { display: 'block', fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 };

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try { setPlans(await getHostingPlans()); }
    catch { toast({ title: 'Error', description: 'Failed to load hosting plans', variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  // All known hosting types (from DB + defaults) for datalist suggestions
  const allHostingTypes = [...new Set([...DEFAULT_HOSTING_TYPES, ...plans.map(p => p.hosting_type)])];

  // ── Add multiple plans ──
  const openAdd = () => { setAddType(''); setAddRows([EMPTY_ROW()]); setShowAddModal(true); };
  const openAddForType = (type) => { setAddType(type); setAddRows([EMPTY_ROW()]); setShowAddModal(true); };

  const updateRow = (i, field, val) => {
    setAddRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const removeRow = (i) => setAddRows(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const handleSaveNew = async () => {
    if (!addType.trim()) { toast({ title: 'Error', description: 'Enter a hosting type', variant: 'destructive' }); return; }
    const valid = addRows.filter(r => r.plan_name.trim());
    if (!valid.length) { toast({ title: 'Error', description: 'Enter at least one plan name', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      for (const row of valid) {
        await addHostingPlan({
          hosting_type: addType,
          hosting_type_key: addType.toUpperCase().replace(/\s+/g, '_'),
          plan_name: row.plan_name.trim(),
          storage: row.storage,
          bandwidth: row.bandwidth,
          is_active: row.is_active,
        });
      }
      toast({ title: 'Saved', description: `${valid.length} plan(s) added for ${addType}` });
      setShowAddModal(false);
      loadPlans();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // ── Edit single plan ──
  const openEdit = (plan) => { setEditingPlan(plan); setEditForm({ hosting_type: plan.hosting_type, plan_name: plan.plan_name, storage: plan.storage || '', bandwidth: plan.bandwidth || '', is_active: plan.is_active }); };

  const handleSaveEdit = async () => {
    if (!editForm.plan_name.trim()) { toast({ title: 'Error', description: 'Plan name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await updateHostingPlan(editingPlan.id, {
        ...editForm,
        hosting_type_key: editForm.hosting_type.toUpperCase().replace(/\s+/g, '_'),
      });
      toast({ title: 'Updated', description: 'Plan updated successfully' });
      setEditingPlan(null);
      loadPlans();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleToggle = async (plan) => {
    try {
      await updateHostingPlan(plan.id, { is_active: !plan.is_active });
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
    } catch { toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' }); }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.plan_name}"?`)) return;
    try { await deleteHostingPlan(plan.id); toast({ title: 'Deleted' }); loadPlans(); }
    catch { toast({ title: 'Error', description: 'Could not delete', variant: 'destructive' }); }
  };

  const filtered = plans.filter(p => {
    const q = searchTerm.toLowerCase();
    return (p.plan_name.toLowerCase().includes(q) || p.hosting_type.toLowerCase().includes(q))
      && (filterType === 'All' || p.hosting_type === filterType);
  });

  // Group for display: by hosting_type
  const groupedTypes = [...new Set(filtered.map(p => p.hosting_type))];

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Loader2 className="animate-spin" size={28} style={{ color: c.brand }} />
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: `1.5px solid ${c.border}`, borderRadius: 10, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} placeholder="Search plans..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select style={{ padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 10, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', cursor: 'pointer' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="All">All Types</option>
          {allHostingTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={openAdd} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> New Package
        </button>
      </div>

      {/* Table grouped by type — 2 columns side by side */}
      {groupedTypes.length === 0 ? (
        <div style={{ ...cardS, padding: 32, textAlign: 'center', color: c.subText, fontSize: 13 }}>
          No hosting plans yet. Click "+ New Package" to add one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {groupedTypes.map(type => {
            const typePlans = filtered.filter(p => p.hosting_type === type);
            return (
              <div key={type} style={{ ...cardS, marginBottom: 0 }}>
                {/* Type header */}
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 8, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: c.brand, flexShrink: 0 }} />
                  <Server size={13} style={{ color: c.brand }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>{type}</span>
                  <span style={{ fontSize: 11, color: c.subText, marginLeft: 2 }}>({typePlans.length})</span>
                  <button
                    onClick={() => openAddForType(type)}
                    title={`Add plan to ${type}`}
                    style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 7, border: `1.5px solid ${c.brand}`, background: 'transparent', color: c.brand, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Plus size={11} /> Add Plan
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thS, padding: '9px 12px' }}>Plan</th>
                      <th style={{ ...thS, padding: '9px 12px' }}>Storage</th>
                      <th style={{ ...thS, padding: '9px 12px' }}>BW</th>
                      <th style={{ ...thS, padding: '9px 12px' }}>Status</th>
                      <th style={{ ...thS, padding: '9px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typePlans.map((plan, i) => {
                      const td = i % 2 === 0 ? { ...tdS, padding: '10px 12px' } : { ...tdAlt, padding: '10px 12px' };
                      return (
                        <tr key={plan.id}>
                          <td style={td}><span style={{ fontWeight: 600, fontSize: 12.5 }}>{plan.plan_name}</span></td>
                          <td style={td}><span style={{ color: c.subText, fontSize: 12 }}>{plan.storage || '—'}</span></td>
                          <td style={td}><span style={{ color: c.subText, fontSize: 12 }}>{plan.bandwidth || '—'}</span></td>
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Toggle value={plan.is_active} onChange={() => handleToggle(plan)} isDark={isDark} />
                              <span style={{ fontSize: 11, color: plan.is_active ? '#22c55e' : c.subText, fontWeight: 600 }}>{plan.is_active ? 'On' : 'Off'}</span>
                            </div>
                          </td>
                          <td style={{ ...td, textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
                              <Btn color="#378ADD" onClick={() => openEdit(plan)} title="Edit"><Edit size={11} /></Btn>
                              <Btn color="#ef4444" onClick={() => handleDelete(plan)} title="Delete"><Trash2 size={11} /></Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add New Package Modal (multi-plan) ── */}
      <AnimatePresence>
        {showAddModal && (
          <ModalOverlay onClose={() => setShowAddModal(false)}>
            <ModalBox wide c={c}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: c.text }}>New Hosting Package</span>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={18} /></button>
              </div>

              {/* Hosting Type — free text with suggestions */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelS}>Hosting Type</label>
                <input
                  list="hosting-type-suggestions"
                  style={inputStyle}
                  placeholder="e.g. Shared Hosting, VPS Hosting, or type your own…"
                  value={addType}
                  onChange={e => setAddType(e.target.value)}
                  autoComplete="off"
                />
                <datalist id="hosting-type-suggestions">
                  {allHostingTypes.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              {/* Plan rows */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label style={labelS}>Plans</label>
                  <button
                    type="button"
                    onClick={() => setAddRows(prev => [...prev, EMPTY_ROW()])}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, border: `1.5px solid ${c.brand}`, background: 'transparent', color: c.brand, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Plus size={12} /> Add Plan
                  </button>
                </div>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 60px 30px', gap: 8, marginBottom: 6, padding: '0 4px' }}>
                  {['Plan Name *', 'Storage', 'Bandwidth', 'Active', ''].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {addRows.map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 60px 30px', gap: 8, alignItems: 'center' }}>
                      <input
                        style={inputStyle}
                        placeholder="e.g. Basic"
                        value={row.plan_name}
                        onChange={e => updateRow(i, 'plan_name', e.target.value)}
                      />
                      <input
                        style={inputStyle}
                        placeholder="e.g. 10GB"
                        value={row.storage}
                        onChange={e => updateRow(i, 'storage', e.target.value)}
                      />
                      <input
                        style={inputStyle}
                        placeholder="e.g. 100GB"
                        value={row.bandwidth}
                        onChange={e => updateRow(i, 'bandwidth', e.target.value)}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Toggle value={row.is_active} onChange={val => updateRow(i, 'is_active', val)} isDark={isDark} />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={addRows.length === 1}
                        style={{ background: 'none', border: 'none', cursor: addRows.length === 1 ? 'not-allowed' : 'pointer', color: addRows.length === 1 ? c.border : '#ef4444', display: 'flex', alignItems: 'center', padding: 4 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: 11, color: c.subText, marginTop: 10 }}>
                  Rows with an empty Plan Name will be skipped.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${c.border}` }}>
                <button onClick={() => setShowAddModal(false)} style={{ padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveNew} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Plans
                </button>
              </div>
            </ModalBox>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Edit Single Plan Modal ── */}
      <AnimatePresence>
        {editingPlan && (
          <ModalOverlay onClose={() => setEditingPlan(null)}>
            <ModalBox c={c}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: c.text }}>Edit Plan</span>
                <button onClick={() => setEditingPlan(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={18} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelS}>Hosting Type</label>
                  <input
                    list="hosting-type-suggestions-edit"
                    style={inputStyle}
                    placeholder="e.g. Shared Hosting, or type your own…"
                    value={editForm.hosting_type}
                    onChange={e => setEditForm(prev => ({ ...prev, hosting_type: e.target.value }))}
                    autoComplete="off"
                  />
                  <datalist id="hosting-type-suggestions-edit">
                    {allHostingTypes.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
                <div>
                  <label style={labelS}>Plan Name</label>
                  <input style={inputStyle} placeholder="e.g. Basic, Standard, Premium" value={editForm.plan_name} onChange={e => setEditForm(prev => ({ ...prev, plan_name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelS}>Storage</label>
                    <input style={inputStyle} placeholder="e.g. 10GB" value={editForm.storage} onChange={e => setEditForm(prev => ({ ...prev, storage: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelS}>Bandwidth</label>
                    <input style={inputStyle} placeholder="e.g. 100GB" value={editForm.bandwidth} onChange={e => setEditForm(prev => ({ ...prev, bandwidth: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Toggle value={editForm.is_active} onChange={val => setEditForm(prev => ({ ...prev, is_active: val }))} isDark={isDark} />
                  <span style={{ fontSize: 13, color: c.text }}>{editForm.is_active ? 'Active – visible to customers' : 'Inactive – hidden from customers'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => setEditingPlan(null)} style={{ padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Changes
                </button>
              </div>
            </ModalBox>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminHostingManagement;
