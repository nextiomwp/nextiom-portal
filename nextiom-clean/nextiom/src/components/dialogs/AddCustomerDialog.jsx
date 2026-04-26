import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { addCustomer } from '@/lib/storage';

function AddCustomerDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    country: '',
    domains: ['']
  });
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.country) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const customerData = {
      ...formData,
      domains: formData.domains.filter(d => d.trim() !== '')
    };

    addCustomer(customerData);
    toast({
      title: "Success",
      description: "Customer added successfully",
    });
    onSuccess();
    onOpenChange(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      country: '',
      domains: ['']
    });
  };

  const addDomain = () => {
    setFormData({ ...formData, domains: [...formData.domains, ''] });
  };

  const removeDomain = (index) => {
    const newDomains = formData.domains.filter((_, i) => i !== index);
    setFormData({ ...formData, domains: newDomains.length > 0 ? newDomains : [''] });
  };

  const updateDomain = (index, value) => {
    const newDomains = [...formData.domains];
    newDomains[index] = value;
    setFormData({ ...formData, domains: newDomains });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone *</Label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all"
                required
              />
            </div>

            <div>
              <Label htmlFor="country">Country *</Label>
              <input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="company">Company Name</Label>
              <input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Domains</Label>
              <Button type="button" size="sm" onClick={addDomain} variant="outline" className="rounded-xl">
                <Plus className="w-4 h-4 mr-1" />
                Add Domain
              </Button>
            </div>
            <div className="space-y-2">
              {formData.domains.map((domain, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => updateDomain(index, e.target.value)}
                    placeholder="example.com"
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all"
                  />
                  {formData.domains.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomain(index)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="bg-[#e87b35] hover:bg-[#d66a24] text-white shadow-md rounded-xl transition-all font-medium border-0">
              Add Customer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddCustomerDialog;