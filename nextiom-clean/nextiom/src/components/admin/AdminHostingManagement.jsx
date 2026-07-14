import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Edit, Plus, Server, Loader2, Trash2, X, Check, Star, DollarSign, Globe, HardDrive, Wifi, Monitor, Cpu, Layers, FolderOpen, Mail, Database } from 'lucide-react';
import { getHostingPlans, addHostingPlan, updateHostingPlan, deleteHostingPlan, deleteHostingType, renameHostingType } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_HOSTING_TYPES = ['Shared Hosting', 'VPS Hosting', 'Dedicated Server', 'Cloud Hosting'];

const EMPTY_ROW = () => ({
  plan_name: '', storage: '', bandwidth: '', websites: '',
  price_monthly: '', discount_yearly: '', discount_2years: '', renewal_percentage: '', is_popular: false, is_active: true,
  cpu_cores: '', ram: '', inodes: '', addon_domains: '', email_accounts: '', databases: '',
});
const EMPTY_EDIT = {
  hosting_type: '', plan_name: '', storage: '', bandwidth: '',
  websites: '', price_monthly: '', discount_yearly: '', discount_2years: '', renewal_percentage: '', is_popular: false, is_active: true,
  cpu_cores: '', ram: '', inodes: '', addon_domains: '', email_accounts: '', databases: '',
};

const parseValueAndUnit = (str, defaultUnit = 'GB') => {
  if (!str) return { val: '', unit: defaultUnit };
  const s = String(str).trim();
  if (s.toLowerCase() === 'unlimited') {
    return { val: 'Unlimited', unit: defaultUnit };
  }
  const match = s.match(/^([\d,.]+)\s*([a-zA-Z]+)$/);
  if (match) {
    return { val: match[1], unit: match[2] };
  }
  return { val: s, unit: defaultUnit };
};

const formatValueAndUnit = (val, unit, hasUnit) => {
  if (!val) return '';
  const trimmedVal = String(val).trim();
  if (trimmedVal.toLowerCase() === 'unlimited') return 'Unlimited';
  if (!hasUnit) return trimmedVal;
  return `${trimmedVal}${unit}`;
};

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

