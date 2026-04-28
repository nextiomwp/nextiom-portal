import React, { useEffect, useState } from 'react';
import { ChevronLeft, Mail, Phone, Building, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getCustomerById,
  updateCustomer,
  getCustomerDomains,
  getCustomerHostingPackages,
  getCustomerDomainRequests,
  getCustomerHostingRequests,
  updateDomainRequest,
  updateHostingRequest,
  deleteDomainRequest,
  deleteHostingRequest
} from '@/lib/storage';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

function CustomerProfileAdminView({ customer, onBack }) {
  const [customerData, setCustomerData] = useState(customer || null);
  const [domains, setDomains] = useState([]);
  const [hostingPackages, setHostingPackages] = useState([]);
  const [domainRequests, setDomainRequests] = useState([]);
  const [hostingRequests, setHostingRequests] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadAll = async () => {
    if (!customer?.id) return;

    const [fullCustomer, customerDomains, customerHosting, customerDomainRequests, customerHostingRequests] = await Promise.all([
      getCustomerById(customer.id),
      getCustomerDomains(customer.id),
      getCustomerHostingPackages(customer.id),
      getCustomerDomainRequests(customer.id),
      getCustomerHostingRequests(customer.id)
    ]);

    setCustomerData(fullCustomer || customer);
    setDomains(customerDomains || []);
    setHostingPackages(customerHosting || []);
    setDomainRequests(customerDomainRequests || []);
    setHostingRequests(customerHostingRequests || []);
  };

  useEffect(() => {
    loadAll();
  }, [customer?.id]);

  if (!customerData) return null;

  const updateRequestStatus = async (type, id, status) => {
    if (type === 'domain') {
      await updateDomainRequest(id, { status, updated_at: new Date().toISOString() });
    } else {
      await updateHostingRequest(id, { status, updated_at: new Date().toISOString() });
    }
    await loadAll();
    toast({ title: 'Request Updated', description: `Request marked as ${status}.` });
  };

  const deleteRequest = async (type, id) => {
    if (type === 'domain') {
      await deleteDomainRequest(id);
    } else {
      await deleteHostingRequest(id);
    }
    await loadAll();
    toast({ title: 'Request Deleted', description: 'Request has been removed.' });
  };

  const handleSaveCustomer = async () => {
    setIsSaving(true);
    try {
      await updateCustomer(customerData.id, {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        company: customerData.company,
        country: customerData.country
      });
      toast({ title: 'Customer Updated', description: 'Profile changes saved successfully.' });
      await loadAll();
    } finally {
      setIsSaving(false);
    }
  };

  const pendingDomainRequests = domainRequests.filter((r) => String(r.status || '').toLowerCase() === 'pending');
  const pendingHostingRequests = hostingRequests.filter((r) => String(r.status || '').toLowerCase() === 'pending');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4 mr-2" /> Back to Customers
      </Button>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{customerData.name}</h2>
            <p className="text-sm text-slate-500">Customer since {customerData.created_at ? format(new Date(customerData.created_at), 'MMM dd, yyyy') : '-'}</p>
          </div>
          <Button onClick={handleSaveCustomer} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2"><Mail className="w-3 h-3" /> Email</p>
            <input className="w-full p-2 border border-slate-300 rounded-md" value={customerData.email || ''} onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2"><Phone className="w-3 h-3" /> Phone</p>
            <input className="w-full p-2 border border-slate-300 rounded-md" value={customerData.phone || ''} onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2"><Building className="w-3 h-3" /> Company</p>
            <input className="w-full p-2 border border-slate-300 rounded-md" value={customerData.company || ''} onChange={(e) => setCustomerData({ ...customerData, company: e.target.value })} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2"><Globe className="w-3 h-3" /> Country</p>
            <input className="w-full p-2 border border-slate-300 rounded-md" value={customerData.country || ''} onChange={(e) => setCustomerData({ ...customerData, country: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Domains</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Domain</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {domains.map((d) => (
              <tr key={d.id}>
                <td className="py-3 px-6 font-medium text-slate-800">{d.name}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{d.status || '-'}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{d.expiry_date ? format(new Date(d.expiry_date), 'MMM dd, yyyy') : '-'}</td>
              </tr>
            ))}
            {domains.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-500">No domains found</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Hosting Packages</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Package</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Domain</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hostingPackages.map((h) => (
              <tr key={h.id}>
                <td className="py-3 px-6 font-medium text-slate-800">{h.package_name}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{h.domain || '-'}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{h.status || '-'}</td>
              </tr>
            ))}
            {hostingPackages.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-500">No hosting packages found</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Pending Domain Requests</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Domain</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendingDomainRequests.map((r) => (
              <tr key={r.id}>
                <td className="py-3 px-6 font-medium text-slate-800">{r.domain_name}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{r.status}</td>
                <td className="py-3 px-6 text-right flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateRequestStatus('domain', r.id, 'approved')}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => updateRequestStatus('domain', r.id, 'rejected')}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteRequest('domain', r.id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {pendingDomainRequests.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-500">No pending domain requests</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Pending Hosting Requests</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Package</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendingHostingRequests.map((r) => (
              <tr key={r.id}>
                <td className="py-3 px-6 font-medium text-slate-800">{r.package_name}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{r.status}</td>
                <td className="py-3 px-6 text-right flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateRequestStatus('hosting', r.id, 'approved')}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => updateRequestStatus('hosting', r.id, 'rejected')}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteRequest('hosting', r.id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {pendingHostingRequests.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-500">No pending hosting requests</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomerProfileAdminView;
