import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { updateProduct } from '@/lib/storage';
import { Info, Shield } from 'lucide-react';

const LICENSE_TYPES = [
  { value: 'one_time', label: 'One Time Purchase', desc: 'Pay once and use forever.' },
  { value: 'yearly', label: 'Yearly Renewal', desc: 'Requires annual renewal to continue using.' },
  { value: 'lifetime', label: 'Lifetime License', desc: 'One-time payment for lifetime updates.' },
];

function EditProductDialog({ open, onOpenChange, product, onSuccess, isDark, c }) {
  const [form, setForm] = useState({
    name: '', type: '', description: '', download_url: '',
    license_type: 'one_time',
    license_registration: true, manual_updates: true, automatic_updates: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        type: product.type || '',
        description: product.description || '',
        download_url: product.download_url || '',
        license_type: product.license_type || 'one_time',
        license_registration: product.license_registration ?? true,
        manual_updates: product.manual_updates ?? true,
        automatic_updates: product.automatic_updates ?? true,
      });
      setErrors({});
    }
  }, [product]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const clearErr = (k) => setErrors(p => ({ ...p, [k]: '' }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required.';
    if (!form.type.trim()) e.type = 'Product type is required.';
    if (!form.download_url.trim()) e.download_url = 'Download URL is required.';
    else if (!/^https?:\/\/.+/.test(form.download_url.trim())) e.download_url = 'Must be a valid URL (e.g., https://example.com/file.zip)';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await updateProduct(product.id, form);
      toast({ title: 'Success', description: 'Product updated successfully' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to update product', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const bg = c?.card || (isDark ? '#1C1E24' : '#fff');
  const panelBg = c?.panel2 || (isDark ? '#22252C' : '#f5f5f5');
  const border = c?.border || (isDark ? 'rgba(255,255,255,0.06)' : '#ebebeb');
  const borderStrong = c?.borderStrong || (isDark ? 'rgba(255,255,255,0.1)' : '#d0d0d0');
  const text = c?.text || (isDark ? '#fff' : '#1a1a1a');
  const sub = c?.subText || (isDark ? '#a0a0a0' : '#888');
  const brand = c?.brand || '#E87B35';
  const brandLight = c?.brandLight || (isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.1)');

  const inputStyle = {
    width: '100%', padding: '9px 13px', borderRadius: 8,
    border: `1px solid ${borderStrong}`, background: panelBg,
    color: text, outline: 'none', fontSize: 14, boxSizing: 'border-box',
  };
  const labelStyle = { color: text, fontWeight: 500, fontSize: 13, display: 'block', marginBottom: 5 };
  const errStyle = { color: '#f87171', fontSize: 12, marginTop: 3 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ background: bg, color: text, border: `1px solid ${border}`, maxWidth: 720, borderRadius: 12 }}
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle style={{ color: text, fontSize: 17, fontWeight: 600 }}>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input style={inputStyle} placeholder="Enter product name" value={form.name}
                  onChange={e => { set('name', e.target.value); clearErr('name'); }} />
                {errors.name && <p style={errStyle}>{errors.name}</p>}
              </div>
              <div>
                <label style={labelStyle}>Product Type *</label>
                <input style={inputStyle} placeholder="e.g., WordPress Plugin, SaaS, Theme" value={form.type}
                  onChange={e => { set('type', e.target.value); clearErr('type'); }} />
                {errors.type && <p style={errStyle}>{errors.type}</p>}
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 78 }}
                  placeholder="Enter product description (optional)"
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Product Download URL *</label>
                <input style={inputStyle} placeholder="https://example.com/download" value={form.download_url}
                  onChange={e => { set('download_url', e.target.value); clearErr('download_url'); }} />
                {errors.download_url && <p style={errStyle}>{errors.download_url}</p>}
                <p style={{ color: sub, fontSize: 12, marginTop: 3 }}>Must be a valid URL (e.g., https://example.com/file.zip)</p>
              </div>
              <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 8, padding: 12, display: 'flex', gap: 8 }}>
                <Info className="w-4 h-4 flex-shrink-0" style={{ color: brand, marginTop: 1 }} />
                <div>
                  <p style={{ color: text, fontWeight: 500, fontSize: 13 }}>Note</p>
                  <p style={{ color: sub, fontSize: 12 }}>The download URL will be used by customers to download your product.</p>
                </div>
              </div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>License Type *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {LICENSE_TYPES.map(lt => (
                    <label key={lt.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                      padding: '10px 12px', borderRadius: 8,
                      border: `1px solid ${form.license_type === lt.value ? brand : border}`,
                      background: form.license_type === lt.value ? brandLight : 'transparent',
                      transition: 'all 0.15s',
                    }}>
                      <input type="radio" name="edit_license_type" value={lt.value}
                        checked={form.license_type === lt.value}
                        onChange={() => set('license_type', lt.value)}
                        style={{ marginTop: 2, accentColor: brand }} />
                      <div>
                        <p style={{ color: text, fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{lt.label}</p>
                        <p style={{ color: sub, fontSize: 12 }}>{lt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {[
                { key: 'license_registration', label: 'License Registration', desc: 'Require users to register a license key.' },
                { key: 'manual_updates', label: 'Manual Updates', desc: 'Allow users to manually check and install updates.' },
                { key: 'automatic_updates', label: 'Automatic Updates', desc: 'Allow automatic updates for the product.' },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ color: text, fontWeight: 500, fontSize: 14 }}>{item.label}</p>
                    <p style={{ color: sub, fontSize: 12 }}>{item.desc}</p>
                  </div>
                  <Switch checked={form[item.key]} onCheckedChange={v => set(item.key, v)} />
                </div>
              ))}

              <div style={{ background: brandLight, border: `1px solid ${brand}`, borderRadius: 8, padding: 12, display: 'flex', gap: 8 }}>
                <Shield className="w-4 h-4 flex-shrink-0" style={{ color: brand, marginTop: 1 }} />
                <div>
                  <p style={{ color: brand, fontWeight: 600, fontSize: 13 }}>Features</p>
                  <p style={{ color: sub, fontSize: 12 }}>These settings can be changed later from the product settings.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${border}` }}>
            <button type="button" onClick={() => onOpenChange(false)}
              style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${borderStrong}`, background: 'transparent', color: text, cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving…' : 'Update Product'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditProductDialog;
