import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Plus, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getCustomers, deleteCustomer, getNotifications } from '@/lib/storage';
import EditCustomerDialog from '@/components/dialogs/EditCustomerDialog';
import AssignProductDialog from '@/components/dialogs/AssignProductDialog';
import { supabase } from '@/lib/customSupabaseClient';

function AdminCustomerManagement({ products, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [assigningCustomer, setAssigningCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();

    // Real-time subscription
    const channel = supabase
      .channel('customers_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        loadCustomers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load customers", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(confirm('Are you sure you want to delete this customer?')) {
        try {
            await deleteCustomer(id);
            toast({ title: "Customer Deleted" });
            loadCustomers();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
      return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
           <input 
             className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
             placeholder="Search customers..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
             <tr>
               <th className="px-6 py-3">Name</th>
               <th className="px-6 py-3">Email</th>
               <th className="px-6 py-3">Company</th>
               <th className="px-6 py-3">Joined</th>
               <th className="px-6 py-3 text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
             {filteredCustomers.map(customer => (
               <tr key={customer.id} className="hover:bg-slate-50">
                 <td className="px-6 py-3 font-medium text-slate-900">{customer.name}</td>
                 <td className="px-6 py-3 text-slate-600">{customer.email}</td>
                 <td className="px-6 py-3 text-slate-600">{customer.company || '-'}</td>
                 <td className="px-6 py-3 text-slate-600">{new Date(customer.created_at).toLocaleDateString()}</td>
                 <td className="px-6 py-3 text-right flex justify-end gap-2">
                   <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(customer)}>
                     <Eye className="w-4 h-4 text-blue-500" />
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(customer)}>
                     <Edit className="w-4 h-4 text-slate-500" />
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => setAssigningCustomer(customer)}>
                     <Plus className="w-4 h-4 text-green-500" />
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)}>
                     <Trash2 className="w-4 h-4 text-red-500" />
                   </Button>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Customer Details: {selectedCustomer?.name}</DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
                <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                        <div><span className="font-semibold">Email:</span> {selectedCustomer.email}</div>
                        <div><span className="font-semibold">Phone:</span> {selectedCustomer.phone}</div>
                        <div><span className="font-semibold">Company:</span> {selectedCustomer.company}</div>
                        <div><span className="font-semibold">Country:</span> {selectedCustomer.country}</div>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingCustomer && (
        <EditCustomerDialog 
            open={!!editingCustomer}
            onOpenChange={() => setEditingCustomer(null)}
            customer={editingCustomer}
            onSuccess={() => { setEditingCustomer(null); loadCustomers(); onSuccess?.(); }}
        />
      )}

      {/* Assign Product Dialog */}
      {assigningCustomer && (
         <AssignProductDialog 
            open={!!assigningCustomer}
            onOpenChange={() => setAssigningCustomer(null)}
            customers={[assigningCustomer]}
            products={products}
            onSuccess={() => { setAssigningCustomer(null); onSuccess?.(); }}
         />
      )}
    </div>
  );
}

export default AdminCustomerManagement;