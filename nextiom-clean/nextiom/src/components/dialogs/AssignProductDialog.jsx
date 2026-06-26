import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Check, Download, Layers, Shield, RefreshCw, Zap, Calendar, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { assignProductToCustomer } from '@/lib/storage';
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

function AssignProductDialog({ open, onOpenChange, customers = [], products = [], onSuccess, c }) {
  const [isCustom, setIsCustom] = useState(false);
  const [step, setStep] = useState(1);

  // Standard assign form
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    downloadUrl: '',
    licenseKey: '',
    domain: '',
    version: '1.0.0',
    status: 'Active',
    notes: '',
    price: '0.00',
    renewalPrice: '0.00',
    renewalDate: '',
    accessMethod: 'license_auto',
    duration: 'yearly',
    hasRenewal: false,
    renewalPercentage: '',
    currency: 'USD',
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
    expiryDate: '',
    notes: '',
    domain: '',
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
      setIsCustom(false);
      setStep(1);
      setFormData({
        customerId: customers && customers.length === 1 ? customers[0].id : '',
        productId: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        downloadUrl: '',
        licenseKey: '',
        domain: '',
        version: '1.0.0',
        status: 'Active',
        notes: '',
        price: '0.00',
        renewalPrice: '0.00',
        renewalDate: '',
        accessMethod: 'license_auto',
        duration: 'yearly',
        hasRenewal: false,
        renewalPercentage: '',
        currency: 'USD',
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
        expiryDate: '',
        notes: ''
      });
    }
    prevOpenRef.current = open;
  }, [open, customers]);

  // Expiry Date Auto-Calculation logic for Screen 2 (Custom wizard)
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

  // Expiry Date Auto-Calculation logic for Standard Assign Form
  useEffect(() => {
    if (formData.accessMethod === 'one_time' || formData.duration === 'lifetime') {
      setFormData(prev => ({ ...prev, expiryDate: '', renewalDate: '' }));
      return;
    }

    const start = new Date(formData.startDate);
    if (isNaN(start.getTime())) return;

    let calculatedExpiry = '';
    if (formData.duration === 'monthly') {
      const d = new Date(start);
      d.setDate(d.getDate() + 30);
      calculatedExpiry = d.toISOString().split('T')[0];
    } else if (formData.duration === 'yearly') {
      const d = new Date(start);
      d.setFullYear(d.getFullYear() + 1);
      calculatedExpiry = d.toISOString().split('T')[0];
    }

    setFormData(prev => ({
      ...prev,
      expiryDate: calculatedExpiry,
      renewalDate: calculatedExpiry
    }));
  }, [formData.startDate, formData.accessMethod, formData.duration]);

  // Prefill Standard Form when Product is selected
  useEffect(() => {
    if (!formData.productId) return;
    const prod = products.find(p => p.id === formData.productId);
    if (prod) {
      const accessMethod = (prod.license_registration || prod.automatic_updates)
        ? 'license_auto'
        : (prod.manual_updates ? 'manual_no_license' : 'one_time');

      const duration = accessMethod === 'one_time' ? null : (prod.license_type || 'yearly');

      // Generate license key if license registration is enabled on product
      const key = (accessMethod === 'license_auto') ? generateCustomKey() : '';

      // Calculate initial renewal percentage if renewal is enabled
      let pct = '';
      if (prod.renewal_enabled && prod.price > 0 && prod.renewal_price != null) {
        pct = Math.round(((prod.renewal_price - prod.price) / prod.price) * 100).toString();
      }

      // Expiry calculation
      let exp = '';
      const start = new Date(formData.startDate);
      if (!isNaN(start.getTime())) {
        if (duration === 'monthly') {
          const d = new Date(start);
          d.setDate(d.getDate() + 30);
          exp = d.toISOString().split('T')[0];
        } else if (duration === 'yearly') {
          const d = new Date(start);
          d.setFullYear(d.getFullYear() + 1);
          exp = d.toISOString().split('T')[0];
        }
      }

      setFormData(prev => ({
        ...prev,
        downloadUrl: prod.download_url || '',
        price: prod.price != null ? prod.price.toString() : '0.00',
        licenseKey: key,
        expiryDate: exp,
        renewalDate: exp,
        accessMethod,
        duration,
        hasRenewal: prod.renewal_enabled || false,
        renewalPercentage: pct,
        currency: prod.currency || 'USD',
      }));
    }
  }, [formData.productId, products]);

  // License key generation logic based on accessMethod selection (Standard form)
  useEffect(() => {
    if (formData.accessMethod === 'license_auto') {
      if (!formData.licenseKey) {
        setFormData(prev => ({ ...prev, licenseKey: generateCustomKey() }));
      }
    } else {
      setFormData(prev => ({ ...prev, licenseKey: '' }));
    }
  }, [formData.accessMethod]);

  // Disable renewal if access method is one_time or duration is lifetime (Standard form)
  useEffect(() => {
    if (formData.accessMethod === 'one_time' || formData.duration === 'lifetime') {
      setFormData(prev => prev.hasRenewal ? { ...prev, hasRenewal: false, renewalPercentage: '' } : prev);
    }
  }, [formData.accessMethod, formData.duration]);

  // Auto-calculate renewal price for standard form based on price, hasRenewal, and renewalPercentage
  useEffect(() => {
    if (formData.hasRenewal) {
      const basePrice = parseFloat(formData.price) || 0;
      const pct = parseFloat(formData.renewalPercentage) || 0;
      const calculated = (basePrice * (1 + pct / 100)).toFixed(2);
      setFormData(prev => ({ ...prev, renewalPrice: calculated }));
    } else {
      setFormData(prev => ({ ...prev, renewalPrice: formData.price }));
    }
  }, [formData.price, formData.hasRenewal, formData.renewalPercentage]);

  // Disable renewal if access method is one_time or duration is lifetime (Custom wizard)
  useEffect(() => {
    if (customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime') {
      setCustomForm(prev => prev.hasRenewal ? { ...prev, hasRenewal: false } : prev);
    }
  }, [customForm.accessMethod, customForm.duration]);

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
    brand: 'var(--brand-color)',
  };

  const text = theme.text || '#fff';
  const subText = theme.subText || '#a0a0a0';
  const card = theme.card || '#1C1E24';
  const border = theme.border || 'rgba(255,255,255,0.06)';
  const borderStrong = theme.borderStrong || 'rgba(255,255,255,0.10)';
  const brand = theme.brand || 'var(--brand-color)';
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
    if (!formData.customerId || !formData.productId) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customerId: formData.customerId,
        productId: formData.productId,
        purchaseDate: formData.purchaseDate || null,
        startDate: formData.startDate || null,
        expiryDate: formData.expiryDate || null,
        downloadUrl: formData.downloadUrl || null,
        licenseKey: formData.licenseKey || null,
        domain: formData.domain?.trim() || null,
        version: formData.version || null,
        status: formData.status || 'Active',
        notes: formData.notes || null,
        price: parseFloat(formData.price) || 0,
        renewalPrice: formData.hasRenewal ? (parseFloat(formData.renewalPrice) || 0) : (parseFloat(formData.price) || 0),
        renewalDate: formData.renewalDate || null,
        licenseType: formData.accessMethod === 'one_time' ? 'one_time' : formData.duration,
        membershipType: formData.accessMethod === 'one_time'
          ? 'One-Time Purchase, No License, No Updates'
          : formData.duration === 'lifetime'
            ? 'Lifetime License, Never Expires'
            : formData.duration === 'yearly'
              ? 'Yearly Subscription'
              : 'Monthly Subscription',
        currency: formData.currency || 'USD',
      };

      await assignProductToCustomer(payload);
      toast({ title: 'Success', description: 'Product assigned successfully' });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to assign product', variant: 'destructive' });
    } finally {
      setSaving(false);
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
        license_key: assignForm.licenseKey || null,
        license_type: customForm.accessMethod === 'one_time' ? 'one_time' : customForm.duration,
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
        purchase_date: assignForm.startDate ? new Date(assignForm.startDate).toISOString() : new Date().toISOString(),
        download_url: customForm.downloadUrl || null,
        version: '1.0.0',
        notes: assignForm.notes || null,
        domain: assignForm.domain?.trim() || null,
        price: parseFloat(customForm.price) || 0,
        renewal_price: customForm.hasRenewal ? (parseFloat(getRenewalPrice()) || 0) : (parseFloat(customForm.price) || 0),
        renewal_date: processed.expiry_date || null,
        currency: customForm.currency || 'USD',
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
          maxWidth: isCustom ? (step === 1 ? 960 : 760) : 760,
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
              {isCustom ? (step === 1 ? 'Add New Product' : 'Assign Product & Generate License') : 'Assign Existing Product'}
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

        {/* Tab Switcher (Visible only if step === 1) */}
        {step === 1 && (
          <div style={{ display: 'flex', borderBottom: `1.5px solid ${border}`, background: panel }}>
            <button
              type="button"
              onClick={() => {
                setIsCustom(false);
                setStep(1);
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: !isCustom ? `${brand}15` : 'transparent',
                border: 'none',
                borderBottom: `2.5px solid ${!isCustom ? brand : 'transparent'}`,
                color: !isCustom ? text : subText,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'center'
              }}
            >
              Assign Existing Product
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCustom(true);
                setStep(1);
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: isCustom ? `${brand}15` : 'transparent',
                border: 'none',
                borderBottom: `2.5px solid ${isCustom ? brand : 'transparent'}`,
                color: isCustom ? text : subText,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'center'
              }}
            >
              Create & Assign Custom Product
            </button>
          </div>
        )}

        {/* Form Body */}
        {!isCustom ? (
          /* STANDARD NORMAL ASSIGNMENT VIEW (Assign Existing Product) */
          <form onSubmit={handleStandardSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '70vh' }}>
              

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {customers && customers.length > 1 && (
                  <div style={{ gridColumn: '1 / -1' }}>
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

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelS}>Select Product *</label>
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

                {/* Service Plan Selector (Full Width) */}
                {formData.productId && (
                  <div style={{ gridColumn: '1 / -1', marginBottom: 8 }}>
                    <label style={labelS}>Service Plan *</label>
                    <p style={{ fontSize: 11, color: subText, marginTop: -4, marginBottom: 12 }}>Choose how customers will get access and receive updates.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Option 1: License + Auto Updates */}
                      <div
                        style={{
                          border: `1.5px solid ${formData.accessMethod === 'license_auto' ? '#818cf8' : border}`,
                          borderRadius: 12, padding: 16, background: formData.accessMethod === 'license_auto' ? 'rgba(129,140,248,0.04)' : panel,
                          cursor: 'pointer'
                        }}
                        onClick={() => setFormData(p => ({ ...p, accessMethod: 'license_auto', duration: 'yearly' }))}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <input type="radio" checked={formData.accessMethod === 'license_auto'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#818cf8' }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Shield size={14} style={{ color: '#818cf8' }} />
                              <span style={{ fontSize: 13, fontWeight: 650, color: text }}>License Registration + Automatic Updates</span>
                            </div>
                            <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>Customers get a license and automatic updates.</div>
                          </div>
                        </div>

                        {formData.accessMethod === 'license_auto' && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            {['monthly', 'yearly', 'lifetime'].map(dur => {
                              const active = formData.duration === dur;
                              const label = dur === 'monthly' ? 'Monthly Subscription' : dur === 'yearly' ? 'Yearly Subscription' : 'Lifetime License';
                              return (
                                <button
                                  key={dur} type="button" onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, duration: dur })); }}
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
                          border: `1.5px solid ${formData.accessMethod === 'manual_no_license' ? '#60a5fa' : border}`,
                          borderRadius: 12, padding: 16, background: formData.accessMethod === 'manual_no_license' ? 'rgba(96,165,250,0.04)' : panel,
                          cursor: 'pointer'
                        }}
                        onClick={() => setFormData(p => ({ ...p, accessMethod: 'manual_no_license', duration: 'yearly' }))}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <input type="radio" checked={formData.accessMethod === 'manual_no_license'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#60a5fa' }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <RefreshCw size={14} style={{ color: '#60a5fa' }} />
                              <span style={{ fontSize: 13, fontWeight: 650, color: text }}>Manual Updates (No License Required)</span>
                            </div>
                            <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>Customers get access but updates are manual.</div>
                          </div>
                        </div>

                        {formData.accessMethod === 'manual_no_license' && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            {['monthly', 'yearly', 'lifetime'].map(dur => {
                              const active = formData.duration === dur;
                              const label = dur === 'monthly' ? 'Monthly Access' : dur === 'yearly' ? 'Yearly Access' : 'Lifetime Access';
                              return (
                                <button
                                  key={dur} type="button" onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, duration: dur })); }}
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
                          border: `1.5px solid ${formData.accessMethod === 'one_time' ? '#22c55e' : border}`,
                          borderRadius: 12, padding: 16, background: formData.accessMethod === 'one_time' ? 'rgba(34,197,94,0.04)' : panel,
                          cursor: 'pointer'
                        }}
                        onClick={() => setFormData(p => ({ ...p, accessMethod: 'one_time', duration: null }))}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <input type="radio" checked={formData.accessMethod === 'one_time'} onChange={() => {}} style={{ marginTop: 3, accentColor: '#22c55e' }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Zap size={14} style={{ color: '#22c55e' }} />
                              <span style={{ fontSize: 13, fontWeight: 650, color: text }}>One-Time Purchase</span>
                            </div>
                            <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>No updates, no license registration needed.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label style={labelS}>Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData((p) => ({ ...p, purchaseDate: e.target.value }))}
                    style={inpS}
                  />
                </div>

                <div>
                  <label style={labelS}>Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    required
                    onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                    style={inpS}
                  />
                </div>

                <div>
                  <label style={labelS}>Expiry Date</label>
                  {formData.accessMethod === 'one_time' || formData.duration === 'lifetime' ? (
                    <input
                      type="text"
                      disabled
                      value={formData.duration === 'lifetime' ? 'Lifetime - Never Expires' : 'One-Time Purchase (No Expiry)'}
                      style={{ ...inpS, background: panel, color: subText, cursor: 'not-allowed' }}
                    />
                  ) : (
                    <input
                      type="date"
                      disabled
                      value={formData.expiryDate}
                      style={{ ...inpS, background: panel, color: subText, cursor: 'not-allowed' }}
                    />
                  )}
                </div>

                <div>
                  <label style={labelS}>License Key</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      disabled={formData.accessMethod !== 'license_auto'}
                      value={formData.accessMethod === 'license_auto' ? formData.licenseKey : 'No License Key Required'}
                      onChange={(e) => setFormData((p) => ({ ...p, licenseKey: e.target.value }))}
                      style={formData.accessMethod === 'license_auto' ? inpS : { ...inpS, opacity: 0.7, cursor: 'not-allowed', background: panel }}
                      placeholder="License key"
                    />
                    {formData.accessMethod === 'license_auto' && (
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, licenseKey: generateCustomKey() }))}
                        style={{
                          background: brand,
                          color: '#fff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 650,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        Gen
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelS}>Domain <span style={{ fontWeight: 400, color: subText, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(Optional)</span></label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData((p) => ({ ...p, domain: e.target.value }))}
                    style={inpS}
                    placeholder="e.g. example.com or https://example.com"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelS}>Download URL</label>
                  <input
                    type="text"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData((p) => ({ ...p, downloadUrl: e.target.value }))}
                    style={inpS}
                    placeholder="https://example.com/download"
                  />
                </div>

                <div>
                  <label style={labelS}>Version</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData((p) => ({ ...p, version: e.target.value }))}
                    style={inpS}
                    placeholder="e.g. 1.0.0"
                  />
                </div>

                <div>
                  <label style={labelS}>Status</label>
                  <select
                    style={inpS}
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...labelS, marginBottom: 0 }}>Price</label>
                    <div style={{ display: 'flex', gap: 4, background: panel, padding: 2, borderRadius: 6, border: `1px solid ${borderStrong}` }}>
                      {['USD', 'LKR'].map(curr => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, currency: curr }))}
                          style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: formData.currency === curr ? brand : 'transparent',
                            color: formData.currency === curr ? '#fff' : subText,
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
                      {formData.currency === 'LKR' ? 'Rs.' : '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                      style={{ ...inpS, paddingLeft: formData.currency === 'LKR' ? 34 : 24 }}
                    />
                  </div>
                </div>

                {formData.accessMethod !== 'one_time' && formData.duration !== 'lifetime' && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <input
                      type="checkbox"
                      id="enable-renewal-standard"
                      checked={formData.hasRenewal}
                      onChange={(e) => setFormData(p => ({ ...p, hasRenewal: e.target.checked }))}
                      style={{ width: 15, height: 15, accentColor: brand, cursor: 'pointer' }}
                    />
                    <label htmlFor="enable-renewal-standard" style={{ fontSize: 13, fontWeight: 600, color: text, cursor: 'pointer' }}>
                      Enable Renewal (Yes / No)
                    </label>
                  </div>
                )}

                {formData.accessMethod !== 'one_time' && formData.duration !== 'lifetime' && formData.hasRenewal && (
                  <>
                    <div>
                      <label style={labelS}>Renewal Percentage (%)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={formData.renewalPercentage}
                        onChange={(e) => setFormData((p) => ({ ...p, renewalPercentage: e.target.value }))}
                        style={inpS}
                      />
                    </div>

                    <div>
                      <label style={{ ...labelS, marginBottom: 6 }}>Renewal Price</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13 }}>
                          {formData.currency === 'LKR' ? 'Rs.' : '$'}
                        </span>
                        <input
                          type="text"
                          readOnly
                          value={formData.renewalPrice}
                          style={{ ...inpS, paddingLeft: formData.currency === 'LKR' ? 34 : 24, opacity: 0.7, cursor: 'not-allowed', background: panel }}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label style={labelS}>Renewal Date</label>
                  {formData.accessMethod === 'one_time' || formData.duration === 'lifetime' ? (
                    <input
                      type="text"
                      disabled
                      value={formData.duration === 'lifetime' ? 'Lifetime (No Renewal)' : 'One-Time (No Renewal)'}
                      style={{ ...inpS, background: panel, color: subText, cursor: 'not-allowed' }}
                    />
                  ) : (
                    <input
                      type="date"
                      value={formData.renewalDate}
                      onChange={(e) => setFormData((p) => ({ ...p, renewalDate: e.target.value }))}
                      style={inpS}
                    />
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelS}>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    style={{ ...inpS, minHeight: 60 }}
                    placeholder="Assignment notes..."
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
              /* SCREEN 1: ADD NEW PRODUCT */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ padding: '24px', display: 'flex', gap: 24, overflowY: 'auto', maxHeight: '70vh' }}>
                  {/* Left Column */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Mode selected via tab switcher above */}

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
                              background: 'var(--brand-color-light)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              marginBottom: 8
                            }}>
                              <Download size={24} style={{ color: brand }} />
                            </div>
                            <span style={{ fontSize: 13, color: text, fontWeight: 650 }}>Digital Product Icon</span>
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
                            <span style={{ fontSize: 13, color: text, fontWeight: 650 }}>Virtual Service Icon</span>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, opacity: (customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime') ? 0.5 : 1 }}>
                        <input
                          type="checkbox"
                          id="has-renewal"
                          disabled={customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime'}
                          checked={customForm.hasRenewal}
                          onChange={(e) => setCustomForm(p => ({ ...p, hasRenewal: e.target.checked }))}
                          style={{
                            width: 15,
                            height: 15,
                            accentColor: brand,
                            cursor: (customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime') ? 'not-allowed' : 'pointer'
                          }}
                        />
                        <label
                          htmlFor="has-renewal"
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: text,
                            cursor: (customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime') ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Enable Renewal (Yes / No) {(customForm.accessMethod === 'one_time' || customForm.duration === 'lifetime') && (
                            <span style={{ fontSize: 11, fontWeight: 500, color: subText }}>
                              (Disabled for {customForm.duration === 'lifetime' ? 'Lifetime License' : 'One-Time Purchase'})
                            </span>
                          )}
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
                                <span style={{ fontSize: 13, fontWeight: 650, color: text }}>License Registration + Automatic Updates</span>
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
                                <span style={{ fontSize: 13, fontWeight: 650, color: text }}>Manual Updates (No License Required)</span>
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
                                <span style={{ fontSize: 13, fontWeight: 650, color: text }}>One-Time Purchase</span>
                              </div>
                              <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>No updates, no license registration needed.</div>
                            </div>
                          </div>
                        </div>
                      </div>
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
              /* SCREEN 2: ASSIGN PARAMETERS */
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
                    {/* Left Column: LICENSE INFORMATION */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        LICENSE INFORMATION
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
                    </div>
                  </div>

                  {/* Domain */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelS}>Domain <span style={{ fontWeight: 400, color: subText, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(Optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. example.com or https://example.com"
                      value={assignForm.domain}
                      onChange={(e) => setAssignForm(p => ({ ...p, domain: e.target.value }))}
                      style={inpS}
                    />
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
                      border: `1.5px solid ${borderStrong}`,
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
