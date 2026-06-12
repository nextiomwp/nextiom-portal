import React from 'react';
import { X, Download, Layers, Shield, RefreshCw, Calendar, Key, FileText, CheckCircle2, Clock, BadgeCheck, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ViewAssignedProductDialog({ open, onOpenChange, license, product, customer, c }) {
  const { toast } = useToast();

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
  const panel = theme.panel2 || '#22252C';
  const overlay = 'rgba(0,0,0,0.6)';

  const handleCopy = (textToCopy, label) => {
    navigator.clipboard.writeText(textToCopy);
    toast({ title: 'Copied!', description: `${label} copied to clipboard.` });
  };

  const formattedDate = (dStr) => {
    if (!dStr) return '—';
    try {
      return new Date(dStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const lt = license.license_type || product.license_type || 'one_time';
  const licenseLabel = lt === 'one_time' ? 'One Time Purchase' : lt === 'yearly' ? 'Yearly Subscription' : lt === 'monthly' ? 'Monthly Subscription' : 'Lifetime License';

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
          maxWidth: 900,
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
            <div style={{ fontWeight: 700, fontSize: 16, color: text }}>Assigned Product Details</div>
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

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: 24, overflowY: 'auto', maxHeight: '70vh' }}>
          
          {/* Left Block: Product Profile & Notes */}
          <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Product Summary Card */}
            <div style={{ background: panel, borderRadius: 12, border: `1px solid ${border}`, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: product.category === 'virtual' 
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))' 
                    : `linear-gradient(135deg, ${brand}15, ${brand}05)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${product.category === 'virtual' ? 'rgba(99,102,241,0.15)' : `${brand}15`}`
                }}>
                  {product.category === 'virtual' ? (
                    <Layers size={20} style={{ color: '#6366f1' }} />
                  ) : (
                    <Download size={20} style={{ color: brand }} />
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: text, margin: 0 }}>{product.name}</h4>
                  <span style={{ fontSize: 11, fontWeight: 650, color: brand, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {product.type} • {product.category === 'digital' ? 'Digital Product' : 'Virtual Service'}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: subText, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Master Product Description</span>
                  <p style={{ fontSize: 12.5, color: text, margin: 0, lineHeight: 1.4, opacity: 0.9 }}>
                    {product.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Assignment Notes */}
            <div style={{ background: panel, borderRadius: 12, border: `1px solid ${border}`, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: brand }}>
                <FileText size={16} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignment Notes / Description</span>
              </div>
              <p style={{ fontSize: 13, color: text, margin: 0, lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                {license.notes || <span style={{ color: subText, fontStyle: 'italic' }}>No notes or custom descriptions set for this assignment.</span>}
              </p>
            </div>
          </div>

          {/* Right Block: License details, Status & Dates */}
          <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status & Plan Info */}
            <div style={{ background: panel, borderRadius: 12, border: `1px solid ${border}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: subText, display: 'flex', alignItems: 'center', gap: 6 }}><BadgeCheck size={14} /> License Status</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12,
                  background: license.status === 'Active' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: license.status === 'Active' ? '#22c55e' : '#ef4444',
                  textTransform: 'uppercase', letterSpacing: '0.02em'
                }}>{license.status || 'Active'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: subText, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> Service Plan</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{license.membership_type || licenseLabel}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: subText, display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Version</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{license.version || '1.0.0'}</span>
              </div>

              {/* License Key (If exists) */}
              {license.license_key && (
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: subText, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>License Key</span>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8, background: theme.bg, border: `1px solid ${border}`
                  }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: text, fontWeight: 600 }}>{license.license_key}</span>
                    <button
                      onClick={() => handleCopy(license.license_key, 'License Key')}
                      style={{ background: 'none', border: 'none', color: brand, cursor: 'pointer', display: 'flex', padding: 4 }}
                      title="Copy Key"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Download URL (If exists) */}
              {license.download_url && (
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: subText, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Download URL</span>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8, background: theme.bg, border: `1px solid ${border}`
                  }}>
                    <a href={license.download_url} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 12, color: brand, textDecoration: 'none', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      {license.download_url} <ExternalLink size={11} />
                    </a>
                    <button
                      onClick={() => handleCopy(license.download_url, 'Download URL')}
                      style={{ background: 'none', border: 'none', color: brand, cursor: 'pointer', display: 'flex', padding: 4 }}
                      title="Copy URL"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing & Dates */}
            <div style={{ background: panel, borderRadius: 12, border: `1px solid ${border}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 11, color: subText, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Price</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: text }}>
                    {license.currency === 'LKR' ? 'Rs. ' : '$'}{Number(license.price || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: subText, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Renewal Price</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: text }}>
                    {license.currency === 'LKR' ? 'Rs. ' : '$'}{Number(license.renewal_price || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div style={{ height: 1, background: border, margin: '4px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 11, color: subText, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> Purchase Date</span>
                  <span style={{ fontSize: 12.5, fontWeight: 550, color: text, marginTop: 2 }}>{formattedDate(license.purchase_date)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 11, color: subText, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> Start Date</span>
                  <span style={{ fontSize: 12.5, fontWeight: 550, color: text, marginTop: 2 }}>{formattedDate(license.start_date)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 11, color: subText, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> Expiry Date</span>
                  <span style={{ fontSize: 12.5, fontWeight: 550, color: text, marginTop: 2 }}>
                    {lt === 'yearly' || lt === 'monthly'
                      ? (license.expiry_date ? formattedDate(license.expiry_date) : '—')
                      : lt === 'lifetime' ? 'Lifetime (No Expiry)' : 'One Time Purchase'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 11, color: subText, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> Renewal Date</span>
                  <span style={{ fontSize: 12.5, fontWeight: 550, color: text, marginTop: 2 }}>{formattedDate(license.renewal_date)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              background: brand,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
