import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Server } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { resolveCustomerId, assertPortalActionsAllowed } from '@/lib/storage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const DEFAULT_PLANS = [
  { id: 'd1', hosting_type: 'Shared Hosting', hosting_type_key: 'SHARED', plan_name: 'Basic', storage: '10GB', bandwidth: '100GB', is_active: true },
  { id: 'd2', hosting_type: 'Shared Hosting', hosting_type_key: 'SHARED', plan_name: 'Standard', storage: '50GB', bandwidth: '500GB', is_active: true },
  { id: 'd3', hosting_type: 'Shared Hosting', hosting_type_key: 'SHARED', plan_name: 'Premium', storage: 'Unlimited', bandwidth: 'Unlimited', is_active: true },
  { id: 'd4', hosting_type: 'VPS Hosting', hosting_type_key: 'VPS', plan_name: 'VPS1', storage: '50GB NVMe', bandwidth: '2TB', is_active: true },
  { id: 'd5', hosting_type: 'VPS Hosting', hosting_type_key: 'VPS', plan_name: 'VPS2', storage: '100GB NVMe', bandwidth: '5TB', is_active: true },
  { id: 'd6', hosting_type: 'Dedicated Server', hosting_type_key: 'DEDICATED', plan_name: 'Standard', storage: '', bandwidth: '', is_active: true },
  { id: 'd7', hosting_type: 'Cloud Hosting', hosting_type_key: 'CLOUD', plan_name: 'Standard', storage: '', bandwidth: '', is_active: true },
];

