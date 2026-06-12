import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, Download, Layers, Shield, RefreshCw, Zap, Calendar, Key, Copy, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { updateLicense } from '@/lib/storage';
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
    category: 'digital',
    type: 'Plugin',
    currency: 'USD',
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
      
      setCustomForm({
        name: product.name || '',
        description: product.description || '',
        category: product.category || 'digital',
        type: product.type || 'Plugin',
        currency: product.currency || 'USD',
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
        renewalPrice: renewalPrice,
        renewalDate: license.renewal_date ? license.renewal_date.split('T')[0] : '',
        notes: license.notes || '',
        accessMethod: product.license_registration || product.automatic_updates
          ? 'license_auto'
          : (product.manual_updates ? 'manual_no_license' : 'one_time'),
        duration: initialAccessMethod,
        currency: currency,
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
    fontSize: 12,
    fontWeight: 600,
    color: subText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    display: 'block',
    marginBottom: 6,
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
        notes: assignForm.notes || null,
        price: parseFloat(assignForm.price) || 0,
        renewal_price: parseFloat(assignForm.renewalPrice) || 0,
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
            
            {/* Row 1: Product Definition (READ-ONLY) */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: brand, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1.5px solid ${borderStrong}`, paddingBottom: 6, marginBottom: 16 }}>
                1. Master Product Information (Read-Only)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelS}>Product Icon</label>
                    <div
                      style={{
                        border: `1.5px solid ${border}`,
                        borderRadius: 12,
                        padding: '16px 24px',
                        textAlign: 'center',
                        background: panel,
                        height: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      {customForm.category === 'digital' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Download size={20} style={{ color: brand, marginBottom: 4 }} />
                          <span style={{ fontSize: 12.5, color: text, fontWeight: 600 }}>Digital Product</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Layers size={20} style={{ color: '#6366f1', marginBottom: 4 }} />
                          <span style={{ fontSize: 12.5, color: text, fontWeight: 600 }}>Virtual Service</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={labelS}>Product Name</label>
                    <input
                      type="text"
                      readOnly
                      value={customForm.name}
                      style={readOnlyInpS}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelS}>Product Category</label>
                    <input
                      type="text"
                      readOnly
                      value={customForm.category === 'digital' ? 'Digital Product' : 'Virtual Service'}
                      style={readOnlyInpS}
                    />
                  </div>

                  <div>
                    <label style={labelS}>Product Type</label>
                    <input
                      type="text"
                      readOnly
                      value={customForm.type}
                      style={readOnlyInpS}
                    />
                  </div>

                  <div>
                    <label style={labelS}>Description</label>
                    <textarea
                      readOnly
                      value={customForm.description || 'No description provided.'}
                      style={{ ...readOnlyInpS, minHeight: 60 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: License Assignment Parameters (EDITABLE) */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: brand, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1.5px solid ${borderStrong}`, paddingBottom: 6, marginBottom: 16 }}>
                2. Customer Assignment Settings (Editable)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                
                {/* Left Column: LICENSE & STATUS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {assignForm.accessMethod === 'license_auto' ? (
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
                        style={readOnlyInpS}
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

                  <div>
                    <label style={labelS}>Version</label>
                    <input
                      type="text"
                      value={assignForm.version}
                      onChange={(e) => setAssignForm(p => ({ ...p, version: e.target.value }))}
                      style={inpS}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelS}>Download URL</label>
                    <input
                      type="text"
                      value={assignForm.downloadUrl}
                      onChange={(e) => setAssignForm(p => ({ ...p, downloadUrl: e.target.value }))}
                      style={inpS}
                      placeholder="Custom download link for this customer"
                    />
                  </div>
                </div>

                {/* Right Column: DATES & PRICING */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

                  <div>
                    <label style={labelS}>Expiry Date</label>
                    {assignForm.accessMethod === 'one_time' || assignForm.duration === 'lifetime' ? (
                      <input
                        type="text"
                        disabled
                        value={assignForm.duration === 'lifetime' ? 'Lifetime - Never Expires' : 'One-Time Purchase (No Expiry)'}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ ...labelS, marginBottom: 0 }}>Price</label>
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
                          value={assignForm.price}
                          onChange={(e) => setAssignForm(p => ({ ...p, price: e.target.value }))}
                          style={{ ...inpS, paddingLeft: assignForm.currency === 'LKR' ? 34 : 24 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ ...labelS, marginBottom: 6 }}>Renewal Price</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13 }}>
                          {assignForm.currency === 'LKR' ? 'Rs.' : '$'}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={assignForm.renewalPrice}
                          onChange={(e) => setAssignForm(p => ({ ...p, renewalPrice: e.target.value }))}
                          style={{ ...inpS, paddingLeft: assignForm.currency === 'LKR' ? 34 : 24 }}
                        />
                      </div>
                    </div>
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

              {/* Notes Row */}
              <div style={{ marginTop: 16 }}>
                <label style={labelS}>Notes</label>
                <textarea
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ ...inpS, minHeight: 60 }}
                  placeholder="Enter notes about this customer assignment..."
                />
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
