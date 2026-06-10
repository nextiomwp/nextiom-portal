import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Check, Upload, Download, Layers, Shield, RefreshCw, Zap, Calendar, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { assignProductToCustomer, uploadProductImage } from '@/lib/storage';
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

function AssignProductDialog({ open, onOpenChange, customers = [], products = [], onSuccess, c }) {
  const [isCustom, setIsCustom] = useState(false);
  const [step, setStep] = useState(1);

  // Standard assign form
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    activationDate: new Date().toISOString().split('T')[0],
  });

  // Custom product details (Screen 1)
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
    renewalPercentage: ''
  });

  // Custom product assignment details (Screen 2)
  const [assignForm, setAssignForm] = useState({
    licenseKey: '',
    status: 'Active',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: ''
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const prevOpenRef = useRef(false);

  const getRenewalPrice = () => {
    const basePrice = parseFloat(customForm.price) || 0;
    const pct = parseFloat(customForm.renewalPercentage) || 0;
    return (basePrice * (1 + pct / 100)).toFixed(2);
  };

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setIsCustom(false);
      setStep(1);
      setFormData({
        customerId: customers && customers.length === 1 ? customers[0].id : '',
        productId: '',
        activationDate: new Date().toISOString().split('T')[0],
      });
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
        renewalPercentage: ''
      });
      setAssignForm({
        licenseKey: generateCustomKey(),
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: ''
      });
    }
    prevOpenRef.current = open;
  }, [open, customers]);

  // Expiry Date Auto-Calculation logic for Screen 2
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

  // Disable renewal if access method is one_time
  useEffect(() => {
    if (customForm.accessMethod === 'one_time') {
      setCustomForm(prev => prev.hasRenewal ? { ...prev, hasRenewal: false } : prev);
    }
  }, [customForm.accessMethod]);

  if (!open) return null;

  // Default fallback theme matching the admin system
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

  // Standard Product Assignment Submit
  const handleStandardSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.customerId || !formData.productId || !formData.activationDate) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await assignProductToCustomer(formData);
      toast({ title: 'Success', description: 'Product assigned successfully' });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to assign product', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Image Upload handler for Screen 1
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

  // Next button click handler (Screen 1 -> Screen 2 validation)
  const handleNext = () => {
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

    setStep(2);
  };

  // Custom Product Assignment Submit
  const handleCustomSubmit = async () => {
    const targetCustomerId = formData.customerId || (customers && customers[0]?.id);
    if (!targetCustomerId) {
      toast({ title: 'Error', description: 'Customer is required for product assignment', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // 1. Insert the product to the products table
      const productPayload = {
        name: customForm.name.trim(),
        description: customForm.description?.trim() || null,
        price: parseFloat(customForm.price) || 0,
        currency: customForm.currency || 'USD',
        type: customForm.type.trim(),
        download_url: customForm.category === 'digital' ? customForm.downloadUrl.trim() : null,
        category: customForm.category,
        image_url: customForm.imageUrl || null,
        license_type: customForm.accessMethod === 'one_time' ? null : customForm.duration,
        license_registration: customForm.accessMethod === 'license_auto',
        automatic_updates: customForm.accessMethod === 'license_auto',
        manual_updates: customForm.accessMethod === 'manual_no_license',
        renewal_enabled: customForm.hasRenewal,
        renewal_price: customForm.hasRenewal ? (parseFloat(getRenewalPrice()) || 0) : (parseFloat(customForm.price) || 0),
        renewal_period_days: customForm.duration === 'monthly' ? 30 : (customForm.duration === 'yearly' ? 365 : null),
        created_at: new Date().toISOString()
      };

      const { data: newProduct, error: pError } = await supabase
        .from('products')
        .insert([productPayload])
        .select()
        .single();

      if (pError) throw pError;

      // 2. Validate and process assignment constraints
      const processed = processCustomProductPayload({
        category: customForm.category,
        access_method: customForm.accessMethod,
        duration: customForm.duration,
        start_date: assignForm.startDate,
        license_key: assignForm.licenseKey
      });

      // 3. Insert into the licenses table
      const licensePayload = {
        customer_id: targetCustomerId,
        product_id: newProduct.id,
        license_key: processed.license_key,
        status: assignForm.status,
        expiry_date: processed.expiry_date,
        start_date: processed.start_date,
        license_type: processed.license_type,
        membership_type: processed.membership_type,
        download_count: 0,
        created_at: new Date().toISOString()
      };

      const { error: lError } = await supabase
        .from('licenses')
        .insert([licensePayload]);

      if (lError) throw lError;

      // 4. Send customer notification
      await supabase.from('notifications').insert([{
        customer_id: targetCustomerId,
        title: 'New Product Assigned',
        message: `You have been assigned access to "${newProduct.name}". View it from your Products page.`,
        type: 'product_assigned',
        read_status: false,
        created_at: new Date().toISOString()
      }]);

      toast({ title: 'Success', description: 'Custom product assigned successfully' });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to assign custom product', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getCustomProductDropdownLabel = () => {
    const catLabel = customForm.category === 'digital' ? 'Digital Product' : 'Virtual Service';
    const accLabel = customForm.accessMethod === 'license_auto'
      ? 'License + Auto'
      : (customForm.accessMethod === 'manual_no_license' ? 'Manual Access' : 'One-Time');
    const durLabel = customForm.accessMethod === 'one_time'
      ? 'Lifetime'
      : (customForm.duration === 'monthly' ? 'Monthly' : (customForm.duration === 'yearly' ? 'Yearly' : 'Lifetime'));
    return `${customForm.name || 'Custom Product'} – ${catLabel} (${accLabel}) – ${durLabel}`;
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
          maxWidth: isCustom ? (step === 1 ? 960 : 760) : 480,
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
            <div style={{ fontWeight: 700, fontSize: 16, color: text }}>
              {isCustom ? (step === 1 ? 'Add New Product' : 'Assign Product & Generate License') : 'Assign Product & Generate License'}
            </div>
            {customers && customers.length === 1 && (
              <div style={{ fontSize: 12, color: subText, marginTop: 2 }}>
                {customers[0]?.name || 'Selected Customer'}
                {customers[0]?.email && <span> — {customers[0].email}</span>}
              </div>
            )}
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
        {!isCustom ? (
          /* STANDARD NORMAL ASSIGNMENT VIEW */
          <form onSubmit={handleStandardSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              
              {/* Custom Product Toggle Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  id="enable-custom"
                  checked={isCustom}
                  onChange={(e) => setIsCustom(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: brand, cursor: 'pointer' }}
                />
                <label htmlFor="enable-custom" style={{ fontSize: 13, fontWeight: 600, color: text, cursor: 'pointer' }}>
                  Enable Custom Product
                </label>
              </div>

              {customers && customers.length > 1 && (
                <div>
                  <label style={labelS}>Customer *</label>
                  <select
                    style={inpS}
                    value={formData.customerId}
                    required
                    onChange={(e) => setFormData((p) => ({ ...p, customerId: e.target.value }))}
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} – {c.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={labelS}>Product *</label>
                <select
                  style={inpS}
                  value={formData.productId}
                  required
                  onChange={(e) => setFormData((p) => ({ ...p, productId: e.target.value }))}
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelS}>Start Date *</label>
                <input
                  type="date"
                  value={formData.activationDate}
                  required
                  onChange={(e) => setFormData((p) => ({ ...p, activationDate: e.target.value }))}
                  style={inpS}
                />
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
                {saving ? 'Assigning…' : 'Assign Product'}
              </button>
            </div>
          </form>
        ) : (
          /* CUSTOM PRODUCT WIZARD WIDE VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {step === 1 ? (
              /* SCREEN 1: ADD NEW PRODUCT (customProduct.jpeg) */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ padding: '24px', display: 'flex', gap: 24, overflowY: 'auto', maxHeight: '70vh' }}>
                  {/* Left Column */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Checkbox to Disable/Enable Custom mode */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        id="enable-custom-inside"
                        checked={isCustom}
                        onChange={(e) => setIsCustom(e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: brand, cursor: 'pointer' }}
                      />
                      <label htmlFor="enable-custom-inside" style={{ fontSize: 13, fontWeight: 600, color: text, cursor: 'pointer' }}>
                        Enable Custom Product
                      </label>
                    </div>

                    <div>
                      <label style={labelS}>Product Icon</label>
                      <div
                        style={{
                          border: `1.5px solid ${borderStrong}`,
                          borderRadius: 12,
                          padding: '16px 24px',
                          textAlign: 'center',
                          background: panel,
                          height: 130,
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
                              width: 48, height: 48, borderRadius: '50%',
                              background: 'rgba(232, 123, 53, 0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              marginBottom: 8
                            }}>
                              <Download size={24} style={{ color: brand }} />
                            </div>
                            <span style={{ fontSize: 13, color: text, fontWeight: 600 }}>Digital Product Icon</span>
                            <span style={{ fontSize: 11, color: subText, marginTop: 2 }}>Auto-generated download icon</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: '50%',
                              background: 'rgba(99, 102, 241, 0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              marginBottom: 8
                            }}>
                              <Layers size={24} style={{ color: '#6366f1' }} />
                            </div>
                            <span style={{ fontSize: 13, color: text, fontWeight: 600 }}>Virtual Service Icon</span>
                            <span style={{ fontSize: 11, color: subText, marginTop: 2 }}>Auto-generated layers icon</span>
                          </div>
                        )}
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
                                <Zap size={14} style={{ color: '#22c55e' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: text }}>One-Time Purchase</span>
                              </div>
                              <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>No license. No updates. Pay once and use forever.</div>
                            </div>
                          </div>

                          {customForm.accessMethod === 'one_time' && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                              {['No License', 'No Updates', 'Lifetime Usage'].map((label, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    flex: 1, padding: '8px 4px', fontSize: 10.5, fontWeight: 500, borderRadius: 8,
                                    border: `1px solid ${borderStrong}`, background: 'rgba(255,255,255,0.02)',
                                    color: subText, textAlign: 'center'
                                  }}
                                >
                                  {label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                      <Zap size={14} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: 11, color: '#93c5fd', margin: 0 }}>
                        Note: The selected service plan will define how this product is assigned and managed for your customers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Screen 1 */}
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
                    type="button"
                    onClick={handleNext}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 24px',
                      borderRadius: 8,
                      border: 'none',
                      background: brand,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              /* SCREEN 2: ASSIGN PARAMETERS (customProduct2.png) */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '70vh' }}>
                  
                  {/* Select Customer & Product row */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelS}>Customer *</label>
                      <select style={{ ...inpS, background: panel }} disabled value={formData.customerId}>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelS}>Product *</label>
                      <select style={{ ...inpS, background: panel }} disabled value="">
                        <option value="">{getCustomProductDropdownLabel()}</option>
                      </select>
                    </div>
                  </div>

                  {/* Three Summary Cards */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    {/* Card 1: Product Type */}
                    <div style={{
                      flex: 1, padding: 12, borderRadius: 12, background: panel, border: `1px solid ${border}`,
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Download size={16} style={{ color: '#22c55e' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: subText, textTransform: 'uppercase', fontWeight: 600 }}>Product Type</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginTop: 2 }}>
                          {customForm.category === 'digital' ? 'Digital Product' : 'Virtual Service'}
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Access Method */}
                    <div style={{
                      flex: 1, padding: 12, borderRadius: 12, background: panel, border: `1px solid ${border}`,
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(129,140,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={16} style={{ color: '#818cf8' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: subText, textTransform: 'uppercase', fontWeight: 600 }}>Access Method</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginTop: 2 }}>
                          {customForm.accessMethod === 'license_auto' ? 'License Registration' : customForm.accessMethod === 'manual_no_license' ? 'Manual Updates' : 'One-Time Purchase'}
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Billing Duration */}
                    <div style={{
                      flex: 1, padding: 12, borderRadius: 12, background: panel, border: `1px solid ${border}`,
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={16} style={{ color: '#60a5fa' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: subText, textTransform: 'uppercase', fontWeight: 600 }}>Billing Duration</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>
                          {customForm.accessMethod === 'one_time' ? 'One-Time Purchase' : customForm.duration === 'monthly' ? 'Monthly Subscription' : customForm.duration === 'yearly' ? 'Yearly Subscription' : 'Lifetime License'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Config Sections */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
                    {/* Left Column: LICENSE INFORMATION (Shown only for license_auto) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        LICENSE INFORMATION
                        <div style={{ fontSize: 9.5, color: subText, textTransform: 'none', fontWeight: 500, marginTop: 2 }}>
                          (Shown only for License + Automatic Updates)
                        </div>
                      </div>

                      {customForm.accessMethod === 'license_auto' ? (
                        <>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <label style={{ ...labelS, marginBottom: 0 }}>License Key</label>
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
                              onChange={(e) => setAssignForm(p => ({ ...p, licenseKey: e.target.value }))}
                              style={inpS}
                            />
                          </div>

                          <div>
                            <label style={labelS}>License Status</label>
                            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: text, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name="lic-status"
                                  checked={assignForm.status === 'Active'}
                                  onChange={() => setAssignForm(p => ({ ...p, status: 'Active' }))}
                                  style={{ accentColor: brand }}
                                />
                                Active
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: text, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name="lic-status"
                                  checked={assignForm.status === 'Disabled'}
                                  onChange={() => setAssignForm(p => ({ ...p, status: 'Disabled' }))}
                                  style={{ accentColor: brand }}
                                />
                                Suspended
                              </label>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 10, padding: 16, color: subText, fontSize: 12.5, fontStyle: 'italic' }}>
                          No License registration needed for {customForm.accessMethod === 'one_time' ? 'one-time purchases' : 'manual updates'}.
                        </div>
                      )}
                    </div>

                    {/* Right Column: SUBSCRIPTION INFORMATION */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                        {customForm.accessMethod === 'one_time' ? 'PURCHASE INFORMATION' : 'SUBSCRIPTION INFORMATION'}
                      </div>

                      <div>
                        <label style={labelS}>
                          {customForm.accessMethod === 'one_time' ? 'Purchase Date' : 'Start Date'}
                        </label>
                        <input
                          type="date"
                          value={assignForm.startDate}
                          onChange={(e) => setAssignForm(p => ({ ...p, startDate: e.target.value }))}
                          style={inpS}
                        />
                      </div>

                      {!(customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime') && (
                        <div>
                          <label style={labelS}>Expiry Date (Auto calculated)</label>
                          <input
                            type="date"
                            disabled
                            value={assignForm.expiryDate}
                            style={{ ...inpS, background: panel, color: subText, cursor: 'not-allowed' }}
                          />
                        </div>
                      )}

                      {/* Updates Info callout */}
                      <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        <Zap size={14} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 11, color: '#93c5fd', margin: 0 }}>
                          {customForm.accessMethod === 'license_auto'
                            ? 'Customer will receive automatic updates during this period.'
                            : (customForm.accessMethod === 'manual_no_license' ? 'Customer gets access but updates are manual.' : 'One-time purchase, no updates, no license.')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={labelS}>Notes (Optional)</label>
                    <textarea
                      placeholder="Add notes about this assignment..."
                      value={assignForm.notes}
                      onChange={(e) => setAssignForm(p => ({ ...p, notes: e.target.value }))}
                      style={{ ...inpS, minHeight: 60 }}
                    />
                  </div>

                </div>

                {/* Footer Screen 2 */}
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
                    onClick={() => setStep(1)}
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
                    Back
                  </button>
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
                    type="button"
                    disabled={saving}
                    onClick={handleCustomSubmit}
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
                    {saving ? 'Assigning…' : 'Assign Product'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignProductDialog;
