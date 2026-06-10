import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, Upload, Download, Layers, Shield, RefreshCw, Zap, Calendar, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { updateProduct, updateLicense, uploadProductImage } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';

const generateCustomKey = () => {
  return 'PROD-XXXX-XXXX-XXXX'.replace(/X/g, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.random() * 36 | 0]);
};

function processCustomProductPayload({ category, access_method, duration, start_date, license_key }) {
  let finalDuration = duration;
  if (access_method === 'one_time') {
    finalDuration = null;
  } else {
    if (!duration) {
      throw new Error(`Duration cannot be null for access method: ${access_method}`);
    }
  }

  let finalLicenseKey = null;
  let finalStartDate = null;
  let finalExpiryDate = null;
  let systemBadge = '';

  if (access_method === 'license_auto') {
    finalLicenseKey = license_key || generateCustomKey();
    finalStartDate = start_date ? new Date(start_date).toISOString() : new Date().toISOString();
    
    if (finalDuration === 'monthly') {
      const d = new Date(finalStartDate);
      d.setDate(d.getDate() + 30);
      finalExpiryDate = d.toISOString();
      systemBadge = 'Monthly Subscription';
    } else if (finalDuration === 'yearly') {
      const d = new Date(finalStartDate);
      d.setFullYear(d.getFullYear() + 1);
      finalExpiryDate = d.toISOString();
      systemBadge = 'Yearly Subscription';
    } else if (finalDuration === 'lifetime') {
      finalExpiryDate = null;
      systemBadge = 'Lifetime License, Never Expires';
    }
  } else if (access_method === 'manual_no_license') {
    finalLicenseKey = null;
    finalStartDate = start_date ? new Date(start_date).toISOString() : new Date().toISOString();

    if (finalDuration === 'monthly') {
      const d = new Date(finalStartDate);
      d.setDate(d.getDate() + 30);
      finalExpiryDate = d.toISOString();
      systemBadge = 'Manual Updates Monthly';
    } else if (finalDuration === 'yearly') {
      const d = new Date(finalStartDate);
      d.setFullYear(d.getFullYear() + 1);
      finalExpiryDate = d.toISOString();
      systemBadge = 'Manual Updates Yearly';
    } else if (finalDuration === 'lifetime') {
      finalExpiryDate = null;
      systemBadge = 'Lifetime Manual Updates';
    }
  } else if (access_method === 'one_time') {
    finalLicenseKey = null;
    finalStartDate = null;
    finalExpiryDate = null;
    systemBadge = 'One-Time Purchase, No License, No Updates';
  }

  return {
    license_key: finalLicenseKey,
    start_date: finalStartDate,
    expiry_date: finalExpiryDate,
    membership_type: systemBadge,
    license_type: finalDuration
  };
}

