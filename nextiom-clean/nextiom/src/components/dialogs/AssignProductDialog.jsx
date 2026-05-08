import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { assignProductToCustomer } from '@/lib/storage';

function AssignProductDialog({ open, onOpenChange, customers, products, onSuccess }) {
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    activationDate: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId || !formData.productId || !formData.activationDate) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    try {
      await assignProductToCustomer(formData);
      toast({ title: 'Success', description: 'Product assigned successfully' });
      onSuccess();
      onOpenChange(false);
      setFormData({ customerId: '', productId: '', activationDate: new Date().toISOString().split('T')[0] });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to assign product', variant: 'destructive' });
    }
  };

  const selClass = 'w-full mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Product &amp; Generate License</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="customer">Customer *</Label>
            <select id="customer" value={formData.customerId} className={selClass} required
              onChange={e => setFormData(p => ({ ...p, customerId: e.target.value }))}>
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} – {c.email}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="product">Product *</Label>
            <select id="product" value={formData.productId} className={selClass} required
              onChange={e => setFormData(p => ({ ...p, productId: e.target.value }))}>
              <option value="">Select Product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="activationDate">Start Date *</Label>
            <input id="activationDate" type="date" value={formData.activationDate} required
              onChange={e => setFormData(p => ({ ...p, activationDate: e.target.value }))}
              className={selClass} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" className="bg-[#e87b35] hover:bg-[#d66a24] text-white rounded-xl border-0">
              Assign Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AssignProductDialog;
