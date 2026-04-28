import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { resolveCustomerId } from '@/lib/storage';
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

function NewHostingOrderPage({ onSuccess, user }) {
  const [allPlans, setAllPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [hostingTypeKey, setHostingTypeKey] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('Yearly');
  const [domainOption, setDomainOption] = useState('new');
  const [domainName, setDomainName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

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
        const firstKey = plans[0]?.hosting_type_key || null;
        setHostingTypeKey(firstKey);
        setSelectedPlan(plans.find(p => p.hosting_type_key === firstKey)?.plan_name || null);
      } catch {
        setAllPlans(DEFAULT_PLANS);
        setHostingTypeKey('SHARED');
        setSelectedPlan('Basic');
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  const hostingTypes = [...new Map(allPlans.map(p => [p.hosting_type_key, { key: p.hosting_type_key, label: p.hosting_type }])).values()];
  const currentPlans = allPlans.filter(p => p.hosting_type_key === hostingTypeKey);
  const currentTypeLabel = hostingTypes.find(t => t.key === hostingTypeKey)?.label || '';

  const handleTypeSelect = (key) => {
    setHostingTypeKey(key);
    const first = allPlans.find(p => p.hosting_type_key === key);
    setSelectedPlan(first?.plan_name || null);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      const customerId = await resolveCustomerId({
        customerId: user?.id,
        userId: authUser?.id,
        email: authUser?.email
      });
      if (!customerId) throw new Error('Customer profile not found');

      const packageLabel = `${currentTypeLabel} - ${selectedPlan}`;
      const requestSummary = `${packageLabel} | Billing: ${billingPeriod} | Domain: ${domainName} | Notes: ${notes || 'None'}`;

      const { data: inserted, error: hostingError } = await supabase
        .from('hosting_requests')
        .insert([{ customer_id: customerId, package_type: requestSummary, status: 'pending', created_at: new Date().toISOString() }])
        .select();

      if (hostingError) throw new Error(hostingError?.message || 'Failed to create hosting request');
      if (!inserted || inserted.length === 0) throw new Error('Request may have been blocked by RLS');

      await supabase.from('notifications').insert([{
        type: 'hosting_request',
        title: 'New Hosting Request',
        message: `Hosting requested: ${packageLabel} (${billingPeriod}) for domain: ${domainName}`,
        customer_id: customerId,
        is_read: false,
        created_at: new Date().toISOString()
      }]);

      setSubmitted(true);
      toast({ title: 'Order Submitted', description: 'Admin has been notified of your hosting order.' });
    } catch (err) {
      toast({ title: 'Error', description: err?.message || 'Failed to submit order.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingPlans) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Order Placed Successfully!</h2>
        <p className="text-slate-500 max-w-md mb-8">
          Your order for <strong>{currentTypeLabel} - {selectedPlan}</strong> has been received.
          Admin will review and contact you shortly.
        </p>
        <Button onClick={onSuccess} className="bg-blue-600 hover:bg-blue-700">View My Hosting</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Order New Hosting</h1>
        <p className="text-slate-500">Choose the perfect hosting plan for your needs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Select Hosting Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {hostingTypes.map(type => (
                <div
                  key={type.key}
                  onClick={() => handleTypeSelect(type.key)}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${hostingTypeKey === type.key ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                >
                  <p className="font-bold text-slate-800">{type.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Choose Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {currentPlans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.plan_name)}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all relative ${selectedPlan === plan.plan_name ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                >
                  {selectedPlan === plan.plan_name && (
                    <div className="absolute top-2 right-2 text-blue-600"><CheckCircle className="w-4 h-4" /></div>
                  )}
                  <p className="font-bold text-slate-800 mb-2">{plan.plan_name}</p>
                  <div className="text-xs text-slate-600 space-y-1">
                    {plan.storage && <p>{plan.storage} Storage</p>}
                    {plan.bandwidth && <p>{plan.bandwidth} Bandwidth</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Period</label>
                <select value={billingPeriod} onChange={e => setBillingPeriod(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly (Save 20%)</option>
                  <option value="2 Years">2 Years (Save 30%)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Domain Name</label>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant={domainOption === 'new' ? 'default' : 'outline'} size="sm" onClick={() => setDomainOption('new')}>New Domain</Button>
                  <Button type="button" variant={domainOption === 'existing' ? 'default' : 'outline'} size="sm" onClick={() => setDomainOption('existing')}>Existing Domain</Button>
                </div>
                <input
                  type="text"
                  value={domainName}
                  onChange={e => setDomainName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder={domainOption === 'new' ? 'Enter new domain to register' : 'Enter your existing domain'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md h-20" placeholder="Any specific requests?" />
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm sticky top-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="font-medium">{currentTypeLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-medium">{selectedPlan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Period:</span>
                <span className="font-medium">{billingPeriod}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 mt-3">
                <ul className="space-y-1 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Free SSL Certificate</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> 24/7 Support</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> 99.9% Uptime</li>
                </ul>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || !domainName || !selectedPlan}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Submit Order'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewHostingOrderPage;
