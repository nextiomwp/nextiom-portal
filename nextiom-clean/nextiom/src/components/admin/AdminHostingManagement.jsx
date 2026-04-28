import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit, Plus, Server, Loader2, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHostingPlans, addHostingPlan, updateHostingPlan, deleteHostingPlan } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const HOSTING_TYPES = ['Shared Hosting', 'VPS Hosting', 'Dedicated Server', 'Cloud Hosting'];
const TYPE_KEY_MAP = {
  'Shared Hosting': 'SHARED',
  'VPS Hosting': 'VPS',
  'Dedicated Server': 'DEDICATED',
  'Cloud Hosting': 'CLOUD'
};

const EMPTY_FORM = {
  hosting_type: 'Shared Hosting',
  hosting_type_key: 'SHARED',
  plan_name: '',
  storage: '',
  bandwidth: '',
  is_active: true
};

function AdminHostingManagement() {
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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

  const openAdd = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({ ...plan });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.plan_name.trim()) {
      toast({ title: 'Error', description: 'Plan name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, hosting_type_key: TYPE_KEY_MAP[form.hosting_type] || 'SHARED' };
      if (editingPlan) {
        await updateHostingPlan(editingPlan.id, payload);
        toast({ title: 'Updated', description: 'Plan updated successfully' });
      } else {
        await addHostingPlan(payload);
        toast({ title: 'Created', description: 'New plan added successfully' });
      }
      setShowModal(false);
      loadPlans();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#e87b35] focus:outline-none transition-all bg-white text-slate-800"
              placeholder="Search plans..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e87b35]"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            {HOSTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button onClick={openAdd} className="bg-[#e87b35] hover:bg-[#d66a24] text-white shadow-md rounded-xl font-medium border-0 whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" /> New Package
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hosting Type</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? filtered.map(plan => (
                <motion.tr key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-800">{plan.hosting_type}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-700">{plan.plan_name}</td>
                  <td className="py-4 px-6 text-sm text-slate-500">
                    {plan.storage && <span>{plan.storage} Storage</span>}
                    {plan.storage && plan.bandwidth && <span> · </span>}
                    {plan.bandwidth && <span>{plan.bandwidth} BW</span>}
                    {!plan.storage && !plan.bandwidth && <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(plan)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${plan.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                        title={plan.is_active ? 'Disable plan' : 'Enable plan'}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${plan.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`text-xs font-medium ${plan.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(plan)} title="Edit">
                        <Edit className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(plan)} title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    {plans.length === 0
                      ? 'No hosting plans yet. Click "+ New Package" to add one.'
                      : 'No plans match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">{editingPlan ? 'Edit Plan' : 'New Hosting Package'}</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hosting Type</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e87b35] focus:outline-none"
                    value={form.hosting_type}
                    onChange={e => setForm(prev => ({ ...prev, hosting_type: e.target.value, hosting_type_key: TYPE_KEY_MAP[e.target.value] }))}
                  >
                    {HOSTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                  <input
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e87b35] focus:outline-none"
                    placeholder="e.g. Basic, Standard, Premium, VPS1"
                    value={form.plan_name}
                    onChange={e => setForm(prev => ({ ...prev, plan_name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Storage</label>
                    <input
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e87b35] focus:outline-none"
                      placeholder="e.g. 10GB"
                      value={form.storage}
                      onChange={e => setForm(prev => ({ ...prev, storage: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bandwidth</label>
                    <input
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#e87b35] focus:outline-none"
                      placeholder="e.g. 100GB"
                      value={form.bandwidth}
                      onChange={e => setForm(prev => ({ ...prev, bandwidth: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-slate-700">
                    {form.is_active ? 'Active – visible to customers' : 'Inactive – hidden from customers'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-[#e87b35] hover:bg-[#d66a24] text-white border-0">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  {editingPlan ? 'Save Changes' : 'Add Plan'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminHostingManagement;
