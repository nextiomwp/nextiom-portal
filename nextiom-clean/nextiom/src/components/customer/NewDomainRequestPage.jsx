import React, { useState } from 'react';
import { Globe, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

function NewDomainRequestPage({ onSuccess, user }) {
  const [domainName, setDomainName] = useState('');
  const [extension, setExtension] = useState('.com');
  const [period, setPeriod] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const customerId = user?.id || authUser?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domainName) {
      toast({ title: "Error", description: "Please enter a domain name", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await supabase.from('domain_requests').insert([{
        customer_id: customerId,
        domain_name: `${domainName}${extension}`,
        period: `${period} Year(s)`,
        notes,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);

      await supabase.from('notifications').insert([{
        type: 'domain_request',
        title: 'New Domain Request',
        message: `Domain registration requested: ${domainName}${extension} (${period} Year)`,
        customer_id: customerId,
        is_read: false,
        created_at: new Date().toISOString()
      }]);

      setSubmitted(true);
      toast({ title: "Request Submitted!", description: "Admin has been notified." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
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
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h2>
        <p className="text-slate-500 max-w-md mb-8">
          Your request for <span className="font-bold text-slate-800">{domainName}{extension}</span> has been received.
          You will be notified once admin reviews it.
        </p>
        <div className="flex gap-4">
          <Button onClick={() => { setSubmitted(false); setDomainName(''); setNotes(''); }} variant="outline">
            Register Another
          </Button>
          <Button onClick={onSuccess} className="bg-blue-600 hover:bg-blue-700">
            View My Domains
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Register New Domain</h1>
        <p className="text-slate-500">Submit a request to register a new domain name.</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Domain Name</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={domainName}
                  onChange={e => setDomainName(e.target.value)}
                  placeholder="example"
                  className="w-full pl-10 pr-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={extension}
                onChange={e => setExtension(e.target.value)}
                className="w-32 px-3 py-3 text-lg border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value=".com">.com</option>
                <option value=".net">.net</option>
                <option value=".org">.org</option>
                <option value=".io">.io</option>
                <option value=".co.uk">.co.uk</option>
                <option value=".lk">.lk</option>
                <option value=".xyz">.xyz</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Registration Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white">
                <option value="1">1 Year</option>
                <option value="2">2 Years</option>
                <option value="3">3 Years</option>
                <option value="5">5 Years</option>
                <option value="10">10 Years</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Documents (Optional)</label>
              <input type="file" className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Notes / Comments</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg min-h-[100px]"
              placeholder="Any specific instructions?"
            />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" size="lg" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
              {loading ? 'Submitting...' : 'Submit Domain Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewDomainRequestPage;
