import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Plus, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getCustomers, deleteCustomer } from '@/lib/storage';
import EditCustomerDialog from '@/components/dialogs/EditCustomerDialog';
import AssignProductDialog from '@/components/dialogs/AssignProductDialog';
import { supabase } from '@/lib/customSupabaseClient';
import CustomerProfileAdminView from './CustomerProfileAdminView';

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
    if (confirm('Are you sure you want to delete this customer?')) {
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

  if (selectedCustomer) {
    return <CustomerProfileAdminView customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                <td className="px-6 py-3 text-right">
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button onClick={() => setSelectedCustomer(customer)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Eye size={13} /> View
                    </button>
                    <button onClick={() => setEditingCustomer(customer)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid #64748b', background: 'transparent', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Edit size={13} /> Edit
                    </button>
                    <button onClick={() => setAssigningCustomer(customer)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid #16a34a', background: 'transparent', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={13} /> Assign
                    </button>
                    <button onClick={() => handleDelete(customer.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>



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