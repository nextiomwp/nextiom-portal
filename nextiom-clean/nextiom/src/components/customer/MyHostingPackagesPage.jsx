import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCustomerHostingPackages } from '@/lib/storage';
import HostingPackageDetailsModal from './HostingPackageDetailsModal';

function MyHostingPackagesPage({ user }) {
  const [packages, setPackages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, [user]);

  const loadPackages = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
        const data = await getCustomerHostingPackages(user.id);
        setPackages(Array.isArray(data) ? data : []);
    } catch(err) {
        setPackages([]);
    } finally {
        setIsLoading(false);
    }
  };

  const filteredPackages = packages.filter(p => 
    (p.package_name || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                        <td className="py-3 px-6 font-medium text-slate-800">{pkg.package_name}</td>
                        <td className="py-3 px-6 text-sm text-slate-600">{pkg.domain}</td>
                        <td className="py-3 px-6">
                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-bold">
                                {pkg.status}
                            </span>
                        </td>
                        <td className="py-3 px-6 text-right">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSelectedPackage(pkg); setIsDetailsOpen(true); }}
                            >
                                Details
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