const PopularToggle = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    style={{ position: 'relative', display: 'inline-flex', height: 22, width: 40, alignItems: 'center', borderRadius: 11, background: value ? '#f59e0b' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
  >
    <span style={{ display: 'inline-block', height: 16, width: 16, transform: value ? 'translateX(21px)' : 'translateX(3px)', borderRadius: 8, background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
  </button>
);

const ModalOverlay = ({ children }) => (
  <motion.div
    style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 16 }}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  >
    {children}
  </motion.div>
);

const ModalBox = ({ children, wide, c }) => (
  <motion.div
    style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 18, boxShadow: '0 8px 40px rgba(0,0,0,0.4)', width: '100%', maxWidth: wide ? 780 : 520, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
  >
    {children}
  </motion.div>
);

function AdminHostingManagement({ isDark = true, isMobile = false }) {
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
  const [activePlanIndex, setActivePlanIndex] = useState(0);

  // Edit single modal
  const [editingPlan, setEditingPlan] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  const renderResourceCard = (title, icon, field, combinedVal, hasUnit, unitOptions = []) => {
    const parsed = parseValueAndUnit(combinedVal, unitOptions[0] || 'GB');
    
    const handleValChange = (newVal) => {
      const formatted = formatValueAndUnit(newVal, parsed.unit, hasUnit);
      if (editingPlan) {
        setEditForm(prev => ({ ...prev, [field]: formatted }));
      } else {
        updateRow(activePlanIndex, field, formatted);
      }
    };
    
    const handleUnitChange = (newUnit) => {
      const formatted = formatValueAndUnit(parsed.val, newUnit, hasUnit);
      if (editingPlan) {
        setEditForm(prev => ({ ...prev, [field]: formatted }));
      } else {
        updateRow(activePlanIndex, field, formatted);
      }
    };

    return (
      <div key={title} style={{ background: c.input, border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          {icon}
          <span>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            style={{ flex: 1, width: '100%', minWidth: 0, padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            placeholder={hasUnit ? 'e.g. 5' : 'e.g. 2'}
            value={parsed.val}
            onChange={e => handleValChange(e.target.value)}
          />
          {hasUnit && (
            <select
              style={{ padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}
              value={parsed.unit}
              onChange={e => handleUnitChange(e.target.value)}
            >
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          )}
        </div>
      </div>
    );
  };

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)', input: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: 'var(--brand-color)', input: '#fff' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '12px 14px', borderTop: `1px solid ${c.border}`, fontSize: 13, color: c.text, verticalAlign: 'middle' };
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

  const allHostingTypes = [...new Set([...DEFAULT_HOSTING_TYPES, ...plans.map(p => p.hosting_type)])];

  // ── Add multiple plans ──────────────────────────────────────────────────────
  const openAdd = () => { setAddType(''); setAddRows([EMPTY_ROW()]); setActivePlanIndex(0); setShowAddModal(true); };
  const openAddForType = (type) => { setAddType(type); setAddRows([EMPTY_ROW()]); setActivePlanIndex(0); setShowAddModal(true); };

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
          websites: row.websites || null,
          price_monthly: row.price_monthly ? parseFloat(row.price_monthly) : null,
          discount_yearly: row.discount_yearly ? parseFloat(row.discount_yearly) : 0,
          discount_2years: row.discount_2years ? parseFloat(row.discount_2years) : 0,
          renewal_percentage: row.renewal_percentage ? parseFloat(row.renewal_percentage) : 0,
          is_popular: row.is_popular,
          is_active: row.is_active,
          cpu_cores: row.cpu_cores || '',
          ram: row.ram || '',
          inodes: row.inodes || '',
          addon_domains: row.addon_domains || '',
          email_accounts: row.email_accounts || '',
          databases: row.databases || '',
        });
      }
      toast({ title: 'Saved', description: `${valid.length} plan(s) added for ${addType}` });
      setShowAddModal(false);
      loadPlans();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // ── Edit single plan ────────────────────────────────────────────────────────
  const openEdit = (plan) => {
    setEditingPlan(plan);
    setEditForm({
      hosting_type: plan.hosting_type,
      plan_name: plan.plan_name,
      storage: plan.storage || '',
      bandwidth: plan.bandwidth || '',
      websites: plan.websites || '',
      price_monthly: plan.price_monthly != null ? String(plan.price_monthly) : '',
      discount_yearly: plan.discount_yearly != null ? String(plan.discount_yearly) : '',
      discount_2years: plan.discount_2years != null ? String(plan.discount_2years) : '',
      renewal_percentage: plan.renewal_percentage != null ? String(plan.renewal_percentage) : '',
      is_popular: plan.is_popular || false,
      is_active: plan.is_active,
      cpu_cores: plan.cpu_cores || '',
      ram: plan.ram || '',
      inodes: plan.inodes || '',
      addon_domains: plan.addon_domains || '',
      email_accounts: plan.email_accounts || '',
      databases: plan.databases || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.plan_name.trim()) { toast({ title: 'Error', description: 'Plan name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await updateHostingPlan(editingPlan.id, {
        hosting_type: editForm.hosting_type,
        hosting_type_key: editForm.hosting_type.toUpperCase().replace(/\s+/g, '_'),
        plan_name: editForm.plan_name.trim(),
        storage: editForm.storage,
        bandwidth: editForm.bandwidth,
        websites: editForm.websites || null,
        price_monthly: editForm.price_monthly ? parseFloat(editForm.price_monthly) : null,
        discount_yearly: editForm.discount_yearly ? parseFloat(editForm.discount_yearly) : 0,
        discount_2years: editForm.discount_2years ? parseFloat(editForm.discount_2years) : 0,
        renewal_percentage: editForm.renewal_percentage ? parseFloat(editForm.renewal_percentage) : 0,
        is_popular: editForm.is_popular,
        is_active: editForm.is_active,
        cpu_cores: editForm.cpu_cores || '',
        ram: editForm.ram || '',
        inodes: editForm.inodes || '',
        addon_domains: editForm.addon_domains || '',
        email_accounts: editForm.email_accounts || '',
        databases: editForm.databases || '',
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

  const handleRenameType = async (oldName) => {
    const newName = window.prompt(`Rename hosting package "${oldName}" to:`, oldName);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      toast({ title: 'Error', description: 'Package name cannot be empty', variant: 'destructive' });
      return;
    }
    if (trimmed === oldName) return;
    
    setIsLoading(true);
    try {
      await renameHostingType(oldName, trimmed);
      toast({ title: 'Success', description: `Hosting package renamed to "${trimmed}"` });
      loadPlans();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const handleDeleteType = async (typeName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the hosting package "${typeName}" and all of its plans?`)) return;
    
    setIsLoading(true);
    try {
      await deleteHostingType(typeName);
      toast({ title: 'Deleted', description: `Hosting package "${typeName}" deleted successfully` });
      loadPlans();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const filtered = plans.filter(p => {
    const q = searchTerm.toLowerCase();
    return (p.plan_name.toLowerCase().includes(q) || p.hosting_type.toLowerCase().includes(q))
      && (filterType === 'All' || p.hosting_type === filterType);
  });

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
        <button onClick={openAdd} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
          <Plus size={14} /> New Package
        </button>
      </div>

      {/* Table grouped by type */}
      {groupedTypes.length === 0 ? (
        <div style={{ ...cardS, padding: 32, textAlign: 'center', color: c.subText, fontSize: 13 }}>
          No hosting plans yet. Click "+ New Package" to add one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16 }}>
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
                  
                  {/* Rename Package */}
                  <button
                    onClick={() => handleRenameType(type)}
                    title={`Rename package "${type}"`}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: 4, borderRadius: 6, border: 'none', background: 'transparent', color: c.subText, cursor: 'pointer' }}
                  >
                    <Edit size={11} />
                  </button>

                  {/* Delete Package */}
                  <button
                    onClick={() => handleDeleteType(type)}
                    title={`Delete package "${type}"`}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: 4, borderRadius: 6, border: 'none', background: 'transparent', color: c.subText, cursor: 'pointer' }}
                  >
                    <Trash2 size={11} />
                  </button>

                  <button
                    onClick={() => openAddForType(type)}
                    title={`Add plan to ${type}`}
                    style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 7, border: `1.5px solid ${c.brand}`, background: 'transparent', color: c.brand, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Plus size={11} /> Add Plan
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thS, padding: '9px 12px' }}>Plan</th>
                        <th style={{ ...thS, padding: '9px 12px' }}>Storage</th>
                        <th style={{ ...thS, padding: '9px 12px' }}>BW</th>
                        <th style={{ ...thS, padding: '9px 12px' }}>Price/mo</th>
                        <th style={{ ...thS, padding: '9px 12px' }}>1 Yr %</th>
                        <th style={{ ...thS, padding: '9px 12px' }}>2 Yr %</th>
                        <th style={{ ...thS, padding: '9px 12px' }}>Ren %</th>
                        <th style={{ ...thS, padding: '9px 12px' }}>Popular</th>
                        <th style={{ ...thS, padding: '9px 12px' }}>Status</th>
                        <th style={{ ...thS, padding: '9px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typePlans.map((plan, i) => {
                        const td = i % 2 === 0 ? { ...tdS, padding: '10px 12px' } : { ...tdAlt, padding: '10px 12px' };
                        return (
                          <tr key={plan.id}>
                            <td style={td}>
                              <span style={{ fontWeight: 600, fontSize: 12.5 }}>{plan.plan_name}</span>
                            </td>
                            <td style={td}><span style={{ color: c.subText, fontSize: 12 }}>{plan.storage || '—'}</span></td>
                            <td style={td}><span style={{ color: c.subText, fontSize: 12 }}>{plan.bandwidth || '—'}</span></td>
                            <td style={td}>
                              {plan.price_monthly != null
                                ? <span style={{ color: c.brand, fontSize: 12, fontWeight: 700 }}>${Number(plan.price_monthly).toFixed(2)}</span>
                                : <span style={{ color: c.subText, fontSize: 12 }}>Custom</span>}
                            </td>
                            <td style={td}><span style={{ color: c.subText, fontSize: 12 }}>{plan.discount_yearly != null ? `${plan.discount_yearly}%` : '0%'}</span></td>
                            <td style={td}><span style={{ color: c.subText, fontSize: 12 }}>{plan.discount_2years != null ? `${plan.discount_2years}%` : '0%'}</span></td>
                            <td style={td}><span style={{ color: c.subText, fontSize: 12 }}>{plan.renewal_percentage != null ? `${plan.renewal_percentage}%` : '0%'}</span></td>
                            <td style={td}>
                              {plan.is_popular
                                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                                    <Star size={9} fill="#f59e0b" /> Popular
                                  </span>
                                : <span style={{ color: c.subText, fontSize: 12 }}>—</span>
                              }
                            </td>
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
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add New Package Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <ModalOverlay onClose={() => setShowAddModal(false)}>
            <ModalBox wide c={c}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: c.text }}>New Hosting Package</span>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={18} /></button>
              </div>

              {/* Hosting Type */}
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

              {/* Plan tabs */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap', borderBottom: `1px solid ${c.border}`, paddingBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 8 }}>Plans:</span>
                  {addRows.map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: activePlanIndex === idx ? c.brand : c.bg,
                        color: activePlanIndex === idx ? '#fff' : c.text,
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: `1.5px solid ${activePlanIndex === idx ? c.brand : c.border}`,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      onClick={() => setActivePlanIndex(idx)}
                    >
                      <span>{row.plan_name || `Plan ${idx + 1}`}</span>
                      {addRows.length > 1 && (
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: activePlanIndex === idx ? '#fff' : '#ef4444',
                            padding: 0,
                            marginLeft: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRow(idx);
                            if (activePlanIndex >= addRows.length - 1) {
                              setActivePlanIndex(Math.max(0, addRows.length - 2));
                            }
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setAddRows(prev => [...prev, EMPTY_ROW()]); setActivePlanIndex(addRows.length); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${c.brand}`, background: 'transparent', color: c.brand, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Plus size={12} /> Add Plan
                  </button>
                </div>

                {addRows[activePlanIndex] && (() => {
                  const row = addRows[activePlanIndex];
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Plan details grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={labelS}>Plan Name *</label>
                          <input style={inputStyle} placeholder="e.g. Basic, Pro" value={row.plan_name} onChange={e => updateRow(activePlanIndex, 'plan_name', e.target.value)} />
                        </div>
                        <div>
                          <label style={labelS}>Price / Month ($)</label>
                          <input style={inputStyle} type="number" step="0.01" min="0" placeholder="2.99" value={row.price_monthly} onChange={e => updateRow(activePlanIndex, 'price_monthly', e.target.value)} />
                        </div>
                        <div>
                          <label style={labelS}>Websites</label>
                          <input style={inputStyle} placeholder="e.g. 1, 5, Unlimited" value={row.websites} onChange={e => updateRow(activePlanIndex, 'websites', e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1.2fr', gap: 12 }}>
                        <div>
                          <label style={labelS}>1 Yr Discount (%)</label>
                          <input style={inputStyle} type="number" min="0" max="100" placeholder="20" value={row.discount_yearly} onChange={e => updateRow(activePlanIndex, 'discount_yearly', e.target.value)} />
                        </div>
                        <div>
                          <label style={labelS}>2 Yr Discount (%)</label>
                          <input style={inputStyle} type="number" min="0" max="100" placeholder="30" value={row.discount_2years} onChange={e => updateRow(activePlanIndex, 'discount_2years', e.target.value)} />
                        </div>
                        <div>
                          <label style={labelS}>Renewal Percentage (%)</label>
                          <input style={inputStyle} type="number" min="0" max="100" placeholder="10" value={row.renewal_percentage} onChange={e => updateRow(activePlanIndex, 'renewal_percentage', e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <PopularToggle value={row.is_popular} onChange={val => updateRow(activePlanIndex, 'is_popular', val)} />
                          <span style={{ fontSize: 13, color: c.text }}>{row.is_popular ? <><Star size={12} style={{ display: 'inline', color: '#f59e0b', marginRight: 4 }} />Popular plan</> : 'Mark as Popular'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Toggle value={row.is_active} onChange={val => updateRow(activePlanIndex, 'is_active', val)} isDark={isDark} />
                          <span style={{ fontSize: 13, color: c.text }}>{row.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>

                      {/* 8-Card Resource Grid */}
                      <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8 }}>Plan Resources</span>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginTop: 10 }}>
                          {renderResourceCard('Disk Space', <HardDrive size={14} />, 'storage', row.storage, true, ['GB', 'MB', 'TB'])}
                          {renderResourceCard('Monthly Bandwidth', <Wifi size={14} />, 'bandwidth', row.bandwidth, true, ['GB', 'TB', 'Unlimited'])}
                          {renderResourceCard('CPU Cores', <Cpu size={14} />, 'cpu_cores', row.cpu_cores, false)}
                          {renderResourceCard('RAM', <Layers size={14} />, 'ram', row.ram, true, ['GB', 'MB'])}
                          {renderResourceCard('Inodes', <FolderOpen size={14} />, 'inodes', row.inodes, false)}
                          {renderResourceCard('Addon Domains', <Globe size={14} />, 'addon_domains', row.addon_domains, false)}
                          {renderResourceCard('Email Accounts', <Mail size={14} />, 'email_accounts', row.email_accounts, false)}
                          {renderResourceCard('Databases', <Database size={14} />, 'databases', row.databases, false)}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <p style={{ fontSize: 11, color: c.subText, marginTop: 16 }}>
                  Plans with an empty Plan Name will be skipped. Price/mo is optional (leave blank for custom pricing). Discounts (1 Yr % / 2 Yr %) are percentages. Renewal % is added to the price.
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
            <ModalBox wide={true} c={c}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: c.text }}>Edit Plan</span>
                <button onClick={() => setEditingPlan(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={18} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Hosting Type */}
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

                {/* Plan details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelS}>Plan Name</label>
                    <input style={inputStyle} placeholder="e.g. Basic, Standard, Premium" value={editForm.plan_name} onChange={e => setEditForm(prev => ({ ...prev, plan_name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelS}><DollarSign size={11} style={{ display: 'inline', marginRight: 4 }} />Price / Month ($)</label>
                    <input style={inputStyle} type="number" step="0.01" min="0" placeholder="e.g. 2.99" value={editForm.price_monthly} onChange={e => setEditForm(prev => ({ ...prev, price_monthly: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelS}><Monitor size={11} style={{ display: 'inline', marginRight: 4 }} />Websites</label>
                    <input style={inputStyle} placeholder="e.g. 1, 5, Unlimited" value={editForm.websites} onChange={e => setEditForm(prev => ({ ...prev, websites: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1.2fr', gap: 12 }}>
                  <div>
                    <label style={labelS}>1 Yr Discount (%)</label>
                    <input style={inputStyle} type="number" min="0" max="100" placeholder="e.g. 20" value={editForm.discount_yearly} onChange={e => setEditForm(prev => ({ ...prev, discount_yearly: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelS}>2 Yr Discount (%)</label>
                    <input style={inputStyle} type="number" min="0" max="100" placeholder="e.g. 30" value={editForm.discount_2years} onChange={e => setEditForm(prev => ({ ...prev, discount_2years: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelS}>Renewal Percentage (%)</label>
                    <input style={inputStyle} type="number" min="0" max="100" placeholder="e.g. 10" value={editForm.renewal_percentage} onChange={e => setEditForm(prev => ({ ...prev, renewal_percentage: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PopularToggle value={editForm.is_popular} onChange={val => setEditForm(prev => ({ ...prev, is_popular: val }))} />
                    <span style={{ fontSize: 13, color: c.text }}>
                      {editForm.is_popular ? <><Star size={12} style={{ display: 'inline', color: '#f59e0b', marginRight: 4 }} />Popular badge shown</> : 'Mark as Popular'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Toggle value={editForm.is_active} onChange={val => setEditForm(prev => ({ ...prev, is_active: val }))} isDark={isDark} />
                    <span style={{ fontSize: 13, color: c.text }}>{editForm.is_active ? 'Active – visible to customers' : 'Inactive – hidden from customers'}</span>
                  </div>
                </div>

                {/* 8-Card Resource Grid */}
                <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8 }}>Plan Resources</span>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginTop: 10 }}>
                    {renderResourceCard('Disk Space', <HardDrive size={14} />, 'storage', editForm.storage, true, ['GB', 'MB', 'TB'])}
                    {renderResourceCard('Monthly Bandwidth', <Wifi size={14} />, 'bandwidth', editForm.bandwidth, true, ['GB', 'TB', 'Unlimited'])}
                    {renderResourceCard('CPU Cores', <Cpu size={14} />, 'cpu_cores', editForm.cpu_cores, false)}
                    {renderResourceCard('RAM', <Layers size={14} />, 'ram', editForm.ram, true, ['GB', 'MB'])}
                    {renderResourceCard('Inodes', <FolderOpen size={14} />, 'inodes', editForm.inodes, false)}
                    {renderResourceCard('Addon Domains', <Globe size={14} />, 'addon_domains', editForm.addon_domains, false)}
                    {renderResourceCard('Email Accounts', <Mail size={14} />, 'email_accounts', editForm.email_accounts, false)}
                    {renderResourceCard('Databases', <Database size={14} />, 'databases', editForm.databases, false)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${c.border}` }}>
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
