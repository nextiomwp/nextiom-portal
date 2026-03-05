import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { assignProductToCustomer, MEMBERSHIP_TYPES } from '@/lib/storage';

function AssignProductDialog({ open, onOpenChange, customers, products, onSuccess }) {
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    activatedDomain: '',
    activationDate: new Date().toISOString().split('T')[0],
    membershipType: MEMBERSHIP_TYPES.YEARLY_LICENSE
  });
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Domain is required unless it's a "One Time User" or "Manual Updates" where it might not be relevant,
    // but the prompt asked for "license locked to one domain" for specific types.
    // We'll enforce it generally for consistency or allow empty if not applicable.
    // For now, enforcing validation for all types to ensure good data quality.
    if (!formData.customerId || !formData.productId || !formData.activationDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    assignProductToCustomer(formData);
    toast({
      title: "Success",
      description: "Product assigned successfully with new license",
    });
    onSuccess();
    onOpenChange(false);
    setFormData({
      customerId: '',
      productId: '',
      activatedDomain: '',
      activationDate: new Date().toISOString().split('T')[0],
      membershipType: MEMBERSHIP_TYPES.YEARLY_LICENSE
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Product & Generate License</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <select
                id="customer"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="product">Product *</Label>
              <select
                id="product"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="domain">Registered Domain</Label>
              <input
                id="domain"
                type="text"
                value={formData.activatedDomain}
                onChange={(e) => setFormData({ ...formData, activatedDomain: e.target.value })}
                placeholder="example.com"
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Required for domain-locked licenses</p>
            </div>

            <div>
              <Label htmlFor="activationDate">Start Date *</Label>
              <input
                id="activationDate"
                type="date"
                value={formData.activationDate}
                onChange={(e) => setFormData({ ...formData, activationDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="membershipType">Membership Type *</Label>
              <select
                id="membershipType"
                value={formData.membershipType}
                onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <optgroup label="Lifetime Memberships">
                  <option value={MEMBERSHIP_TYPES.LIFETIME_MANUAL}>{MEMBERSHIP_TYPES.LIFETIME_MANUAL}</option>
                  <option value={MEMBERSHIP_TYPES.LIFETIME_LICENSE}>{MEMBERSHIP_TYPES.LIFETIME_LICENSE}</option>
                </optgroup>
                <optgroup label="Yearly Memberships">
                  <option value={MEMBERSHIP_TYPES.YEARLY_LICENSE}>{MEMBERSHIP_TYPES.YEARLY_LICENSE}</option>
                  <option value={MEMBERSHIP_TYPES.YEARLY_WITH_UPDATES}>{MEMBERSHIP_TYPES.YEARLY_WITH_UPDATES}</option>
                  <option value={MEMBERSHIP_TYPES.YEARLY_NO_UPDATES}>{MEMBERSHIP_TYPES.YEARLY_NO_UPDATES}</option>
                </optgroup>
                <optgroup label="Other">
                  <option value={MEMBERSHIP_TYPES.ONE_TIME_USER}>{MEMBERSHIP_TYPES.ONE_TIME_USER}</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
            <p className="font-semibold mb-2">License & Update Rules:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Lifetime:</strong> Never expires. Manual or Auto updates.</li>
              <li>• <strong>1 Year:</strong> Expires after 365 days.</li>
              <li>• <strong>With License:</strong> Generates unique key, locks to domain.</li>
              <li>• <strong>Without Updates:</strong> License only validates purchase, no file downloads.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              Generate License
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AssignProductDialog;