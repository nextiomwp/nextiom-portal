import React, { useState, useEffect } from 'react';
import { Package, Download, RefreshCw, Infinity, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { getLicenses } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const LICENSE_CFG = {
  one_time:  { label: 'One Time Purchase', icon: Package,   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  yearly:    { label: 'Yearly Renewal',    icon: RefreshCw, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  lifetime:  { label: 'Lifetime License',  icon: Infinity,  color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
};

function getValidity(license) {
  const lt = license.product?.license_type || license.license_type || 'one_time';
  if (lt === 'lifetime' || lt === 'one_time') return { valid: true, label: lt === 'lifetime' ? 'Lifetime' : 'Permanent', days: null };
  if (lt === 'yearly' && license.expiry_date) {
    const days = Math.ceil((new Date(license.expiry_date) - new Date()) / 86400000);
    if (days <= 0) return { valid: false, label: 'Expired', days: 0 };
    return { valid: true, label: `${days}d remaining`, days };
  }
  return { valid: true, label: 'Active', days: null };
}

function triggerDownload(url, name) {
  if (!url) return;
  const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdriveMatch) {
    window.open(`https://drive.google.com/uc?export=download&id=${gdriveMatch[1]}`, '_blank');
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = name || 'product';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function MyProductsPage({ user, isDark, c }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const bg = c?.bg || (isDark ? '#15161A' : '#f8f8f7');
  const card = c?.card || (isDark ? '#1C1E24' : '#fff');
  const panel = c?.panel2 || (isDark ? '#22252C' : '#f5f5f5');
  const border = c?.border || (isDark ? 'rgba(255,255,255,0.06)' : '#ebebeb');
  const text = c?.text || (isDark ? '#fff' : '#1a1a1a');
  const sub = c?.subText || (isDark ? '#a0a0a0' : '#888');
  const brand = c?.brand || '#E87B35';
  const brandLight = c?.brandLight || (isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.1)');

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  async function load() {
    setLoading(true);
    try {
      const data = await getLicenses(user.id);
      setLicenses(data);
    } catch {
      toast({ title: 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${brand}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: text, fontSize: 22, fontWeight: 700, margin: 0 }}>My Products</h2>
        <p style={{ color: sub, fontSize: 14, marginTop: 4 }}>Your licensed software and downloads</p>
      </div>

      {licenses.length === 0 ? (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <Package style={{ width: 40, height: 40, color: sub, margin: '0 auto 12px' }} />
          <p style={{ color: text, fontWeight: 500 }}>No products assigned yet</p>
          <p style={{ color: sub, fontSize: 13, marginTop: 4 }}>Products assigned to your account will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {licenses.map(license => {
            const product = license.product || {};
            const lt = product.license_type || license.license_type || 'one_time';
            const cfg = LICENSE_CFG[lt] || LICENSE_CFG.one_time;
            const LtIcon = cfg.icon;
            const validity = getValidity(license);
            const downloadUrl = product.download_url;
            const isValid = license.status === 'Active' && validity.valid;

            return (
              <div key={license.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#4F46E5,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package style={{ width: 20, height: 20, color: '#fff' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: text, fontWeight: 600, fontSize: 15, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {license.name}
                    </p>
                    {product.type && <p style={{ color: sub, fontSize: 12, marginTop: 2 }}>{product.type}</p>}
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p style={{ color: sub, fontSize: 13, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.description}
                  </p>
                )}

                {/* License type badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: cfg.bg, width: 'fit-content' }}>
                  <LtIcon style={{ width: 13, height: 13, color: cfg.color }} />
                  <span style={{ color: cfg.color, fontSize: 12, fontWeight: 500 }}>{cfg.label}</span>
                </div>

                {/* Validity */}
                <div style={{ display: 'flex', align: 'center', gap: 6 }}>
                  {validity.valid ? (
                    <CheckCircle style={{ width: 14, height: 14, color: '#22c55e', marginTop: 1 }} />
                  ) : (
                    <AlertCircle style={{ width: 14, height: 14, color: '#ef4444', marginTop: 1 }} />
                  )}
                  <span style={{ color: validity.valid ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 500 }}>
                    {validity.valid ? validity.label : 'License Expired'}
                  </span>
                  {validity.days !== null && validity.days > 0 && validity.days <= 30 && (
                    <span style={{ color: '#f59e0b', fontSize: 12, marginLeft: 4 }}>⚠ Renew soon</span>
                  )}
                </div>

                {/* License key */}
                {license.license_key && (
                  <div style={{ background: panel, borderRadius: 6, padding: '6px 10px' }}>
                    <p style={{ color: sub, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>LICENSE KEY</p>
                    <p style={{ color: text, fontSize: 12, fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>
                      {license.license_key}
                    </p>
                  </div>
                )}

                {/* Download button */}
                <button
                  onClick={() => {
                    if (!isValid) {
                      toast({ title: 'License Expired', description: 'Your license has expired. Please renew to download.', variant: 'destructive' });
                      return;
                    }
                    if (!downloadUrl) {
                      toast({ title: 'No download available', description: 'Download URL not configured for this product.', variant: 'destructive' });
                      return;
                    }
                    triggerDownload(downloadUrl, license.name);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                    background: isValid && downloadUrl ? brand : panel,
                    color: isValid && downloadUrl ? '#fff' : sub,
                    cursor: isValid && downloadUrl ? 'pointer' : 'not-allowed',
                    fontSize: 14, fontWeight: 500, transition: 'opacity 0.15s',
                    marginTop: 'auto',
                  }}
                  onMouseEnter={e => { if (isValid && downloadUrl) e.currentTarget.style.opacity = '0.88'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <Download style={{ width: 15, height: 15 }} />
                  {isValid ? 'Download Product' : 'License Expired'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
