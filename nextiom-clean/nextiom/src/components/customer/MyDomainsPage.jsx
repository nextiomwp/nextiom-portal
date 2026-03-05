import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCustomerDomains, updateDomain } from '@/lib/storage';
import { Switch } from '@/components/ui/switch';
import DomainDetailsModal from './DomainDetailsModal';
import { useToast } from '@/components/ui/use-toast';

function MyDomainsPage({ user }) {
  const [domains, setDomains] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDomains();
  }, [user]);

  const loadDomains = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
        const data = await getCustomerDomains(user.id);
        setDomains(Array.isArray(data) ? data : []);
    } catch(err) {
        setDomains([]);
        toast({ title: "Error", description: "Failed to load domains", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const filteredDomains = domains.filter(d => 
     (d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAutoRenew = async (id, current) => {
      try {
          await updateDomain(id, { auto_renew: !current });
          loadDomains();
          toast({ title: "Success", description: "Auto-renew status updated" });
      } catch (e) {
          toast({ title: "Error", description: "Could not update status", variant: "destructive" });
      }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800">My Domains</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex gap-4 mb-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
                type="text" 
                placeholder="Search domains..." 
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
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Domain</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Expiry</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Auto Renew</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
             </thead>
             <tbody>
                {filteredDomains.length > 0 ? filteredDomains.map((domain) => (
                    <tr key={domain.id} className="border-b border-slate-100">
                        <td className="py-3 px-6 font-medium text-slate-800">{domain.name}</td>
                        <td className="py-3 px-6">
                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-bold">
                                {domain.status || 'Unknown'}
                            </span>
                        </td>
                        <td className="py-3 px-6 text-sm text-slate-600">
                            {domain.expiry_date ? new Date(domain.expiry_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-6">
                            <Switch 
                                checked={domain.auto_renew} 
                                onCheckedChange={() => handleAutoRenew(domain.id, domain.auto_renew)} 
                            />
                        </td>
                        <td className="py-3 px-6 text-right">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSelectedDomain(domain); setIsDetailsOpen(true); }}
                            >
                                Details
                            </Button>
                        </td>
                    </tr>
                )) : (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">No domains found</td></tr>
                )}
             </tbody>
           </table>
        </div>
      </div>
      
      <DomainDetailsModal 
        domain={selectedDomain} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />
    </div>
  );
}

export default MyDomainsPage;