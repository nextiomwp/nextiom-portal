import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { getCustomerServices, calculateExpiryStatus } from '@/lib/storage';

function MyServicesPage({ user }) {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const data = await getCustomerServices(user.id);
            setServices(data || []);
        } catch (e) {
            setServices([]);
        } finally {
            setIsLoading(false);
        }
    };
    loadServices();
  }, [user]);

  const filteredServices = services.filter(s => 
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">My Subscriptions</h1>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md"
             />
        </div>
        
        <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Service</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Type</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
            </thead>
            <tbody>
                {filteredServices.length > 0 ? filteredServices.map((s, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                        <td className="py-3 px-6 font-medium text-slate-800">{s.name}</td>
                        <td className="py-3 px-6 text-sm text-slate-600 capitalize">{s.type}</td>
                        <td className="py-3 px-6 text-sm">
                             {calculateExpiryStatus(s.expiry_date).status}
                        </td>
                    </tr>
                )) : (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-500">No services found</td></tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyServicesPage;