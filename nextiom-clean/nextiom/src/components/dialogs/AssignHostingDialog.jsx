import React, { useState, useEffect } from 'react';
import { X, Server, Loader2, Check, DollarSign } from 'lucide-react';
import { assignHostingToCustomer, getHostingPlans } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function AssignHostingDialog({ open, onClose, customer, c, onSuccess }) {
  const [plans, setPlans] = useState([]);
  const [hostingType, setHostingType] = useState('');
  const [planName, setPlanName] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('Monthly');
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      getHostingPlans().then(data => setPlans(data || [])).catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const text = c.text || '#fff';
  const subText = c.subText || '#a0a0a0';
  const card = c.card || '#1C1E24';
  const border = c.border || 'rgba(255,255,255,0.06)';
  const borderStrong = c.borderStrong || 'rgba(255,255,255,0.10)';
  const brand = c.brand || '#e87b35';
  const input = c.input || '#22252C';
  const overlay = 'rgba(0,0,0,0.6)';

  const inpS = {
    width: '100%', padding: '8px 12px',
    border: `1.5px solid ${border}`, borderRadius: 8,
    background: input, color: text, fontSize: 13,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  };
  const labelS = {
    fontSize: 12, fontWeight: 600, color: subText,
    textTransform: 'uppercase', letterSpacing: 0.8,
    display: 'block', marginBottom: 6
  };

  // Get unique hosting types from plans
  const hostingTypes = [...new Set(plans.map(p => p.hosting_type))];
  const selectedPlans = hostingType
    ? plans.filter(p => p.hosting_type === hostingType && p.is_active !== false)
    : [];

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
      });

      toast({ title: 'Hosting Assigned', description: `${hostingType} - ${planName} assigned to ${customer.name}` });
      setHostingType(''); setPlanName(''); setBillingPeriod('Monthly');
      setDomain(''); setPrice(''); setNotes('');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err?.message || 'Failed to assign hosting', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: overlay, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{
          background: card, border: `1px solid ${borderStrong}`,
          borderRadius: 16, width: '100%', maxWidth: 520,
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={16} color="#4ade80" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: text }}>Assign Hosting</div>
              <div style={{ fontSize: 11, color: subText }}>{customer?.name} — {customer?.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: subText, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hosting Type */}
          <div>
            <label style={labelS}>Hosting Type *</label>
            <select
              style={{ ...inpS, appearance: 'none' }}
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
              style={{ ...inpS, appearance: 'none' }}
              value={planName}
              onChange={e => setPlanName(e.target.value)}
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
              style={{ ...inpS, appearance: 'none' }}
              value={billingPeriod}
              onChange={e => setBillingPeriod(e.target.value)}
            >
              {['Monthly', 'Quarterly (3mo)', 'Semi-Annual (6mo)', 'Yearly', '2 Years'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Domain + Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelS}>Domain (optional)</label>
              <input
                style={inpS}
                placeholder="e.g. example.com"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                onFocus={e => e.target.style.borderColor = brand}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>
            <div>
              <label style={labelS}>Price (LKR, optional)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText }} />
                <input
                  style={{ ...inpS, paddingLeft: 28 }}
                  type="number" min="0" step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelS}>Notes / Comments</label>
            <textarea
              style={{ ...inpS, resize: 'vertical', minHeight: 72 }}
              placeholder="Internal notes about this hosting assignment..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10
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
      </div>
    </div>
  );
}

export default AssignHostingDialog;