export default function EditAssignedProductDialog({ open, onOpenChange, license, product, customer, onSuccess, c }) {
  const [customForm, setCustomForm] = useState({
    name: '',
    description: '',
    price: '0.00',
    category: 'digital',
    type: 'Plugin',
    downloadUrl: '',
    accessMethod: 'license_auto',
    duration: 'yearly',
    imageUrl: ''
  });

  const [assignForm, setAssignForm] = useState({
    licenseKey: '',
    status: 'Active',
    startDate: '',
    expiryDate: ''
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product && license && open) {
      const initialAccessMethod = product.license_registration || product.automatic_updates
        ? 'license_auto'
        : (product.manual_updates ? 'manual_no_license' : 'one_time');

      setCustomForm({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '0.00',
        category: product.category || 'digital',
        type: product.type || 'Plugin',
        downloadUrl: product.download_url || '',
        accessMethod: initialAccessMethod,
        duration: product.license_type || 'yearly',
        imageUrl: product.image_url || ''
      });

      setAssignForm({
        licenseKey: license.license_key || '',
        status: license.status || 'Active',
        startDate: license.start_date ? license.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: license.expiry_date ? license.expiry_date.split('T')[0] : ''
      });
    }
  }, [product, license, open]);

  // Expiry Date Auto-Calculation logic
  useEffect(() => {
    if (customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime') {
      setAssignForm(prev => ({ ...prev, expiryDate: '' }));
      return;
    }
    const start = new Date(assignForm.startDate);
    if (isNaN(start.getTime())) return;
    
    if (customForm.duration === 'monthly') {
      const d = new Date(start);
      d.setDate(d.getDate() + 30);
      setAssignForm(prev => ({ ...prev, expiryDate: d.toISOString().split('T')[0] }));
    } else if (customForm.duration === 'yearly') {
      const d = new Date(start);
      d.setFullYear(d.getFullYear() + 1);
      setAssignForm(prev => ({ ...prev, expiryDate: d.toISOString().split('T')[0] }));
    }
  }, [assignForm.startDate, customForm.duration, customForm.accessMethod]);

  if (!open || !product || !license) return null;

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
    brand: '#e87b35',
  };

  const text = theme.text || '#fff';
  const subText = theme.subText || '#a0a0a0';
  const card = theme.card || '#1C1E24';
  const border = theme.border || 'rgba(255,255,255,0.06)';
  const borderStrong = theme.borderStrong || 'rgba(255,255,255,0.10)';
  const brand = theme.brand || '#e87b35';
  const input = theme.input || (theme.bg === '#15161A' ? '#22252C' : '#fff');
  const panel = theme.panel2 || '#22252C';
  const overlay = 'rgba(0,0,0,0.6)';

  const inpS = {
    width: '100%',
    padding: '8px 12px',
    border: `1.5px solid ${border}`,
    borderRadius: 8,
    background: input,
    color: text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  };

  const labelS = {
    fontSize: 12,
    fontWeight: 600,
    color: subText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    display: 'block',
    marginBottom: 6,
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setCustomForm(prev => ({ ...prev, imageUrl: url }));
      toast({ title: 'Success', description: 'Product image uploaded successfully' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message || 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
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
      // 1. Process payload rules
      const processed = processCustomProductPayload({
        category: customForm.category,
        access_method: customForm.accessMethod,
        duration: customForm.duration,
        start_date: assignForm.startDate,
        license_key: assignForm.licenseKey
      });

      // 2. Update the product table row
      const productUpdates = {
        name: customForm.name.trim(),
        description: customForm.description?.trim() || null,
        price: parseFloat(customForm.price) || 0,
        type: customForm.type.trim(),
        download_url: customForm.category === 'digital' ? customForm.downloadUrl.trim() : null,
        category: customForm.category,
        image_url: customForm.imageUrl || null,
        license_type: processed.license_type,
        license_registration: customForm.accessMethod === 'license_auto',
        automatic_updates: customForm.accessMethod === 'license_auto',
        manual_updates: customForm.accessMethod === 'manual_no_license',
        renewal_enabled: customForm.accessMethod === 'license_auto',
        renewal_price: parseFloat(customForm.price) || 0,
        renewal_period_days: customForm.duration === 'monthly' ? 30 : (customForm.duration === 'yearly' ? 365 : null),
      };

      await updateProduct(product.id || license.product_id, productUpdates);

      // 3. Update the license table row
      const licenseUpdates = {
        license_key: processed.license_key,
        status: assignForm.status,
        expiry_date: processed.expiry_date,
        start_date: processed.start_date,
        license_type: processed.license_type,
        membership_type: processed.membership_type
      };

      await updateLicense(license.id, licenseUpdates);

      toast({ title: 'Success', description: 'Product assignment details updated successfully' });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to update assignment', variant: 'destructive' });
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
      onClick={() => onOpenChange(false)}
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
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
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
            <div style={{ fontWeight: 700, fontSize: 16, color: text }}>Edit Product Assignment Details</div>
            <div style={{ fontSize: 12, color: subText, marginTop: 2 }}>
              Customer: {customer?.name || 'Selected Customer'} — {customer?.email || ''}
            </div>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', maxHeight: '70vh' }}>
            
            {/* Row 1: Product Definition (Screen 1 Equivalent) */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: brand, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1.5px solid ${borderStrong}`, paddingBottom: 6, marginBottom: 16 }}>
                1. Product Definition
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelS}>Product Icon</label>
                    <div
                      style={{
                        border: `1.5px solid ${borderStrong}`,
                        borderRadius: 12,
                        padding: '16px 24px',
                        textAlign: 'center',
                        background: panel,
                        height: 120,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      {customForm.category === 'digital' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(232, 123, 53, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 6
                          }}>
                            <Download size={20} style={{ color: brand }} />
                          </div>
                          <span style={{ fontSize: 12.5, color: text, fontWeight: 600 }}>Digital Product Icon</span>
                          <span style={{ fontSize: 10.5, color: subText, marginTop: 1 }}>Auto-generated download icon</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(99, 102, 241, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 6
                          }}>
                            <Layers size={20} style={{ color: '#6366f1' }} />
                          </div>
                          <span style={{ fontSize: 12.5, color: text, fontWeight: 600 }}>Virtual Service Icon</span>
                          <span style={{ fontSize: 10.5, color: subText, marginTop: 1 }}>Auto-generated layers icon</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={labelS}>Product Name *</label>
                    <input
                      type="text"
                      value={customForm.name}
                      required
                      onChange={(e) => setCustomForm(p => ({ ...p, name: e.target.value }))}
                      style={inpS}
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label style={labelS}>Product Category *</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div
                        onClick={() => setCustomForm(p => ({ ...p, category: 'digital' }))}
                        style={{
                          flex: 1, padding: '12px 10px', borderRadius: 10,
                          border: `2px solid ${customForm.category === 'digital' ? brand : border}`,
                          background: customForm.category === 'digital' ? `${brand}12` : panel,
                          cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center'
                        }}
                      >
                        <Download size={14} style={{ color: customForm.category === 'digital' ? brand : subText }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Digital Product</span>
                      </div>

                      <div
                        onClick={() => setCustomForm(p => ({ ...p, category: 'virtual' }))}
                        style={{
                          flex: 1, padding: '12px 10px', borderRadius: 10,
                          border: `2px solid ${customForm.category === 'virtual' ? brand : border}`,
                          background: customForm.category === 'virtual' ? `${brand}12` : panel,
                          cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center'
                        }}
                      >
                        <Layers size={14} style={{ color: customForm.category === 'virtual' ? brand : subText }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Virtual Service</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={labelS}>Product Price *</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13 }}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={customForm.price}
                        required
                        onChange={(e) => setCustomForm(p => ({ ...p, price: e.target.value }))}
                        style={{ ...inpS, paddingLeft: 24 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

                  {customForm.category === 'digital' && (
                    <div>
                      <label style={labelS}>Product Download URL *</label>
                      <input
                        type="text"
                        placeholder="https://example.com/download"
                        value={customForm.downloadUrl}
                        required
                        onChange={(e) => setCustomForm(p => ({ ...p, downloadUrl: e.target.value }))}
                        style={inpS}
                      />
                    </div>
                  )}

                  <div>
                    <label style={labelS}>Service Access Plan *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Plan 1: License + Auto */}
                      <div
                        style={{
                          border: `1.5px solid ${customForm.accessMethod === 'license_auto' ? '#818cf8' : border}`,
                          borderRadius: 10, padding: 12, background: customForm.accessMethod === 'license_auto' ? 'rgba(129,140,248,0.04)' : panel,
                          cursor: 'pointer'
                        }}
                        onClick={() => setCustomForm(p => ({ ...p, accessMethod: 'license_auto', duration: p.duration === 'lifetime' || p.duration === 'monthly' || p.duration === 'yearly' ? p.duration : 'yearly' }))}
                      >
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="radio" checked={customForm.accessMethod === 'license_auto'} onChange={() => {}} style={{ accentColor: '#818cf8' }} />
                          <Shield size={13} style={{ color: '#818cf8' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: text }}>License + Auto Updates</span>
                        </div>
                        {customForm.accessMethod === 'license_auto' && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            {['monthly', 'yearly', 'lifetime'].map(dur => (
                              <button
                                key={dur} type="button" onClick={(e) => { e.stopPropagation(); setCustomForm(p => ({ ...p, duration: dur })); }}
                                style={{
                                  flex: 1, padding: '5px 2px', fontSize: 10, fontWeight: 600, borderRadius: 6,
                                  border: `1px solid ${customForm.duration === dur ? '#818cf8' : borderStrong}`,
                                  background: customForm.duration === dur ? '#818cf8' : 'transparent',
                                  color: customForm.duration === dur ? '#fff' : text, cursor: 'pointer'
                                }}
                              >
                                {dur === 'monthly' ? 'Monthly' : dur === 'yearly' ? 'Yearly' : 'Lifetime'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Plan 2: Manual Updates */}
                      <div
                        style={{
                          border: `1.5px solid ${customForm.accessMethod === 'manual_no_license' ? '#60a5fa' : border}`,
                          borderRadius: 10, padding: 12, background: customForm.accessMethod === 'manual_no_license' ? 'rgba(96,165,250,0.04)' : panel,
                          cursor: 'pointer'
                        }}
                        onClick={() => setCustomForm(p => ({ ...p, accessMethod: 'manual_no_license', duration: p.duration === 'lifetime' || p.duration === 'monthly' || p.duration === 'yearly' ? p.duration : 'yearly' }))}
                      >
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="radio" checked={customForm.accessMethod === 'manual_no_license'} onChange={() => {}} style={{ accentColor: '#60a5fa' }} />
                          <RefreshCw size={13} style={{ color: '#60a5fa' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Manual (No License Required)</span>
                        </div>
                        {customForm.accessMethod === 'manual_no_license' && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            {['monthly', 'yearly', 'lifetime'].map(dur => (
                              <button
                                key={dur} type="button" onClick={(e) => { e.stopPropagation(); setCustomForm(p => ({ ...p, duration: dur })); }}
                                style={{
                                  flex: 1, padding: '5px 2px', fontSize: 10, fontWeight: 600, borderRadius: 6,
                                  border: `1px solid ${customForm.duration === dur ? '#60a5fa' : borderStrong}`,
                                  background: customForm.duration === dur ? '#60a5fa' : 'transparent',
                                  color: customForm.duration === dur ? '#fff' : text, cursor: 'pointer'
                                }}
                              >
                                {dur === 'monthly' ? 'Monthly' : dur === 'yearly' ? 'Yearly' : 'Lifetime'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Plan 3: One-Time Purchase */}
                      <div
                        style={{
                          border: `1.5px solid ${customForm.accessMethod === 'one_time' ? '#22c55e' : border}`,
                          borderRadius: 10, padding: 12, background: customForm.accessMethod === 'one_time' ? 'rgba(34,197,94,0.04)' : panel,
                          cursor: 'pointer'
                        }}
                        onClick={() => setCustomForm(p => ({ ...p, accessMethod: 'one_time', duration: null }))}
                      >
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="radio" checked={customForm.accessMethod === 'one_time'} onChange={() => {}} style={{ accentColor: '#22c55e' }} />
                          <Zap size={13} style={{ color: '#22c55e' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: text }}>One-Time Purchase</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={labelS}>Description</label>
                    <textarea
                      value={customForm.description}
                      onChange={(e) => setCustomForm(p => ({ ...p, description: e.target.value }))}
                      style={{ ...inpS, minHeight: 60 }}
                      placeholder="Enter product description (optional)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: License Assignment Parameters (Screen 2 Equivalent) */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: brand, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1.5px solid ${borderStrong}`, paddingBottom: 6, marginBottom: 16 }}>
                2. Assignment &amp; License Settings
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left Column: License Key & Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {customForm.accessMethod === 'license_auto' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label style={labelS}>License Key *</label>
                        <button
                          type="button"
                          onClick={() => setAssignForm(p => ({ ...p, licenseKey: generateCustomKey() }))}
                          style={{
                            background: 'none', border: 'none', color: brand, cursor: 'pointer',
                            fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <Key size={11} /> Generate
                        </button>
                      </div>
                      <input
                        type="text"
                        value={assignForm.licenseKey}
                        required
                        onChange={(e) => setAssignForm(p => ({ ...p, licenseKey: e.target.value }))}
                        style={inpS}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={labelS}>License Key</label>
                      <input
                        type="text"
                        disabled
                        value="No License Key Required"
                        style={{ ...inpS, background: panel, color: subText, cursor: 'not-allowed' }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={labelS}>License Status *</label>
                    <select
                      style={inpS}
                      value={assignForm.status}
                      onChange={(e) => setAssignForm(p => ({ ...p, status: e.target.value }))}
                    >
                      <option value="Active">Active</option>
                      <option value="Disabled">Disabled</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                </div>

                {/* Right Column: Dates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelS}>
                      {customForm.accessMethod === 'one_time' ? 'Purchase Date' : 'Start Date'}
                    </label>
                    {customForm.accessMethod === 'one_time' ? (
                      <input
                        type="text"
                        disabled
                        value="Tracked by purchase date (system-defined)"
                        style={{ ...inpS, background: panel, color: subText, cursor: 'not-allowed' }}
                      />
                    ) : (
                      <input
                        type="date"
                        value={assignForm.startDate}
                        required
                        onChange={(e) => setAssignForm(p => ({ ...p, startDate: e.target.value }))}
                        style={inpS}
                      />
                    )}
                  </div>

                  <div>
                    <label style={labelS}>Expiry Date</label>
                    {customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime' ? (
                      <input
                        type="text"
                        disabled
                        value={customForm.duration === 'lifetime' ? 'Lifetime - Never Expires' : 'One-Time Purchase (No Expiry)'}
                        style={{ ...inpS, background: panel, color: subText, cursor: 'not-allowed' }}
                      />
                    ) : (
                      <input
                        type="date"
                        value={assignForm.expiryDate}
                        onChange={(e) => setAssignForm(p => ({ ...p, expiryDate: e.target.value }))}
                        style={inpS}
                      />
                    )}
                    {!(customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime') && (
                      <p style={{ fontSize: 11, color: subText, marginTop: 4 }}>Auto-calculated but can be modified manually.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: `1.5px solid ${border}`,
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
                display: 'inline-flex',
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
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
