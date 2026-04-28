import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getCustomerHostingPackages, getCustomerHostingRequests, resolveCustomerId, deleteHostingRequest, deleteHosting } from '@/lib/storage';
import HostingPackageDetailsModal from './HostingPackageDetailsModal';

function MyHostingPackagesPage({ user }) {
  const [packages, setPackages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPackages();
  }, [user]);

  const parseRequestField = (raw, label) => {
    if (!raw) return null;
    const regex = new RegExp(`${label}:\\s*([^|;\\n]+)`, 'i');
    const match = raw.match(regex);
    return match?.[1]?.trim() || null;
  };

  const parseHostingRequest = (request) => {
    const raw = request.package_type || request.notes || '';
    return {
      plan: raw.split('|')[0]?.trim() || raw || 'Hosting Request',
      billing_period: parseRequestField(raw, 'Billing'),
      domain: request.domain || request.domain_name || parseRequestField(raw, 'Domain'),
      notes: parseRequestField(raw, 'Notes') || 'None'
    };
  };

  const loadPackages = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const customerId = await resolveCustomerId({ customerId: user.id, userId: user.id, email: user.email });
      if (!customerId) {
        setPackages([]);
        return;
      }

      const data = await getCustomerHostingPackages(customerId);
      const reqs = await getCustomerHostingRequests(customerId);

      const combined = [
        ...(Array.isArray(data) ? data : []),
        ...(Array.isArray(reqs) ? reqs : []).map(r => {
          const parsed = parseHostingRequest(r);
          return {
            ...r,
            id: `req-${r.id}`,
            package_type: parsed.plan,
            packageName: parsed.plan,
            plan: parsed.plan,
            billing_period: parsed.billing_period,
            status: String(r.status || '').toLowerCase() === 'pending' ? 'Pending Setup' : r.status,
            domain: parsed.domain || 'N/A',
            notes: parsed.notes,
            isRequest: true
          };
        })
      ];

      setPackages(combined);
    } catch (err) {
      console.error('Error loading packages:', err);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = async (pkg) => {
    const confirmed = window.confirm('Are you sure you want to delete this hosting order?');
    if (!confirmed) return;

    try {
      if (pkg.isRequest) {
        await deleteHostingRequest(pkg.id.replace(/^req-/, ''));
      } else {
        await deleteHosting(pkg.id);
      }
      toast({ title: 'Deleted', description: 'Hosting order removed.' });
      loadPackages();
    } catch (err) {
      console.error('Delete failed:', err);
      toast({ title: 'Error', description: 'Could not delete hosting order.', variant: 'destructive' });
    }
  };

  const filteredPackages = packages.filter(p =>
    ((p.package_name || p.package_type || p.packageName || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">My Hosting Packages</h1>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search packages..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Package</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Domain</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackages.length > 0 ? filteredPackages.map((pkg) => (
                <tr key={pkg.id} className="border-b border-slate-100">
                  <td className="py-3 px-6 font-medium text-slate-800">{pkg.package_name || pkg.package_type || pkg.packageName || 'N/A'}</td>
                  <td className="py-3 px-6 text-sm text-slate-600">{pkg.domain || 'N/A'}</td>
                  <td className="py-3 px-6">
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-bold">
                      {pkg.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedPackage(pkg); setIsDetailsOpen(true); }}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePackage(pkg)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">No packages found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HostingPackageDetailsModal
        pkg={selectedPackage}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
}

export default MyHostingPackagesPage;