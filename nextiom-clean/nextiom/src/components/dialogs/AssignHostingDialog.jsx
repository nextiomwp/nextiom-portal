import React, { useState, useEffect } from 'react';
import { Server, Loader2, Check, DollarSign, HardDrive, Wifi } from 'lucide-react';
import { assignHostingToCustomer, getHostingPlans } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

function AssignHostingDialog({ open, onClose, customer, c, onSuccess }) {
  const [plans, setPlans] = useState([]);
  const [hostingType, setHostingType] = useState('');
  const [planName, setPlanName] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('Monthly');
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [diskUsageLimit, setDiskUsageLimit] = useState('');
  const [bandwidthLimit, setBandwidthLimit] = useState('');
  const [overrideAllocated, setOverrideAllocated] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      getHostingPlans().then(data => setPlans(data || [])).catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const text = '#111827';
  const subText = '#6b7280';
  const brand = c.brand || '#e87b35';
  const input = '#f8fafc';
  const border = 'rgba(15,23,42,0.12)';
  // Input field classes: fixed height and tighter line-height for consistent vertical alignment
  const fieldClass = 'w-full mt-1.5 px-3 py-2 h-10 leading-tight rounded-xl outline-none transition-all bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35]';

  // Label styles: use flex centering so icon + text align vertically
  const labelS = {
    fontSize: 12, fontWeight: 600, color: subText,
    textTransform: 'uppercase', letterSpacing: 0.8,
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8
  };

  // Get unique hosting types from plans
  const hostingTypes = [...new Set(plans.map(p => p.hosting_type))];
  const selectedPlans = hostingType
    ? plans.filter(p => p.hosting_type === hostingType && p.is_active !== false)
    : [];

  // Derive default disk/bandwidth from the selected plan
  const selectedPlan = !planName || !hostingType
    ? null
    : plans.find(p => p.hosting_type === hostingType && p.plan_name === planName) || null;

  const planDisk = selectedPlan?.storage || '';
  const planBw = selectedPlan?.bandwidth || '';

  // Auto-update override fields when plan changes (if not manually overridden)
  const handlePlanChange = (val) => {
    setPlanName(val);
    const plan = plans.find(p => p.hosting_type === hostingType && p.plan_name === val);
    if (plan) {
      if (!overrideAllocated) {
        setDiskUsageLimit(plan.storage || '');
        setBandwidthLimit(plan.bandwidth || '');
      }
    } else {
      if (!overrideAllocated) {
        setDiskUsageLimit('');
        setBandwidthLimit('');
      }
    }
  };

  const handleSubmit = async () => {
    if (!hostingType) {
      toast({ title: 'Error', description: 'Please select a hosting type', variant: 'destructive' });
      return;
    }
    if (!planName) {
      toast({ title: 'Error', description: 'Please select a plan', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const finalPrice = parseFloat(price) > 0 ? parseFloat(price) : null;
      await assignHostingToCustomer({
        customerId: customer.id,
        hostingType,
        planName,
        billingPeriod,
        domain: domain.trim() || null,
        notes: notes.trim() || null,
        price: finalPrice,
        startDate,
        diskUsageLimit: overrideAllocated ? diskUsageLimit : '',
        bandwidthLimit: overrideAllocated ? bandwidthLimit : '',
      });

      toast({ title: 'Hosting Assigned', description: `${hostingType} - ${planName} assigned to ${customer.name}` });
      setHostingType(''); setPlanName(''); setBillingPeriod('Monthly');
      setDomain(''); setPrice(''); setNotes('');
      setDiskUsageLimit(''); setBandwidthLimit(''); setOverrideAllocated(false);
      setStartDate(new Date().toISOString().split('T')[0]);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err?.message || 'Failed to assign hosting', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogContent className="max-w-3xl bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Server size={16} />
            </span>
            <span>
              Assign Hosting
              <div className="mt-1 text-xs font-normal text-slate-500">{customer?.name} — {customer?.email}</div>
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Assign a hosting package, billing period, and resource limits to the selected customer.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-132px)] overflow-y-auto pr-1">
          {/* Hosting Type */}
          <div>
            <label style={labelS}>Hosting Type *</label>
            <select
              className={fieldClass}
              value={hostingType}
              onChange={e => { setHostingType(e.target.value); setPlanName(''); }}
            >
              <option value="">Select hosting type…</option>
              {hostingTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Plan */}
          <div>
            <label style={labelS}>Plan *</label>
            <select
              className={fieldClass}
              value={planName}
              onChange={e => handlePlanChange(e.target.value)}
              disabled={!hostingType}
            >
              <option value="">{hostingType ? 'Select a plan…' : 'Choose a type first…'}</option>
              {selectedPlans.map(p => (
                <option key={p.id} value={p.plan_name}>
                  {p.plan_name}{p.storage ? ` (${p.storage}` : ''}{p.storage && p.bandwidth ? ' / ' : ''}{p.bandwidth ? `${p.bandwidth})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Billing Period */}
          <div>
            <label style={labelS}>Billing Period</label>
            <select
              className={fieldClass}
              value={billingPeriod}
              onChange={e => setBillingPeriod(e.target.value)}
            >
              {['Monthly', 'Quarterly (3mo)', 'Semi-Annual (6mo)', 'Yearly', '2 Years'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label style={labelS}>Start Date</label>
            <input
              className={fieldClass}
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          {/* Domain + Price */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelS}>Domain (optional)</label>
              <input
                className={fieldClass}
                placeholder="e.g. example.com"
                value={domain}
                onChange={e => setDomain(e.target.value)}
              />
            </div>
            <div>
              <label style={labelS}>Price (LKR, optional)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText }} />
                <input
                  className={`${fieldClass} pl-8`}
                  type="number" min="0" step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Disk Usage + Bandwidth Override (Optional) */}
          <div>
            <label style={{ ...labelS, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={overrideAllocated}
                onChange={e => {
                  setOverrideAllocated(e.target.checked);
                  if (!e.target.checked) {
                    // Reset to plan defaults
                    const plan = plans.find(p => p.hosting_type === hostingType && p.plan_name === planName);
                    setDiskUsageLimit(plan?.storage || '');
                    setBandwidthLimit(plan?.bandwidth || '');
                  }
                }}
                style={{ accentColor: brand }}
              />
              Override Allocated Resources (optional)
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelS}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <HardDrive size={12} /> Disk Usage Limit
                </div>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className={`${fieldClass} pr-10 ${overrideAllocated ? '' : 'opacity-70'}`}
                  placeholder={planDisk || 'e.g. 50GB'}
                  value={diskUsageLimit}
                  onChange={e => { setDiskUsageLimit(e.target.value); setOverrideAllocated(true); }}
                />
                {!overrideAllocated && planDisk && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: subText, background: '#fff', padding: '0 4px' }}>
                    plan: {planDisk}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label style={labelS}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Wifi size={12} /> Bandwidth Limit
                </div>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className={`${fieldClass} pr-10 ${overrideAllocated ? '' : 'opacity-70'}`}
                  placeholder={planBw || 'e.g. 500GB'}
                  value={bandwidthLimit}
                  onChange={e => { setBandwidthLimit(e.target.value); setOverrideAllocated(true); }}
                />
                {!overrideAllocated && planBw && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: subText, background: '#fff', padding: '0 4px' }}>
                    plan: {planBw}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelS}>Notes / Comments</label>
            <textarea
              className={`${fieldClass} min-h-[72px] resize-y`}
              placeholder="Internal notes about this hosting assignment..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0
        }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${border}`, background: 'transparent', color: text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: brand, color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Assigning…' : 'Assign Hosting'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssignHostingDialog;
