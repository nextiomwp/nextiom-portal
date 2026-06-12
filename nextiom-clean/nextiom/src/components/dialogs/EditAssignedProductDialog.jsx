import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, Download, Layers, Shield, RefreshCw, Zap, Calendar, Key, Copy, FileText, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { updateLicense } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';

const generateCustomKey = () => {
  return 'PROD-XXXX-XXXX-XXXX'.replace(/X/g, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.random() * 36 | 0]);
};

function processCustomProductPayload({ category, access_method, duration, start_date, license_key }) {
  let finalDuration = duration;
  if (access_method === 'one_time') {
    finalDuration = 'one_time';
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
    category: 'digital',
    type: 'Plugin',
  });

  const [assignForm, setAssignForm] = useState({
    purchaseDate: '',
    startDate: '',
    expiryDate: '',
    downloadUrl: '',
    licenseKey: '',
    version: '1.0.0',
    status: 'Active',
    price: '0.00',
    hasRenewal: false,
    renewalPercentage: '',
    renewalPrice: '0.00',
    renewalDate: '',
    notes: '',
    accessMethod: 'license_auto',
    duration: 'yearly',
    currency: 'USD',
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product && license && open) {
      const initialAccessMethod = license.license_type || product.license_type || 'yearly';

      const basePrice = license.price !== undefined && license.price !== null ? license.price.toString() : (product.price?.toString() || '0.00');
      const renewalPrice = license.renewal_price !== undefined && license.renewal_price !== null ? license.renewal_price.toString() : (product.renewal_price?.toString() || '0.00');
      const currency = license.currency || product.currency || 'USD';
      
      let accessMethod = 'one_time';
      if (license.license_key) {
        accessMethod = 'license_auto';
      } else if (license.license_type && license.license_type !== 'one_time') {
        accessMethod = 'manual_no_license';
      }

      // Determine hasRenewal and renewalPercentage
      const hasRenewal = license.renewal_price !== undefined && license.renewal_price !== null && parseFloat(license.renewal_price) > 0;
      let renewalPercentage = '';
      if (hasRenewal && parseFloat(basePrice) > 0 && parseFloat(renewalPrice) > 0) {
        const pct = ((parseFloat(renewalPrice) - parseFloat(basePrice)) / parseFloat(basePrice)) * 100;
        renewalPercentage = pct > 0 ? pct.toFixed(1) : '0';
      }

      setCustomForm({
        name: product.name || '',
        category: product.category || 'digital',
        type: product.type || 'Plugin',
      });

      setAssignForm({
        purchaseDate: license.purchase_date ? license.purchase_date.split('T')[0] : '',
        startDate: license.start_date ? license.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: license.expiry_date ? license.expiry_date.split('T')[0] : '',
        downloadUrl: license.download_url !== undefined && license.download_url !== null ? license.download_url : (product.download_url || ''),
        licenseKey: license.license_key || '',
        version: license.version || '1.0.0',
        status: license.status || 'Active',
        price: basePrice,
        hasRenewal,
        renewalPercentage,
        renewalPrice: renewalPrice,
        renewalDate: license.renewal_date ? license.renewal_date.split('T')[0] : '',
        notes: license.notes || '',
        accessMethod,
        duration: initialAccessMethod === 'one_time' ? 'yearly' : initialAccessMethod,
        currency,
      });
    }
  }, [product, license, open]);

  // Expiry Date Auto-Calculation logic
  useEffect(() => {
    if (assignForm.accessMethod === 'one_time' || assignForm.duration === 'lifetime') {
      setAssignForm(prev => ({ ...prev, expiryDate: '' }));
      return;
    }
    const start = new Date(assignForm.startDate);
    if (isNaN(start.getTime())) return;
    
    if (assignForm.duration === 'monthly') {
      const d = new Date(start);
      d.setDate(d.getDate() + 30);
      setAssignForm(prev => ({ ...prev, expiryDate: d.toISOString().split('T')[0] }));
    } else if (assignForm.duration === 'yearly') {
      const d = new Date(start);
      d.setFullYear(d.getFullYear() + 1);
      setAssignForm(prev => ({ ...prev, expiryDate: d.toISOString().split('T')[0] }));
    }
  }, [assignForm.startDate, assignForm.duration, assignForm.accessMethod]);

  // Disable renewal if access method is one_time
  useEffect(() => {
    if (assignForm.accessMethod === 'one_time') {
      setAssignForm(prev => prev.hasRenewal ? { ...prev, hasRenewal: false } : prev);
    }
  }, [assignForm.accessMethod]);

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

  const readOnlyInpS = {
    ...inpS,
    opacity: 0.7,
    cursor: 'not-allowed',
    background: panel
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

  const getRenewalPrice = () => {
    const basePrice = parseFloat(assignForm.price) || 0;
    const pct = parseFloat(assignForm.renewalPercentage) || 0;
    return (basePrice * (1 + pct / 100)).toFixed(2);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      // 1. Process payload rules
      const processed = processCustomProductPayload({
        category: customForm.category,
        access_method: assignForm.accessMethod,
        duration: assignForm.duration,
        start_date: assignForm.startDate,
        license_key: assignForm.licenseKey
      });

      // 2. Update the license table row
      const licenseUpdates = {
        purchase_date: assignForm.purchaseDate ? new Date(assignForm.purchaseDate).toISOString() : null,
        start_date: processed.start_date,
        expiry_date: processed.expiry_date,
        download_url: assignForm.downloadUrl || null,
        license_key: processed.license_key,
        version: assignForm.version || null,
        status: assignForm.status,
        notes: assignForm.notes || null, // Description saves to notes
        price: parseFloat(assignForm.price) || 0,
        renewal_price: assignForm.hasRenewal ? (parseFloat(getRenewalPrice()) || 0) : (parseFloat(assignForm.price) || 0),
        renewal_date: assignForm.renewalDate ? new Date(assignForm.renewalDate).toISOString() : null,
        license_type: processed.license_type,
        membership_type: processed.membership_type,
        currency: assignForm.currency || 'USD',
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

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
                <label style={labelS}>Product Name (Read-Only)</label>
                <input
                  type="text"
                  value={customForm.name}
                  style={readOnlyInpS}
                  disabled
                />
              </div>

              <div>
                <label style={labelS}>Product Category (Read-Only)</label>
                <input
                  type="text"
                  value={customForm.category === 'digital' ? 'Digital Product' : 'Virtual Service'}
                  style={readOnlyInpS}
                  disabled
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...labelS, marginBottom: 0 }}>Price *</label>
                  <div style={{ display: 'flex', gap: 4, background: panel, padding: 2, borderRadius: 6, border: `1px solid ${borderStrong}` }}>
                    {['USD', 'LKR'].map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setAssignForm(p => ({ ...p, currency: curr }))}
                        style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: assignForm.currency === curr ? brand : 'transparent',
                          color: assignForm.currency === curr ? '#fff' : subText,
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
                    {assignForm.currency === 'LKR' ? 'Rs.' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={assignForm.price}
                    onChange={(e) => setAssignForm(p => ({ ...p, price: e.target.value }))}
                    style={{ ...inpS, paddingLeft: assignForm.currency === 'LKR' ? 34 : 24 }}
                  />
                </div>

                {/* Renewal Option */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, opacity: assignForm.accessMethod === 'one_time' ? 0.5 : 1 }}>
                  <input
                    type="checkbox"
                    id="has-renewal-assign"
                    disabled={assignForm.accessMethod === 'one_time'}
                    checked={assignForm.hasRenewal}
                    onChange={(e) => setAssignForm(p => ({ ...p, hasRenewal: e.target.checked }))}
                    style={{
                      width: 15,
                      height: 15,
                      accentColor: brand,
                      cursor: assignForm.accessMethod === 'one_time' ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <label
                    htmlFor="has-renewal-assign"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: text,
                      cursor: assignForm.accessMethod === 'one_time' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Enable Renewal (Yes / No) {assignForm.accessMethod === 'one_time' && <span style={{ fontSize: 11, fontWeight: 500, color: subText }}>(Disabled for One-Time Purchase)</span>}
                  </label>
                </div>

                {assignForm.hasRenewal && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelS, marginBottom: 6 }}>Renewal Percentage (%)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={assignForm.renewalPercentage}
                        onChange={(e) => setAssignForm(p => ({ ...p, renewalPercentage: e.target.value }))}
                        style={inpS}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelS, marginBottom: 6 }}>Renewal Price</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13 }}>
                          {assignForm.currency === 'LKR' ? 'Rs.' : '$'}
                        </span>
                        <input
                          type="text"
                          readOnly
                          value={getRenewalPrice()}
                          style={{ ...inpS, paddingLeft: assignForm.currency === 'LKR' ? 34 : 24, opacity: 0.7, cursor: 'not-allowed' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={labelS}>Description / Notes</label>
                <textarea
                  placeholder="Enter notes/description (optional)"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ ...inpS, minHeight: 80 }}
                />
              </div>

              {/* Assignment Dates */}
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: brand, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignment Dates</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelS}>Purchase Date</label>
                    <input
                      type="date"
                      value={assignForm.purchaseDate}
                      onChange={(e) => setAssignForm(p => ({ ...p, purchaseDate: e.target.value }))}
                      style={inpS}
                    />
                  </div>
                  <div>
                    <label style={labelS}>Start Date *</label>
                    <input
                      type="date"
                      value={assignForm.startDate}
                      required
                      onChange={(e) => setAssignForm(p => ({ ...p, startDate: e.target.value }))}
                      style={inpS}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelS}>Expiry Date</label>
                    {assignForm.accessMethod === 'one_time' || assignForm.duration === 'lifetime' ? (
                      <input
                        type="text"
                        disabled
                        value={assignForm.duration === 'lifetime' ? 'Lifetime - Never Expires' : 'One-Time Purchase'}
                        style={readOnlyInpS}
                      />
                    ) : (
                      <input
                        type="date"
                        value={assignForm.expiryDate}
                        onChange={(e) => setAssignForm(p => ({ ...p, expiryDate: e.target.value }))}
                        style={inpS}
                      />
                    )}
                  </div>
                  <div>
                    <label style={labelS}>Renewal Date</label>
                    <input
                      type="date"
                      value={assignForm.renewalDate}
                      onChange={(e) => setAssignForm(p => ({ ...p, renewalDate: e.target.value }))}
                      style={inpS}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelS}>Product Type (Read-Only)</label>
                <input
                  type="text"
                  value={customForm.type}
                  style={readOnlyInpS}
                  disabled
                />
              </div>

              <div>
                <label style={labelS}>Version</label>
                <input
                  type="text"
                  placeholder="e.g., 1.0.0"
                  value={assignForm.version}
                  onChange={(e) => setAssignForm(p => ({ ...p, version: e.target.value }))}
                  style={inpS}
                />
              </div>

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

              <div>
                <label style={labelS}>License Key *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="License key"
                    disabled={assignForm.accessMethod !== 'license_auto'}
                    value={assignForm.accessMethod === 'license_auto' ? assignForm.licenseKey : 'No License Required'}
                    onChange={(e) => setAssignForm(p => ({ ...p, licenseKey: e.target.value }))}
                    style={assignForm.accessMethod === 'license_auto' ? inpS : readOnlyInpS}
                  />
                  {assignForm.accessMethod === 'license_auto' && (
                    <button
                      type="button"
                      onClick={() => setAssignForm(p => ({ ...p, licenseKey: generateCustomKey() }))}
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
                  )}
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
                    value={assignForm.downloadUrl}
                    onChange={(e) => setAssignForm(p => ({ ...p, downloadUrl: e.target.value }))}
                    style={inpS}
                  />
                </div>
              )}

              <div>
                <label style={labelS}>Service Plan *</label>
                <p style={{ fontSize: 11, color: subText, marginTop: -4, marginBottom: 12 }}>Choose how customers will get access and receive updates.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Option 1: License + Auto Updates */}
                  <div
                    style={{
                      border: `1.5px solid ${assignForm.accessMethod === 'license_auto' ? '#818cf8' : border}`,
                      borderRadius: 12, padding: 16, background: assignForm.accessMethod === 'license_auto' ? 'rgba(129,140,248,0.04)' : panel,
                      cursor: 'pointer'
                    }}
                    onClick={() => setAssignForm(p => ({ ...p, accessMethod: 'license_auto', duration: 'yearly' }))}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input type="radio" checked={assignForm.accessMethod === 'license_auto'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#818cf8' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Shield size={14} style={{ color: '#818cf8' }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: text }}>License Registration + Automatic Updates</span>
                        </div>
                        <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>Customers get a license and automatic updates.</div>
                      </div>
                    </div>

                    {assignForm.accessMethod === 'license_auto' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {['monthly', 'yearly', 'lifetime'].map(dur => {
                          const active = assignForm.duration === dur;
                          const label = dur === 'monthly' ? 'Monthly Subscription' : dur === 'yearly' ? 'Yearly Subscription' : 'Lifetime License';
                          return (
                            <button
                              key={dur} type="button" onClick={(e) => { e.stopPropagation(); setAssignForm(p => ({ ...p, duration: dur })); }}
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
                      border: `1.5px solid ${assignForm.accessMethod === 'manual_no_license' ? '#60a5fa' : border}`,
                      borderRadius: 12, padding: 16, background: assignForm.accessMethod === 'manual_no_license' ? 'rgba(96,165,250,0.04)' : panel,
                      cursor: 'pointer'
                    }}
                    onClick={() => setAssignForm(p => ({ ...p, accessMethod: 'manual_no_license', duration: 'yearly' }))}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input type="radio" checked={assignForm.accessMethod === 'manual_no_license'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#60a5fa' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <RefreshCw size={14} style={{ color: '#60a5fa' }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Manual Updates (No License Required)</span>
                        </div>
                        <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>Customers get access but updates are manual.</div>
                      </div>
                    </div>

                    {assignForm.accessMethod === 'manual_no_license' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {['monthly', 'yearly', 'lifetime'].map(dur => {
                          const active = assignForm.duration === dur;
                          const label = dur === 'monthly' ? 'Monthly Access' : dur === 'yearly' ? 'Yearly Access' : 'Lifetime Access';
                          return (
                            <button
                              key={dur} type="button" onClick={(e) => { e.stopPropagation(); setAssignForm(p => ({ ...p, duration: dur })); }}
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
                      border: `1.5px solid ${assignForm.accessMethod === 'one_time' ? '#22c55e' : border}`,
                      borderRadius: 12, padding: 16, background: assignForm.accessMethod === 'one_time' ? 'rgba(34,197,94,0.04)' : panel,
                      cursor: 'pointer'
                    }}
                    onClick={() => setAssignForm(p => ({ ...p, accessMethod: 'one_time', duration: null }))}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input type="radio" checked={assignForm.accessMethod === 'one_time'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#22c55e' }} />
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
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
