import React, { useState, useEffect } from 'react';
import { Package, Download, RefreshCw, Infinity, CheckCircle, AlertCircle, Clock, Layers, Eye, X, Key, Calendar, DollarSign, Shield, Zap, Tag } from 'lucide-react';
import { getLicenses, incrementDownloadCount } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const LICENSE_CFG = {
  one_time:  { label: 'One Time Purchase', icon: Package,   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  yearly:    { label: 'Yearly Renewal',    icon: RefreshCw, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  lifetime:  { label: 'Lifetime License',  icon: Infinity,  color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
};

function getValidity(license) {
  const lt = license.product?.license_type || license.license_type || 'one_time';
  if (lt === 'lifetime') return { valid: true, label: 'Lifetime', days: null };
  if (lt === 'one_time') {
    const used = (license.download_count || 0) >= 1;
    return { valid: !used, label: used ? 'Download Used' : 'One Time Download', days: null, downloadUsed: used };
  }
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
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [detailLicense, setDetailLicense] = useState(null);
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
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: text, fontSize: 22, fontWeight: 700, margin: 0 }}>My Products</h2>
        <p style={{ color: sub, fontSize: 14, marginTop: 4 }}>Your licensed software and downloads</p>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180, padding: '8px 13px', borderRadius: 8,
            border: `1px solid ${border}`, background: panel, color: text,
            outline: 'none', fontSize: 14,
          }}
        />
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`,
            background: panel, color: text, cursor: 'pointer', fontSize: 13,
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {sortDir === 'desc' ? '↓ Newest First' : '↑ Oldest First'}
        </button>
      </div>

      {(() => {
        const filtered = licenses
          .filter(l => !search || (l.name || '').toLowerCase().includes(search.toLowerCase()) || (l.product?.type || '').toLowerCase().includes(search.toLowerCase()))
          .sort((a, b) => {
            const da = new Date(a.created_at || 0);
            const db = new Date(b.created_at || 0);
            return sortDir === 'desc' ? db - da : da - db;
          });
        return filtered.length === 0 && licenses.length > 0 ? (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <p style={{ color: sub }}>No products match your search.</p>
          </div>
        ) : null;
      })()}

      {/* Detail Modal */}
      {detailLicense && (() => {
        const dp = detailLicense.product || {};
        const dIsVirtual = dp.category === 'virtual';
        const dlt = dp.license_type || detailLicense.license_type || 'one_time';
        const dcfg = LICENSE_CFG[dlt] || LICENSE_CFG.one_time;
        const DLtIcon = dcfg.icon;
        const dValidity = getValidity(detailLicense);
        const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
        const Row = ({ icon: Icon, label, value, mono }) => value ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: `1px solid ${border}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: panel, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 14, height: 14, color: brand }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: sub, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</p>
              <p style={{ color: text, fontSize: 13, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all', margin: 0 }}>{value}</p>
            </div>
          </div>
        ) : null;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setDetailLicense(null)}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'relative', background: card, borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: `1px solid ${border}` }}
              onClick={e => e.stopPropagation()}>
              {/* Image banner */}
              {dp.image_url ? (
                <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                  <img src={dp.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7))' }} />
                  <p style={{ position: 'absolute', bottom: 12, left: 16, color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>{detailLicense.name}</p>
                </div>
              ) : (
                <div style={{ height: 80, background: 'linear-gradient(135deg,#4F46E5,#6366f1)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                  {dIsVirtual ? <Layers style={{ width: 28, height: 28, color: '#fff', marginRight: 12 }} /> : <Package style={{ width: 28, height: 28, color: '#fff', marginRight: 12 }} />}
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>{detailLicense.name}</p>
                </div>
              )}

              {/* Header strip */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${border}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
                    background: dIsVirtual ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.12)',
                    color: dIsVirtual ? '#6366f1' : '#22c55e' }}>
                    {dIsVirtual ? 'Virtual' : 'Digital'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: dcfg.bg }}>
                    <DLtIcon style={{ width: 11, height: 11, color: dcfg.color }} />
                    <span style={{ color: dcfg.color, fontSize: 11, fontWeight: 500 }}>{dcfg.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
                    background: detailLicense.status === 'Active' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: detailLicense.status === 'Active' ? '#22c55e' : '#ef4444' }}>
                    {detailLicense.status}
                  </span>
                </div>
                <button onClick={() => setDetailLicense(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: sub, padding: 4 }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {/* Content */}
              <div style={{ overflowY: 'auto', padding: '4px 20px 20px' }}>
                {dp.description && <p style={{ color: sub, fontSize: 13, margin: '12px 0' }}>{dp.description}</p>}

                {dp.price != null && <Row icon={DollarSign} label="Purchase Price" value={`$${Number(dp.price).toFixed(2)}`} />}
                {dp.renewal_price != null && <Row icon={RefreshCw} label="Renewal Price" value={`$${Number(dp.renewal_price).toFixed(2)}`} />}
                {detailLicense.license_key && <Row icon={Key} label="License Key" value={detailLicense.license_key} mono />}
                {detailLicense.expiry_date && <Row icon={Calendar} label="Expiry Date" value={fmt(detailLicense.expiry_date)} />}
                {dp.renewal_date && <Row icon={Calendar} label="Renewal Date" value={fmt(dp.renewal_date)} />}
                {detailLicense.start_date && <Row icon={Calendar} label="Start Date" value={fmt(detailLicense.start_date)} />}
                {detailLicense.created_at && <Row icon={Clock} label="Assigned On" value={fmt(detailLicense.created_at)} />}
                {dp.renewal_period_days && <Row icon={Clock} label="Validity Period" value={`${dp.renewal_period_days} days`} />}
                {dp.type && <Row icon={Package} label="Product Type" value={dp.type} />}

                {!dIsVirtual && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ color: sub, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Features</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {dp.license_registration && <span style={{ padding: '4px 10px', borderRadius: 20, background: panel, color: text, fontSize: 12 }}>License Registration</span>}
                      {dp.manual_updates && <span style={{ padding: '4px 10px', borderRadius: 20, background: panel, color: text, fontSize: 12 }}>Manual Updates</span>}
                      {dp.automatic_updates && <span style={{ padding: '4px 10px', borderRadius: 20, background: panel, color: text, fontSize: 12 }}>Automatic Updates</span>}
                    </div>
                  </div>
                )}

                {/* Validity status */}
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10,
                  background: dValidity.valid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${dValidity.valid ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', alignItems: 'center', gap: 8 }}>
                  {dValidity.valid
                    ? <CheckCircle style={{ width: 16, height: 16, color: '#22c55e' }} />
                    : <AlertCircle style={{ width: 16, height: 16, color: '#ef4444' }} />}
                  <span style={{ color: dValidity.valid ? '#22c55e' : '#ef4444', fontWeight: 500, fontSize: 13 }}>
                    {dValidity.valid ? `Active — ${dValidity.label}` : 'License Expired / Used'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {licenses.length === 0 ? (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <Package style={{ width: 40, height: 40, color: sub, margin: '0 auto 12px' }} />
          <p style={{ color: text, fontWeight: 500 }}>No products assigned yet</p>
          <p style={{ color: sub, fontSize: 13, marginTop: 4 }}>Products assigned to your account will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {licenses
            .filter(l => !search || (l.name || '').toLowerCase().includes(search.toLowerCase()) || (l.product?.type || '').toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
              const da = new Date(a.created_at || 0), db = new Date(b.created_at || 0);
              return sortDir === 'desc' ? db - da : da - db;
            })
            .map(license => {
              const product = license.product || {};
              const lt = license.license_type || product.license_type || 'one_time';
              
              let accessMethod = 'one_time';
              if (product.license_registration || product.automatic_updates) {
                accessMethod = 'license_auto';
              } else if (product.manual_updates) {
                accessMethod = 'manual_no_license';
              }

              const formatDateSlash = (dateStr) => {
                if (!dateStr) return '—';
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return '—';
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${mm}/${dd}/${yyyy}`;
              };

              const getCardMetadata = () => {
                if (accessMethod === 'license_auto') {
                  if (lt === 'monthly') {
                    return {
                      header: 'License + Auto Monthly',
                      color: '#818cf8',
                      icon: Shield,
                      badge: 'Monthly Subscription',
                      badgeType: 'purple'
                    };
                  } else if (lt === 'lifetime') {
                    return {
                      header: 'License + Auto Lifetime',
                      color: '#22c55e', // Green for lifetime
                      icon: Shield,
                      badge: 'Lifetime License | Never Expires',
                      badgeType: 'green'
                    };
                  } else {
                    return {
                      header: 'License + Auto Yearly',
                      color: '#818cf8',
                      icon: Shield,
                      badge: 'Yearly Subscription',
                      badgeType: 'purple'
                    };
                  }
                } else if (accessMethod === 'manual_no_license') {
                  if (lt === 'monthly') {
                    return {
                      header: 'Manual Updates Monthly',
                      color: '#60a5fa',
                      icon: RefreshCw,
                      badge: 'Manual Updates | Monthly Access',
                      badgeType: 'blue'
                    };
                  } else if (lt === 'lifetime') {
                    return {
                      header: 'Manual Updates Lifetime',
                      color: '#60a5fa',
                      icon: RefreshCw,
                      badge: 'Lifetime Manual Updates',
                      badgeType: 'blue'
                    };
                  } else {
                    return {
                      header: 'Manual Updates Yearly',
                      color: '#60a5fa',
                      icon: RefreshCw,
                      badge: 'Manual Updates | Yearly Access',
                      badgeType: 'blue'
                    };
                  }
                } else {
                  return {
                    header: 'One-Time Purchase',
                    color: '#22c55e',
                    icon: Tag,
                    badge: 'One-Time Purchase | No License | No Updates',
                    badgeType: 'green'
                  };
                }
              };

              const meta = getCardMetadata();
              const HeaderIcon = meta.icon;
              const hasLicenseKey = accessMethod === 'license_auto';
              const isLifetime = lt === 'lifetime';
              const isOneTime = accessMethod === 'one_time';

              return (
                <div
                  key={license.id}
                  style={{
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Colored Header Band */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(0,0,0,0.15)',
                    }}
                  >
                    <HeaderIcon size={14} style={{ color: meta.color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                      {meta.header}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    {/* Product Name */}
                    <div style={{ marginBottom: 4 }}>
                      <p style={{ color: text, fontWeight: 700, fontSize: 15, margin: 0 }}>
                        {license.name}
                      </p>
                      {product.type && <p style={{ color: sub, fontSize: 11.5, marginTop: 2, margin: 0 }}>{product.type}</p>}
                    </div>

                    {/* Fields */}
                    {hasLicenseKey && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                          License Key
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.06)',
                          background: 'rgba(0,0,0,0.2)',
                          color: text,
                          fontSize: 12.5,
                          fontFamily: 'monospace',
                          wordBreak: 'break-all'
                        }}>
                          <span>{license.license_key || '—'}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                        {isOneTime ? 'Purchase Date' : 'Start Date'}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(0,0,0,0.2)',
                        color: text,
                        fontSize: 12.5
                      }}>
                        <span>{formatDateSlash(isOneTime ? license.created_at : license.start_date)}</span>
                        <Calendar size={13} style={{ color: sub }} />
                      </div>
                    </div>

                    {!isLifetime && !isOneTime && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                          Expiry Date
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.06)',
                          background: 'rgba(0,0,0,0.2)',
                          color: text,
                          fontSize: 12.5
                        }}>
                          <span>{formatDateSlash(license.expiry_date)}</span>
                          <Calendar size={13} style={{ color: sub }} />
                        </div>
                      </div>
                    )}

                    {/* Badge */}
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      textAlign: 'center',
                      fontSize: 11.5,
                      fontWeight: 600,
                      marginTop: 'auto',
                      border: meta.badgeType === 'green' ? 'none' : `1px solid ${meta.color}33`,
                      background: meta.badgeType === 'green' ? 'rgba(34,197,94,0.12)' : `${meta.color}08`,
                      color: meta.badgeType === 'green' ? '#22c55e' : meta.color
                    }}>
                      {meta.badge}
                    </div>

                    {/* Preview Button */}
                    <button
                      onClick={() => setDetailLicense(license)}
                      style={{
                        width: '100%',
                        padding: '9px 0',
                        borderRadius: 8,
                        border: `1px solid ${border}`,
                        background: 'rgba(255,255,255,0.03)',
                        color: text,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        marginTop: 4
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.borderColor = brand;
                        e.currentTarget.style.color = brand;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = border;
                        e.currentTarget.style.color = text;
                      }}
                    >
                      Preview
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
