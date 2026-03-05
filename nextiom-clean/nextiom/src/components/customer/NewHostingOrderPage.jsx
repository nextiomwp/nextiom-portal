import React, { useState } from 'react';
import { CheckCircle, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { HOSTING_TYPES, HOSTING_PLANS } from '@/lib/storage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

function NewHostingOrderPage({ onSuccess, user }) {
  const [hostingType, setHostingType] = useState('SHARED');
  const [selectedPlan, setSelectedPlan] = useState('Basic');
  const [billingPeriod, setBillingPeriod] = useState('Yearly');
  const [domainOption, setDomainOption] = useState('new');
  const [domainName, setDomainName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const customerId = user?.id || authUser?.id;
  const currentPlans = HOSTING_PLANS[hostingType];

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      await supabase.from('hosting_requests').insert([{
        customer_id: customerId,
        package_name: `${HOSTING_TYPES[hostingType]} - ${selectedPlan}`,
        notes: `Billing: ${billingPeriod}, Domain: ${domainName}, Notes: ${notes}`,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);

      await supabase.from('notifications').insert([{
        type: 'hosting_request',
        title: 'New Hosting Request',
        message: `Hosting requested: ${HOSTING_TYPES[hostingType]} - ${selectedPlan} (${billingPeriod})`,
        customer_id: customerId,
        is_read: false,
        created_at: new Date().toISOString()
      }]);

      setSubmitted(true);
      toast({ title: "Order Submitted", description: "Admin has been notified of your hosting order." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to submit order. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Order Placed Successfully!</h2>
        <p className="text-slate-500 max-w-md mb-8">
          Your order for <strong>{HOSTING_TYPES[hostingType]} - {selectedPlan}</strong> has been received.
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
              {Object.keys(HOSTING_TYPES).map(type => (
                <div
                  key={type}
                  onClick={() => { setHostingType(type); setSelectedPlan(Object.keys(HOSTING_PLANS[type])[0]); }}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    hostingType === type ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <p className="font-bold text-slate-800">{HOSTING_TYPES[type]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Choose Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.keys(currentPlans).map(planName => (
                <div
                  key={planName}
                  onClick={() => setSelectedPlan(planName)}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all relative ${
                    selectedPlan === planName ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {selectedPlan === planName && <div className="absolute top-2 right-2 text-blue-600"><CheckCircle className="w-4 h-4" /></div>}
                  <p className="font-bold text-slate-800 mb-2">{planName}</p>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>{currentPlans[planName].storage} Storage</p>
                    <p>{currentPlans[planName].bandwidth} Bandwidth</p>
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
                  placeholder={domainOption === 'new' ? "Enter new domain to register" : "Enter your existing domain"}
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
                <span className="font-medium">{HOSTING_TYPES[hostingType]}</span>
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
            <Button onClick={handleSubmit} disabled={loading || !domainName} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? 'Processing...' : 'Submit Order'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewHostingOrderPage;
