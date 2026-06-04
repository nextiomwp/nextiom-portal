import React, { useState } from 'react';
import { X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { addNotification } from '@/lib/storage';

const SUPABASE_URL = 'https://fewhvlsqkbsmqbrqclya.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZld2h2bHNxa2JzbXFicnFjbHlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEwMjI4MSwiZXhwIjoyMDg1Njc4MjgxfQ.O7JlivddOXH2oElVnJ8LWzdDbpL-X4OP8GGdK_UYlhM';

const EMPTY = { name: '', email: '', phone: '', company: '', country: '', password: '', confirmPassword: '', domains: [''] };

function AddCustomerDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const inp = 'w-full mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all text-sm';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.country || !formData.password) {
      toast({ title: 'Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const tempClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });

      const { data: authData, error: createError } = await tempClient.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: { full_name: formData.name },
      });

      if (createError) {
        toast({ title: 'Error', description: createError.message, variant: 'destructive' });
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        toast({ title: 'Error', description: 'Failed to create auth user.', variant: 'destructive' });
        return;
      }

      const { data: customerRecord, error: dbError } = await tempClient
        .from('customers')
        .insert({
          user_id: userId,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          company: formData.company || null,
          country: formData.country,
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (dbError) {
        await tempClient.auth.admin.deleteUser(userId).catch(() => {});
        toast({ title: 'DB Error', description: dbError.message, variant: 'destructive' });
        return;
      }

      const customerId = customerRecord?.id;

      if (customerId && formData.domains && formData.domains.length > 0) {
        const validDomains = formData.domains.filter(d => d.trim());
        if (validDomains.length > 0) {
          const domainRecords = validDomains.map(domainName => ({
            customer_id: customerId,
            domain_name: domainName.trim(),
            status: 'pending',
            created_at: new Date().toISOString(),
          }));

          const { error: domainError } = await tempClient.from('domain_requests').insert(domainRecords);
          if (domainError) {
            console.error('Failed to insert domain requests:', domainError);
          }
        }
      }

      addNotification({ customer_id: null, type: 'customer_added', title: `Customer Added — ${formData.name}`, message: `Admin created new customer account: ${formData.name} (${formData.email}).` }).catch(() => {});
      toast({ title: 'Success', description: `Customer ${formData.name} created successfully.` });
      onSuccess();
      onOpenChange(false);
      setFormData(EMPTY);
    } catch (err) {
      toast({ title: 'Unexpected Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addDomain = () => setFormData({ ...formData, domains: [...formData.domains, ''] });
  const removeDomain = (i) => setFormData({ ...formData, domains: formData.domains.filter((_, idx) => idx !== i).length ? formData.domains.filter((_, idx) => idx !== i) : [''] });
  const updateDomain = (i, v) => { const d = [...formData.domains]; d[i] = v; setFormData({ ...formData, domains: d }); };

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
              <input id="name" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inp} required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inp} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inp} required />
            </div>
            <div>
              <Label htmlFor="country">Country *</Label>
              <input id="country" type="text" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className={inp} required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="company">Company Name</Label>
              <input id="company" type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className={inp} />
            </div>

            {/* Password fields */}
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className={inp + ' pr-10 mt-0'}
                  placeholder="Min. 6 characters"
                  required
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={inp}
                placeholder="Repeat password"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Domains</Label>
              <Button type="button" size="sm" onClick={addDomain} variant="outline" className="rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Add Domain
              </Button>
            </div>
            <div className="space-y-2">
              {formData.domains.map((domain, index) => (
                <div key={index} className="flex gap-2">
                  <input type="text" value={domain} onChange={e => updateDomain(index, e.target.value)} placeholder="example.com" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all text-sm" />
                  {formData.domains.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeDomain(index)} className="hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#e87b35] hover:bg-[#d66a24] text-white shadow-md rounded-xl transition-all font-medium border-0">
              {loading ? 'Creating…' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddCustomerDialog;
