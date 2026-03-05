import React, { useState } from 'react';
import { ArrowLeft, Save, Mail, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateDomain, DOMAIN_STATUS, addDomainActivityLog } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function AdminDomainDetailsView({ domain, customer, onBack }) {
  const [status, setStatus] = useState(domain.status);
  const [expiryDate, setExpiryDate] = useState(domain.expiryDate ? domain.expiryDate.split('T')[0] : '');
  const { toast } = useToast();

  const handleSave = () => {
    updateDomain(domain.id, {
        status,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null
    });
    addDomainActivityLog(domain.id, 'Admin Update', `Status changed to ${status}`);
    toast({ title: "Domain Updated", description: "Changes saved successfully." });
    onBack();
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
             <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
             <h2 className="text-xl font-bold text-slate-800">{domain.name}</h2>
             <p className="text-sm text-slate-500">Owned by {customer?.name || 'Unknown'}</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
             <h3 className="font-semibold text-slate-800 border-b pb-2">Management</h3>
             
             <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md"
                >
                    {Object.values(DOMAIN_STATUS).map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Date</label>
                <input 
                    type="date" 
                    value={expiryDate} 
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md"
                />
             </div>

             <div className="pt-4 flex gap-2">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
                <Button variant="outline">
                    <Mail className="w-4 h-4 mr-2" /> Email Customer
                </Button>
             </div>
          </div>
       </div>
    </div>
  );
}

export default AdminDomainDetailsView;