function NewHostingOrderPage({ onSuccess, user, isDark = false, c = {} }) {
  const [allPlans, setAllPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [hostingType, setHostingType] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('Yearly');
  const [domainOption, setDomainOption] = useState('new');
  const [domainName, setDomainName] = useState('');
  const [notes, setNotes] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('hosting_plans')
          .select('*')
          .eq('is_active', true)
          .order('hosting_type')
          .order('plan_name');
        const plans = (!error && data && data.length > 0) ? data : DEFAULT_PLANS;
        setAllPlans(plans);
        const firstType = plans[0]?.hosting_type || null;
        setHostingType(firstType);
        setSelectedPlan(plans.find(p => p.hosting_type === firstType)?.plan_name || null);
      } catch {
        setAllPlans(DEFAULT_PLANS);
        setHostingType('Shared Hosting');
        setSelectedPlan('Basic');
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  const hostingTypes = [...new Set(allPlans.map(p => p.hosting_type))];
  const currentPlans = allPlans.filter(p => p.hosting_type === hostingType);
  const currentTypeLabel = hostingType || '';

  const handleTypeSelect = (type) => {
    setHostingType(type);
    const first = allPlans.find(p => p.hosting_type === type);
    setSelectedPlan(first?.plan_name || null);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      await assertPortalActionsAllowed();
      const customerId = await resolveCustomerId({
        customerId: user?.id,
        userId: authUser?.id,
        email: authUser?.email,
      });
      if (!customerId) throw new Error('Customer profile not found');

      const packageLabel = `${currentTypeLabel} - ${selectedPlan}`;
      const requestSummary = `${packageLabel} | Billing: ${billingPeriod} | Domain: ${domainName} | Notes: ${notes || 'None'}`;

      const { data: inserted, error: hostingError } = await supabase
        .from('hosting_requests')
        .insert([{ customer_id: customerId, package_type: requestSummary, status: 'pending', auto_renew: autoRenew, created_at: new Date().toISOString() }])
        .select();

      if (hostingError) throw new Error(hostingError?.message || 'Failed to create hosting request');
      if (!inserted || inserted.length === 0) throw new Error('Request may have been blocked by RLS');

      await supabase.from('notifications').insert([{
        type: 'hosting_request',
        title: 'New Hosting Request',
        message: `Hosting requested: ${packageLabel} (${billingPeriod}) for domain: ${domainName}`,
        customer_id: customerId,
        is_read: false,
        created_at: new Date().toISOString(),
      }]);

      setSubmitted(true);
      toast({ title: 'Order Submitted', description: 'Admin has been notified of your hosting order.' });
    } catch (err) {
      toast({ title: 'Error', description: err?.message || 'Failed to submit order.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const sectionCard = {
    background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${border}`,
    borderRadius: 20,
    padding: '20px 24px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.05)',
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: `1px solid ${borderStrong}`, borderRadius: 10,
    background: panel2, color: text, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: subText, marginBottom: 6 };

  if (loadingPlans) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Loader2 style={{ width: 32, height: 32, color: brand }} className="animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <CheckCircle style={{ width: 32, height: 32, color: '#16a34a' }} />
        </div>
        <h2 style={{ color: text, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Order Placed Successfully!</h2>
        <p style={{ color: subText, fontSize: 14, maxWidth: 400, marginBottom: 24, lineHeight: 1.6 }}>
          Your order for <strong style={{ color: text }}>{currentTypeLabel} – {selectedPlan}</strong> has been received. Admin will review and contact you shortly.
        </p>
        <button
          onClick={onSuccess}
          style={{ padding: '10px 24px', borderRadius: 10, background: brand, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#d4692a'}
          onMouseLeave={e => e.currentTarget.style.background = brand}
        >
          View My Hosting
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Server style={{ width: 16, height: 16, color: brand }} />
        </div>
        <div>
          <h1 style={{ color: text, fontSize: 20, fontWeight: 800 }}>Order New Hosting</h1>
          <p style={{ color: subText, fontSize: 12, marginTop: 2 }}>Choose the perfect hosting plan for your needs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Step 1: Hosting Type */}
          <div style={sectionCard}>
            <p style={{ color: text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>1. Select Hosting Type</p>
            <div className="grid grid-cols-2 gap-3">
              {hostingTypes.map(type => {
                const isSelected = hostingType === type;
                return (
                  <div
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    style={{
                      padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${isSelected ? brand : borderStrong}`,
                      background: isSelected ? brandLight : 'transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = brand; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = borderStrong; }}
                  >
                    <p style={{ color: isSelected ? brand : text, fontWeight: 700, fontSize: 13 }}>{type}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Plan */}
          <div style={sectionCard}>
            <p style={{ color: text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>2. Choose Plan</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {currentPlans.map(plan => {
                const isSelected = selectedPlan === plan.plan_name;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.plan_name)}
                    style={{
                      padding: '14px', borderRadius: 12, cursor: 'pointer', position: 'relative',
                      border: `2px solid ${isSelected ? brand : borderStrong}`,
                      background: isSelected ? brandLight : 'transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = brand; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = borderStrong; }}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <CheckCircle style={{ width: 14, height: 14, color: brand }} />
                      </div>
                    )}
                    <p style={{ color: isSelected ? brand : text, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{plan.plan_name}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {plan.storage && <p style={{ color: subText, fontSize: 11 }}>{plan.storage} Storage</p>}
                      {plan.bandwidth && <p style={{ color: subText, fontSize: 11 }}>{plan.bandwidth} Bandwidth</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Config */}
          <div style={sectionCard}>
            <p style={{ color: text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>3. Configuration</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Billing Period</label>
                <select
                  value={billingPeriod}
                  onChange={e => setBillingPeriod(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = borderStrong}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly (Save 20%)</option>
                  <option value="2 Years">2 Years (Save 30%)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1px solid ${borderStrong}`, borderRadius: 10, background: panel2 }}>
                <input type="checkbox" id="hosting_auto_renew" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} style={{ width: 16, height: 16, accentColor: brand }} />
                <label htmlFor="hosting_auto_renew" style={{ fontSize: 13, color: text, cursor: 'pointer' }}>Enable Auto Renewal</label>
              </div>
              <div>
                <label style={labelStyle}>Domain Name</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {['new', 'existing'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDomainOption(opt)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: domainOption === opt ? brand : 'transparent',
                        color: domainOption === opt ? '#fff' : subText,
                        border: `1px solid ${domainOption === opt ? brand : borderStrong}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt === 'new' ? 'New Domain' : 'Existing Domain'}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={domainName}
                  onChange={e => setDomainName(e.target.value)}
                  style={inputStyle}
                  placeholder={domainOption === 'new' ? 'Enter new domain to register' : 'Enter your existing domain'}
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = borderStrong}
                />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ ...inputStyle, height: 72, resize: 'none' }}
                  placeholder="Any specific requests?"
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = borderStrong}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div style={{ ...sectionCard, position: 'sticky', top: 24 }}>
            <p style={{ color: text, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Order Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, fontSize: 13 }}>
              {[
                { label: 'Type', value: currentTypeLabel },
                { label: 'Plan', value: selectedPlan },
                { label: 'Period', value: billingPeriod },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: subText }}>{row.label}</span>
                  <span style={{ color: text, fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Free SSL Certificate', '24/7 Support', '99.9% Uptime'].map(feat => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle style={{ width: 12, height: 12, color: '#16a34a' }} />
                    <span style={{ color: subText, fontSize: 11 }}>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !domainName || !selectedPlan}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 10,
                background: brand, color: '#fff',
                fontWeight: 700, fontSize: 14, border: 'none', cursor: loading || !domainName || !selectedPlan ? 'not-allowed' : 'pointer',
                opacity: loading || !domainName || !selectedPlan ? 0.6 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!loading && domainName && selectedPlan) e.currentTarget.style.background = '#d4692a'; }}
              onMouseLeave={e => e.currentTarget.style.background = brand}
            >
              {loading ? 'Processing…' : 'Submit Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewHostingOrderPage;
