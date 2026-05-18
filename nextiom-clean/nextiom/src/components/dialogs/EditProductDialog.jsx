import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { updateProduct, uploadProductImage } from '@/lib/storage';
import { Upload, Download, Layers, X } from 'lucide-react';

const LICENSE_TYPES = [
  { value: 'one_time', label: 'One Time Purchase', desc: 'Pay once and use forever.' },
  { value: 'yearly', label: 'Yearly Renewal', desc: 'Requires annual renewal to continue using.' },
  { value: 'lifetime', label: 'Lifetime License', desc: 'One-time payment for lifetime updates.' },
];

const calcRenewalPrice = (basePrice, pct) => {
  const p = parseFloat(basePrice);
  const pp = parseFloat(pct);
  if (!isNaN(p) && !isNaN(pp) && p >= 0) return (p * (1 + pp / 100)).toFixed(2);
  return null;
};

export default function EditProductDialog({ open, onOpenChange, product, onSuccess, isDark, c }) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef();
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        type: product.type || '',
        description: product.description || '',
        price: product.price ?? '',
        category: product.category || 'digital',
        download_url: product.download_url || '',
        license_type: product.license_type || 'one_time',
        license_registration: product.license_registration ?? true,
        manual_updates: product.manual_updates ?? true,
        automatic_updates: product.automatic_updates ?? true,
        renewal_enabled: product.renewal_enabled ?? false,
        renewal_price: product.renewal_price ?? '',
        renewal_date: product.renewal_date || '',
        renewal_period_days: product.renewal_period_days ?? 365,
        renewal_percentage: '',
        yearly_renewal_percentage: '',
        image_url: product.image_url || '',
      });
      setImageFile(null);
      setImagePreview(product.image_url || '');
      setErrors({});
    }
  }, [product]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const clearErr = (k) => setErrors(p => ({ ...p, [k]: '' }));

  const handleImageChange = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 2MB', variant: 'destructive' }); return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Product name is required.';
    if (!form.type?.trim()) e.type = 'Product type is required.';
    if (form.price === '' || isNaN(parseFloat(form.price))) e.price = 'Price is required.';
    if (form.category === 'digital') {
      if (!form.download_url?.trim()) e.download_url = 'Download URL is required for digital products.';
      else if (!/^https?:\/\/.+/.test(form.download_url.trim())) e.download_url = 'Must be a valid URL.';
    }
    if (form.category === 'virtual') {
      if (!form.renewal_date) e.renewal_date = 'Renewal date is required for virtual products.';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      let image_url = form.image_url;
      if (imageFile) image_url = await uploadProductImage(imageFile);
      const isDigital = form.category === 'digital';
      const updates = {
        name: form.name.trim(),
        type: form.type.trim(),
        description: form.description?.trim() || '',
        price: parseFloat(form.price) || 0,
        category: form.category,
        image_url: image_url || null,
        download_url: isDigital ? form.download_url.trim() : null,
        license_type: isDigital ? form.license_type : null,
        license_registration: isDigital ? form.license_registration : false,
        manual_updates: isDigital ? form.manual_updates : false,
        automatic_updates: isDigital ? form.automatic_updates : false,
        renewal_enabled: !isDigital ? form.renewal_enabled : false,
        renewal_price: (() => {
          if (!isDigital && form.renewal_enabled) {
            if (form.renewal_percentage !== '') {
              const calc = calcRenewalPrice(form.price, form.renewal_percentage);
              return calc ? parseFloat(calc) : null;
            }
            return form.renewal_price !== '' ? parseFloat(form.renewal_price) : null;
          }
          if (isDigital && form.license_type === 'yearly' && form.yearly_renewal_percentage !== '') {
            const calc = calcRenewalPrice(form.price, form.yearly_renewal_percentage);
            return calc ? parseFloat(calc) : null;
          }
          return null;
        })(),
        renewal_date: !isDigital ? form.renewal_date || null : null,
        renewal_period_days: !isDigital ? parseInt(form.renewal_period_days) || 365 : null,
      };
      await updateProduct(product.id, updates);
      toast({ title: 'Success', description: 'Product updated successfully.' });
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

  const input = {
    width: '100%', padding: '9px 13px', borderRadius: 8,
    border: `1px solid ${borderStrong}`, background: panelBg,
    color: text, outline: 'none', fontSize: 14, boxSizing: 'border-box',
  };
  const lbl = { color: text, fontWeight: 500, fontSize: 13, display: 'block', marginBottom: 5 };
  const errSt = { color: '#f87171', fontSize: 12, marginTop: 3 };

  const isDigital = form.category === 'digital';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ background: bg, color: text, border: `1px solid ${border}`, maxWidth: 760, borderRadius: 12 }}
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle style={{ color: text, fontSize: 17, fontWeight: 600 }}>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Image upload */}
              <div>
                <label style={lbl}>Product Image</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageChange(e.dataTransfer.files[0]); }}
                  style={{
                    height: 90, border: `2px dashed ${borderStrong}`, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', background: panelBg, position: 'relative', overflow: 'hidden',
                  }}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="" style={{ height: '100%', objectFit: 'cover', width: '100%' }} />
                      <button type="button" onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(''); set('image_url', ''); }}
                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 3, color: '#fff', display: 'flex' }}>
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <Upload size={22} style={{ color: sub, margin: '0 auto 4px' }} />
                      <p style={{ color: sub, fontSize: 12 }}>Click to upload or drag and drop</p>
                      <p style={{ color: sub, fontSize: 11 }}>PNG, JPG, WEBP (Max. 2MB)</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                  onChange={e => handleImageChange(e.target.files[0])} />
              </div>

              <div>
                <label style={lbl}>Product Name *</label>
                <input style={input} placeholder="Enter product name" value={form.name || ''}
                  onChange={e => { set('name', e.target.value); clearErr('name'); }} />
                {errors.name && <p style={errSt}>{errors.name}</p>}
              </div>

              {/* Category */}
              <div>
                <label style={lbl}>Product Category *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                  {[
                    { value: 'digital', label: 'Digital Product', desc: 'Downloadable product with license', Icon: Download },
                    { value: 'virtual', label: 'Virtual Product', desc: 'Non-downloadable product or service', Icon: Layers },
                  ].map(({ value, label, desc, Icon }) => (
                    <label key={value} onClick={() => set('category', value)} style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${form.category === value ? brand : borderStrong}`,
                      background: form.category === value ? brandLight : 'transparent',
                      display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 0.15s',
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: form.category === value ? brandLight : panelBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} style={{ color: form.category === value ? brand : sub }} />
                      </div>
                      <div>
                        <p style={{ color: form.category === value ? brand : text, fontWeight: 600, fontSize: 13, margin: 0 }}>{label}</p>
                        <p style={{ color: sub, fontSize: 11, marginTop: 2 }}>{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Product Price *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: sub, fontSize: 14 }}>$</span>
                  <input style={{ ...input, paddingLeft: 28 }} placeholder="0.00" type="number" min="0" step="0.01"
                    value={form.price ?? ''} onChange={e => { set('price', e.target.value); clearErr('price'); }} />
                </div>
                {errors.price && <p style={errSt}>{errors.price}</p>}
              </div>

              <div>
                <label style={lbl}>Description</label>
                <textarea style={{ ...input, resize: 'vertical', minHeight: 72 }} placeholder="Enter product description (optional)"
                  value={form.description || ''} onChange={e => set('description', e.target.value)} />
              </div>

              {isDigital && (
                <>
                  <div>
                    <label style={lbl}>License Type *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                      {LICENSE_TYPES.map(lt => (
                        <label key={lt.value} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                          padding: '9px 12px', borderRadius: 8,
                          border: `1px solid ${form.license_type === lt.value ? brand : border}`,
                          background: form.license_type === lt.value ? brandLight : 'transparent',
                        }}>
                          <input type="radio" name="edit_license_type" value={lt.value}
                            checked={form.license_type === lt.value}
                            onChange={() => set('license_type', lt.value)}
                            style={{ marginTop: 2, accentColor: brand }} />
                          <div>
                            <p style={{ color: text, fontWeight: 500, fontSize: 13, marginBottom: 1 }}>{lt.label}</p>
                            <p style={{ color: sub, fontSize: 12 }}>{lt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                </>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Product Type *</label>
                <input style={input} placeholder="e.g., Plugin, SaaS, Theme, Service" value={form.type || ''}
                  onChange={e => { set('type', e.target.value); clearErr('type'); }} />
                {errors.type && <p style={errSt}>{errors.type}</p>}
              </div>

              {isDigital && (
                <>
                  <div>
                    <label style={lbl}>Product Download URL *</label>
                    <input style={input} placeholder="https://example.com/download" value={form.download_url || ''}
                      onChange={e => { set('download_url', e.target.value); clearErr('download_url'); }} />
                    {errors.download_url && <p style={errSt}>{errors.download_url}</p>}
                    <p style={{ color: sub, fontSize: 12, marginTop: 3 }}>Must be a valid URL.</p>
                  </div>
                  {[
                    { key: 'license_registration', label: 'License Registration (Digital Only)', desc: 'Require users to register a license key.' },
                    { key: 'manual_updates', label: 'Manual Updates (Digital Only)', desc: 'Allow users to manually check and install updates.' },
                    { key: 'automatic_updates', label: 'Automatic Updates (Digital Only)', desc: 'Allow automatic updates for the product.' },
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ color: text, fontWeight: 500, fontSize: 13 }}>{item.label}</p>
                        <p style={{ color: sub, fontSize: 12 }}>{item.desc}</p>
                      </div>
                      <Switch checked={!!form[item.key]} onCheckedChange={v => set(item.key, v)} />
                    </div>
                  ))}

                  {form.license_type === 'yearly' && (
                    <div style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 14, background: panelBg }}>
                      <p style={{ color: text, fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Yearly Renewal Pricing</p>
                      <label style={lbl}>Renewal Markup (%)</label>
                      <div style={{ position: 'relative' }}>
                        <input style={{ ...input, paddingRight: 28 }} placeholder="e.g. 10" type="number" min="0" step="0.1"
                          value={form.yearly_renewal_percentage ?? ''}
                          onChange={e => set('yearly_renewal_percentage', e.target.value)} />
                        <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: sub, fontSize: 14 }}>%</span>
                      </div>
                      {form.renewal_price != null && form.yearly_renewal_percentage === '' && (
                        <p style={{ color: sub, fontSize: 12, marginTop: 4 }}>Current renewal: ${form.renewal_price} — enter % to recalculate</p>
                      )}
                      {(() => {
                        const calc = calcRenewalPrice(form.price, form.yearly_renewal_percentage);
                        return calc ? (
                          <div style={{ marginTop: 8, padding: '7px 12px', borderRadius: 7, background: brandLight, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: sub, fontSize: 12 }}>Calculated renewal price</span>
                            <span style={{ color: brand, fontWeight: 700, fontSize: 14 }}>${calc}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </>
              )}

              {!isDigital && (
                <>
                  <div>
                    <label style={lbl}>Renewal Date (Virtual Only) *</label>
                    <input style={input} type="date" value={form.renewal_date || ''}
                      onChange={e => { set('renewal_date', e.target.value); clearErr('renewal_date'); }} />
                    {errors.renewal_date && <p style={errSt}>{errors.renewal_date}</p>}
                  </div>
                  <div>
                    <label style={lbl}>Validity Period (Days)</label>
                    <input style={input} type="number" min="1" placeholder="365" value={form.renewal_period_days ?? 365}
                      onChange={e => set('renewal_period_days', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ color: text, fontWeight: 500, fontSize: 13 }}>Enable Renewal</p>
                      <p style={{ color: sub, fontSize: 12 }}>Allow subscription renewal.</p>
                    </div>
                    <Switch checked={!!form.renewal_enabled} onCheckedChange={v => set('renewal_enabled', v)} />
                  </div>
                  {form.renewal_enabled && (
                    <div>
                      <label style={lbl}>Renewal Markup (%)</label>
                      <div style={{ position: 'relative' }}>
                        <input style={{ ...input, paddingRight: 28 }} placeholder="e.g. 10" type="number" min="0" step="0.1"
                          value={form.renewal_percentage ?? ''} onChange={e => set('renewal_percentage', e.target.value)} />
                        <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: sub, fontSize: 14 }}>%</span>
                      </div>
                      {form.renewal_price != null && form.renewal_percentage === '' && (
                        <p style={{ color: sub, fontSize: 12, marginTop: 4 }}>Current renewal: ${form.renewal_price} — enter % to recalculate</p>
                      )}
                      {(() => {
                        const calc = calcRenewalPrice(form.price, form.renewal_percentage);
                        return calc ? (
                          <div style={{ marginTop: 6, padding: '7px 12px', borderRadius: 7, background: brandLight, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: sub, fontSize: 12 }}>Calculated renewal price</span>
                            <span style={{ color: brand, fontWeight: 700, fontSize: 14 }}>${calc}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </>
              )}

              <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 8, padding: 12, marginTop: 'auto' }}>
                <p style={{ color: brand, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Note</p>
                <p style={{ color: sub, fontSize: 12 }}>
                  {isDigital
                    ? 'Digital products require download URL and license settings.'
                    : 'Virtual products require renewal date and can have renewal pricing.'}
                </p>
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
