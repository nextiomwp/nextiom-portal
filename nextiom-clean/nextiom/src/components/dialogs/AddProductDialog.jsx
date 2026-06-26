import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { addProduct, addNotification } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';
import { Download, Layers, Shield, RefreshCw, X, Loader2, Check, Package, Key } from 'lucide-react';

const generateCustomKey = () => {
  return 'PROD-XXXX-XXXX-XXXX'.replace(/X/g, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.random() * 36 | 0]);
};

export default function AddProductDialog({ open, onOpenChange, onSuccess, isDark, c }) {
  const [customForm, setCustomForm] = useState({
    name: '',
    description: '',
    price: '0.00',
    currency: 'USD',
    category: 'digital', // 'digital' or 'virtual'
    type: 'Plugin',
    downloadUrl: '',
    accessMethod: 'license_auto', // 'license_auto', 'manual_no_license', 'one_time'
    duration: 'yearly', // 'monthly', 'yearly', 'lifetime'
    imageUrl: '',
    hasRenewal: false,
    renewalPercentage: '',
    licenseKey: '',
    version: '1.0.0',
    note: '',
    documentation: ''
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const prevOpenRef = useRef(false);

  const getRenewalPrice = () => {
    const basePrice = parseFloat(customForm.price) || 0;
    const pct = parseFloat(customForm.renewalPercentage) || 0;
    return (basePrice * (1 + pct / 100)).toFixed(2);
  };

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setCustomForm({
        name: '',
        description: '',
        price: '0.00',
        currency: 'USD',
        category: 'digital',
        type: 'Plugin',
        downloadUrl: '',
        accessMethod: 'license_auto',
        duration: 'yearly',
        imageUrl: '',
        hasRenewal: false,
        renewalPercentage: '',
        licenseKey: generateCustomKey(),
        version: '1.0.0',
        note: '',
        documentation: ''
      });
    }
    prevOpenRef.current = open;
  }, [open]);

  // Disable renewal if access method is one_time
  useEffect(() => {
    if (customForm.accessMethod === 'one_time') {
      setCustomForm(prev => prev.hasRenewal ? { ...prev, hasRenewal: false } : prev);
    }
  }, [customForm.accessMethod]);

  if (!open) return null;

  // Theme Config matching the admin system
  const theme = c || {
    bg: '#15161A',
    sidebar: '#1C1E24',
    border: 'rgba(255,255,255,0.06)',
    borderStrong: 'rgba(255,255,255,0.10)',
    text: '#fff',
    subText: '#a0a0a0',
    card: '#1C1E24',
    panel2: '#22252C',
    hover: 'rgba(255,255,255,0.04)',
    brand: 'var(--brand-color)',
  };

  const text = theme.text || '#fff';
  const subText = theme.subText || '#a0a0a0';
  const card = theme.card || '#1C1E24';
  const border = theme.border || 'rgba(255,255,255,0.06)';
  const borderStrong = theme.borderStrong || 'rgba(255,255,255,0.10)';
  const brand = theme.brand || 'var(--brand-color)';
  const inputBg = theme.input || (theme.bg === '#15161A' ? '#22252C' : '#fff');
  const panel = theme.panel2 || '#22252C';
  const overlay = 'rgba(0,0,0,0.6)';

  const inpS = {
    width: '100%',
    padding: '8px 12px',
    border: `1.5px solid ${border}`,
    borderRadius: 8,
    background: inputBg,
    color: text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  };

  const labelS = {
    fontSize: 11,
    fontWeight: 650,
    color: subText,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customForm.name.trim()) {
      toast({ title: 'Validation Error', description: 'Product name is required', variant: 'destructive' });
      return;
    }
    if (customForm.category === 'digital' && !customForm.downloadUrl.trim()) {
      toast({ title: 'Validation Error', description: 'Download URL is required for digital products', variant: 'destructive' });
      return;
    }
    if (!customForm.type.trim()) {
      toast({ title: 'Validation Error', description: 'Product type is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const productPayload = {
        name: customForm.name.trim(),
        description: customForm.description?.trim() || null,
        price: parseFloat(customForm.price) || 0,
        currency: customForm.currency || 'USD',
        type: customForm.type.trim(),
        download_url: customForm.category === 'digital' ? customForm.downloadUrl.trim() : null,
        category: customForm.category,
        image_url: null,
        license_key: customForm.licenseKey.trim() || null,
        license_type: customForm.accessMethod === 'one_time' ? null : customForm.duration,
        license_registration: customForm.accessMethod === 'license_auto',
        automatic_updates: customForm.accessMethod === 'license_auto',
        manual_updates: customForm.accessMethod === 'manual_no_license',
        renewal_enabled: customForm.hasRenewal,
        renewal_price: customForm.hasRenewal ? (parseFloat(getRenewalPrice()) || 0) : (parseFloat(customForm.price) || 0),
        renewal_period_days: customForm.duration === 'monthly' ? 30 : (customForm.duration === 'yearly' ? 365 : null),
        version: customForm.version.trim() || null,
        note: customForm.note.trim() || null,
        documentation: customForm.documentation.trim() || null,
        created_at: new Date().toISOString()
      };

      await addProduct(productPayload);
      addNotification({ customer_id: null, type: 'product_added', title: `Product Added — ${productPayload.name}`, message: `Admin added a new product: "${productPayload.name}" (${productPayload.category || 'digital'}).` }).catch(() => {});
      
      toast({ title: 'Success', description: 'Product added successfully' });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to add product', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: overlay,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          background: card,
          border: `1px solid ${borderStrong}`,
          borderRadius: 16,
          width: '100%',
          maxWidth: 960,
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'max-width 0.2s ease',
          margin: 'auto'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: `1px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: text }}>Add New Product</div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: subText,
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', gap: 24, overflowY: 'auto', maxHeight: '70vh' }}>
            {/* Left Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Product Icon Preview */}
              <div>
                <label style={labelS}>Product Icon</label>
                <div
                  style={{
                    height: 120,
                    border: `1.5px solid ${borderStrong}`,
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${brand}15, ${brand}05)`,
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${brand}, ${brand}dd)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 4px 12px ${brand}40`,
                    }}
                  >
                    {customForm.category === 'virtual' ? (
                      <Layers size={22} style={{ color: '#fff' }} />
                    ) : (
                      <Package size={22} style={{ color: '#fff' }} />
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: text }}>
                    {customForm.category === 'virtual' ? 'Virtual Service Icon' : 'Digital Product Icon'}
                  </span>
                </div>
              </div>

              <div>
                <label style={labelS}>Product Name *</label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={customForm.name}
                  onChange={(e) => setCustomForm(p => ({ ...p, name: e.target.value }))}
                  style={inpS}
                />
              </div>

              <div>
                <label style={labelS}>Product Category *</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {/* Digital Product Button */}
                  <div
                    onClick={() => setCustomForm(p => ({ ...p, category: 'digital' }))}
                    style={{
                      flex: 1, padding: '16px 12px', borderRadius: 12,
                      border: `2px solid ${customForm.category === 'digital' ? brand : border}`,
                      background: customForm.category === 'digital' ? `${brand}12` : panel,
                      cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: customForm.category === 'digital' ? brand : borderStrong,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Download size={15} style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: text }}>Digital Product</div>
                      <div style={{ fontSize: 10.5, color: subText, marginTop: 2 }}>Downloadable product. License options available.</div>
                    </div>
                  </div>

                  {/* Virtual Service Button */}
                  <div
                    onClick={() => setCustomForm(p => ({ ...p, category: 'virtual' }))}
                    style={{
                      flex: 1, padding: '16px 12px', borderRadius: 12,
                      border: `2px solid ${customForm.category === 'virtual' ? brand : border}`,
                      background: customForm.category === 'virtual' ? `${brand}12` : panel,
                      cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: customForm.category === 'virtual' ? brand : borderStrong,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Layers size={15} style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: text }}>Virtual Service</div>
                      <div style={{ fontSize: 10.5, color: subText, marginTop: 2 }}>Non-downloadable service. No download URL required.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...labelS, marginBottom: 0 }}>Product Price *</label>
                  <div style={{ display: 'flex', gap: 4, background: panel, padding: 2, borderRadius: 6, border: `1px solid ${borderStrong}` }}>
                    {['USD', 'LKR'].map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setCustomForm(p => ({ ...p, currency: curr }))}
                        style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: customForm.currency === curr ? brand : 'transparent',
                          color: customForm.currency === curr ? '#fff' : subText,
                          border: 'none', cursor: 'pointer', transition: 'all 0.1s ease'
                        }}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13 }}>
                    {customForm.currency === 'LKR' ? 'Rs.' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={customForm.price}
                    onChange={(e) => setCustomForm(p => ({ ...p, price: e.target.value }))}
                    style={{ ...inpS, paddingLeft: customForm.currency === 'LKR' ? 34 : 24 }}
                  />
                </div>

                {/* Renewal Option */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, opacity: customForm.accessMethod === 'one_time' ? 0.5 : 1 }}>
                  <input
                    type="checkbox"
                    id="has-renewal"
                    disabled={customForm.accessMethod === 'one_time'}
                    checked={customForm.hasRenewal}
                    onChange={(e) => setCustomForm(p => ({ ...p, hasRenewal: e.target.checked }))}
                    style={{
                      width: 15,
                      height: 15,
                      accentColor: brand,
                      cursor: customForm.accessMethod === 'one_time' ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <label
                    htmlFor="has-renewal"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: text,
                      cursor: customForm.accessMethod === 'one_time' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Enable Renewal (Yes / No) {customForm.accessMethod === 'one_time' && <span style={{ fontSize: 11, fontWeight: 500, color: subText }}>(Disabled for One-Time Purchase)</span>}
                  </label>
                </div>

                {customForm.hasRenewal && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelS, marginBottom: 6 }}>Renewal Percentage (%)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={customForm.renewalPercentage}
                        onChange={(e) => setCustomForm(p => ({ ...p, renewalPercentage: e.target.value }))}
                        style={inpS}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelS, marginBottom: 6 }}>Renewal Price</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13 }}>
                          {customForm.currency === 'LKR' ? 'Rs.' : '$'}
                        </span>
                        <input
                          type="text"
                          readOnly
                          value={getRenewalPrice()}
                          style={{ ...inpS, paddingLeft: customForm.currency === 'LKR' ? 34 : 24, opacity: 0.7, cursor: 'not-allowed' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={labelS}>Description</label>
                <textarea
                  placeholder="Enter product description (optional)"
                  value={customForm.description}
                  onChange={(e) => setCustomForm(p => ({ ...p, description: e.target.value }))}
                  style={{ ...inpS, minHeight: 80 }}
                />
              </div>

              <div>
                <label style={labelS}>Note</label>
                <textarea
                  placeholder="Enter order note (optional)"
                  value={customForm.note}
                  onChange={(e) => setCustomForm(p => ({ ...p, note: e.target.value }))}
                  style={{ ...inpS, minHeight: 60 }}
                />
              </div>

              <div>
                <label style={labelS}>Documentation Link</label>
                <input
                  type="text"
                  placeholder="e.g., https://docs.example.com"
                  value={customForm.documentation}
                  onChange={(e) => setCustomForm(p => ({ ...p, documentation: e.target.value }))}
                  style={inpS}
                />
              </div>
            </div>

            {/* Right Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelS}>Product Type *</label>
                <input
                  type="text"
                  placeholder="e.g., Plugin, SaaS, Theme, Service"
                  value={customForm.type}
                  onChange={(e) => setCustomForm(p => ({ ...p, type: e.target.value }))}
                  style={inpS}
                />
              </div>

              <div>
                <label style={labelS}>Version</label>
                <input
                  type="text"
                  placeholder="e.g., 1.0.0"
                  value={customForm.version}
                  onChange={(e) => setCustomForm(p => ({ ...p, version: e.target.value }))}
                  style={inpS}
                />
              </div>

              <div>
                <label style={labelS}>License Key *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Auto-generated or custom key"
                    value={customForm.licenseKey}
                    onChange={(e) => setCustomForm(p => ({ ...p, licenseKey: e.target.value }))}
                    style={inpS}
                  />
                  <button
                    type="button"
                    onClick={() => setCustomForm(p => ({ ...p, licenseKey: generateCustomKey() }))}
                    style={{
                      background: brand,
                      color: '#fff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    <Key size={14} />
                    Generate
                  </button>
                </div>
              </div>

              {customForm.category === 'digital' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ ...labelS, marginBottom: 0 }}>Product Download URL</label>
                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>Only for Digital Product</span>
                  </div>
                  <input
                    type="text"
                    placeholder="https://example.com/download"
                    value={customForm.downloadUrl}
                    onChange={(e) => setCustomForm(p => ({ ...p, downloadUrl: e.target.value }))}
                    style={inpS}
                  />
                  <p style={{ fontSize: 11, color: subText, marginTop: 4 }}>Provide a valid URL (e.g., https://example.com/file.zip)</p>
                </div>
              )}

              <div>
                <label style={labelS}>Service Plan *</label>
                <p style={{ fontSize: 11, color: subText, marginTop: -4, marginBottom: 12 }}>Choose how customers will get access and receive updates.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Option 1: License + Auto Updates */}
                  <div
                    style={{
                      border: `1.5px solid ${customForm.accessMethod === 'license_auto' ? '#818cf8' : border}`,
                      borderRadius: 12, padding: 16, background: customForm.accessMethod === 'license_auto' ? 'rgba(129,140,248,0.04)' : panel,
                      cursor: 'pointer'
                    }}
                    onClick={() => setCustomForm(p => ({ ...p, accessMethod: 'license_auto', duration: 'yearly' }))}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input type="radio" checked={customForm.accessMethod === 'license_auto'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#818cf8' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Shield size={14} style={{ color: '#818cf8' }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: text }}>License Registration + Automatic Updates</span>
                        </div>
                        <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>Customers get a license and automatic updates.</div>
                      </div>
                    </div>

                    {customForm.accessMethod === 'license_auto' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {['monthly', 'yearly', 'lifetime'].map(dur => {
                          const active = customForm.duration === dur;
                          const label = dur === 'monthly' ? 'Monthly Subscription' : dur === 'yearly' ? 'Yearly Subscription' : 'Lifetime License';
                          return (
                            <button
                              key={dur} type="button" onClick={(e) => { e.stopPropagation(); setCustomForm(p => ({ ...p, duration: dur })); }}
                              style={{
                                flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: 600, borderRadius: 8,
                                border: `1.5px solid ${active ? '#818cf8' : borderStrong}`,
                                background: active ? '#818cf8' : 'transparent',
                                color: active ? '#fff' : text, cursor: 'pointer'
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Option 2: Manual Updates */}
                  <div
                    style={{
                      border: `1.5px solid ${customForm.accessMethod === 'manual_no_license' ? '#60a5fa' : border}`,
                      borderRadius: 12, padding: 16, background: customForm.accessMethod === 'manual_no_license' ? 'rgba(96,165,250,0.04)' : panel,
                      cursor: 'pointer'
                    }}
                    onClick={() => setCustomForm(p => ({ ...p, accessMethod: 'manual_no_license', duration: 'yearly' }))}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input type="radio" checked={customForm.accessMethod === 'manual_no_license'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#60a5fa' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <RefreshCw size={14} style={{ color: '#60a5fa' }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Manual Updates (No License Required)</span>
                        </div>
                        <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>Customers get access but updates are manual.</div>
                      </div>
                    </div>

                    {customForm.accessMethod === 'manual_no_license' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {['monthly', 'yearly', 'lifetime'].map(dur => {
                          const active = customForm.duration === dur;
                          const label = dur === 'monthly' ? 'Monthly Access' : dur === 'yearly' ? 'Yearly Access' : 'Lifetime Access';
                          return (
                            <button
                              key={dur} type="button" onClick={(e) => { e.stopPropagation(); setCustomForm(p => ({ ...p, duration: dur })); }}
                              style={{
                                flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: 600, borderRadius: 8,
                                border: `1.5px solid ${active ? '#60a5fa' : borderStrong}`,
                                background: active ? '#60a5fa' : 'transparent',
                                color: active ? '#fff' : text, cursor: 'pointer'
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Option 3: One-Time Purchase */}
                  <div
                    style={{
                      border: `1.5px solid ${customForm.accessMethod === 'one_time' ? '#22c55e' : border}`,
                      borderRadius: 12, padding: 16, background: customForm.accessMethod === 'one_time' ? 'rgba(34,197,94,0.04)' : panel,
                      cursor: 'pointer'
                    }}
                    onClick={() => setCustomForm(p => ({ ...p, accessMethod: 'one_time', duration: null }))}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input type="radio" checked={customForm.accessMethod === 'one_time'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#22c55e' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Check size={14} style={{ color: '#22c55e' }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: text }}>One-Time Purchase</span>
                        </div>
                        <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>No updates, no license registration needed.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: `1.5px solid ${borderStrong}`,
                background: 'transparent',
                color: text,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: brand,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Adding…' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
