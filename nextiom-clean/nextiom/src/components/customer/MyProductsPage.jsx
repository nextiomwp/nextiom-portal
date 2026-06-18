import React, { useState, useEffect } from 'react';
import { Package, Download, RefreshCw, Infinity, CheckCircle, AlertCircle, Clock, Layers, Eye, X, Key, Calendar, DollarSign, Shield, Zap, Tag, MoreVertical, Search, ChevronDown, ChevronLeft, ChevronRight, Check, Copy, FileText, Globe } from 'lucide-react';
import { getLicenses, incrementDownloadCount } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const LICENSE_CFG = {
  one_time:  { label: 'One Time Purchase', icon: Package,   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  yearly:    { label: 'Yearly Renewal',    icon: RefreshCw, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  lifetime:  { label: 'Lifetime License',  icon: Infinity,  color: '#E87B35', bg: 'rgba(232,123,53,0.12)' },
};

function getValidity(license) {
  if (license.status === 'Disabled' || license.status === 'Suspended' || license.status === 'Expired') {
    return { valid: false, label: license.status, days: null };
  }
  const lt = license.license_type || license.product?.license_type || 'one_time';
  if (lt === 'lifetime') return { valid: true, label: 'Lifetime', days: null };
  if (lt === 'one_time') {
    const used = (license.download_count || 0) >= 1;
    return { valid: !used, label: used ? 'Download Used' : 'One Time Download', days: null, downloadUsed: used };
  }
  if ((lt === 'yearly' || lt === 'monthly') && license.expiry_date) {
    const days = Math.ceil((new Date(license.expiry_date) - new Date()) / 86400000);
    if (days <= 0) return { valid: false, label: 'Expired', days: 0 };
    return { valid: true, label: `${days}d remaining`, days };
  }
  return { valid: true, label: 'Active', days: null };
}

function getLicenseStatus(license) {
  if (license.status === 'Disabled' || license.status === 'Suspended') {
    return license.status;
  }
  if (license.status === 'Expired') {
    return 'Expired';
  }
  const validity = getValidity(license);
  const lt = license.license_type || license.product?.license_type || 'one_time';
  if (lt === 'lifetime') {
    return 'Active';
  }
  if (lt === 'one_time') {
    return validity.downloadUsed ? 'Expired' : 'Active';
  }
  if (lt === 'yearly' || lt === 'monthly') {
    if (validity.days <= 0) return 'Expired';
    if (validity.days <= 5) return 'Expiring Soon';
    return 'Active';
  }
  return 'Active';
}

function getProductTheme(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('sample') || lower.includes('plugin')) {
    return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: Package };
  }
  if (lower.includes('elementor') || lower.includes('addon')) {
    return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: Layers };
  }
  if (lower.includes('astra')) {
    return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: Shield };
  }
  if (lower.includes('woocommerce') || lower.includes('woo')) {
    return { bg: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', icon: Zap };
  }
  if (lower.includes('discount') || lower.includes('pc wallpaper') || lower.includes('wallpaper')) {
    return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: Tag };
  }
  
  const charCode = lower.charCodeAt(0) || 0;
  const colors = [
    { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: Package },
    { bg: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', icon: Layers },
    { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: Shield },
    { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', icon: Zap },
    { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: Tag }
  ];
  return colors[charCode % colors.length];
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

function getExpiredText(date) {
  if (!date) return 'Expired';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(date);
  exp.setHours(0, 0, 0, 0);
  const diff = today.getTime() - exp.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Expired today';
  if (days === 1) return 'Expired 1 day ago';
  return `Expired ${days} days ago`;
}

const getStatusBadgeConfig = (status, validity, lic, lt) => {
  const s = String(status || '').toLowerCase();
  
  if (s === 'active') {
    return {
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.15)',
      color: '#22c55e',
      text: 'ACTIVE',
      detailText: 'Active Product',
      icon: <CheckCircle size={15} />,
      expiryText: lt === 'lifetime' ? 'Never expires' : (validity && validity.days != null) ? `${validity.days} days remaining` : (validity ? validity.label : 'Active'),
      standingBg: 'rgba(34,197,94,0.05)',
      standingBorder: 'rgba(34,197,94,0.1)',
      standingColor: '#22c55e',
      standingTitle: 'Your product is active and in good standing.',
      standingDesc: 'Thank you for being a valued customer!'
    };
  }
  
  if (s === 'expiring soon') {
    return {
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.15)',
      color: '#f59e0b',
      text: 'EXPIRING SOON',
      detailText: 'Expiring Soon',
      icon: <AlertCircle size={15} />,
      expiryText: (validity && validity.days != null) ? `${validity.days} days remaining` : (validity ? validity.label : 'Expiring Soon'),
      standingBg: 'rgba(245,158,11,0.05)',
      standingBorder: 'rgba(245,158,11,0.1)',
      standingColor: '#f59e0b',
      standingTitle: 'Your product expires soon.',
      standingDesc: 'Please contact support soon to avoid service disruptions.'
    };
  }

  if (s === 'disabled') {
    return {
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.15)',
      color: '#f59e0b',
      text: 'DISABLED',
      detailText: 'Expiring Soon',
      icon: <AlertCircle size={15} />,
      expiryText: 'Disabled',
      standingBg: 'rgba(245,158,11,0.05)',
      standingBorder: 'rgba(245,158,11,0.1)',
      standingColor: '#f59e0b',
      standingTitle: 'Your product expires soon.',
      standingDesc: 'Please contact support soon to avoid service disruptions.'
    };
  }

  // All other states (Expired, Suspended) get red badge styling
  let label = 'EXPIRED';
  let detailLabel = 'Expired License';
  let standingTitle = 'Your product is expired.';
  if (s === 'suspended') {
    label = 'SUSPENDED';
    detailLabel = 'Suspended License';
    standingTitle = 'Your product is suspended.';
  }

  return {
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    text: label,
    detailText: detailLabel,
    icon: <AlertCircle size={15} />,
    expiryText: (lic && lic.expiry_date) ? getExpiredText(lic.expiry_date) : (validity ? validity.label : label),
    standingBg: 'rgba(239,68,68,0.05)',
    standingBorder: 'rgba(239,68,68,0.1)',
    standingColor: '#ef4444',
    standingTitle: standingTitle,
    standingDesc: 'Please contact our support department to renew your product.'
  };
};

export default function MyProductsPage({ user, isDark, c }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [detailLicense, setDetailLicense] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);
  const { toast } = useToast();
  const [selectedNoteLicense, setSelectedNoteLicense] = useState(null);

  const bg = c?.bg || (isDark ? '#15161A' : '#f8f8f7');
  const card = c?.card || (isDark ? '#1C1E24' : '#fff');
  const panel = c?.panel2 || (isDark ? '#22252C' : '#f5f5f5');
  const border = c?.border || (isDark ? 'rgba(255, 255, 255, 0.06)' : '#ebebeb');
  const hover = c?.hover || (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f5f5f5');
  const text = c?.text || (isDark ? '#fff' : '#1a1a1a');
  const sub = c?.subText || (isDark ? '#a0a0a0' : '#888');
  const brand = c?.brand || '#E87B35';

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleDownload = async (license) => {
    const downloadUrl = license.download_url || license.product?.download_url;
    if (!downloadUrl) {
      toast({ title: 'Download URL not available for this product', variant: 'destructive' });
      return;
    }
    try {
      await incrementDownloadCount(license.id);
      triggerDownload(downloadUrl, license.name);
      toast({ title: 'Download started successfully' });
      load();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to start download', variant: 'destructive' });
    }
  };

  const formatPrice = (price, currency) => {
    if (price == null) return '—';
    const cur = String(currency || '').trim().toUpperCase();
    return cur === 'LKR' ? `Rs. ${Number(price).toFixed(2)}` : `$${Number(price).toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const filtered = licenses
    .filter(l => {
      const matchesSearch = !search || 
        (l.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (l.product?.type || '').toLowerCase().includes(search.toLowerCase());
      
      if (statusFilter === 'all') return matchesSearch;
      const status = getLicenseStatus(l);
      return matchesSearch && status === statusFilter;
    });

  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.created_at || 0);
    const db = new Date(b.created_at || 0);
    return sortDir === 'desc' ? db - da : da - db;
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    if (detailLicense) {
      const existsInSorted = sorted.some(l => l.id === detailLicense.id);
      if (!existsInSorted) {
        setDetailLicense(null);
      }
    }
  }, [search, statusFilter, licenses]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${brand}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const renderProductIcon = (name) => {
    const theme = getProductTheme(name);
    const Icon = theme.icon;
    const lower = (name || '').toLowerCase();
    
    let textLabel = null;
    if (lower.includes('woocommerce')) textLabel = 'Woo';
    else if (lower.includes('astra')) textLabel = 'A';
    else if (lower.includes('discount')) textLabel = 'D';

    return (
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        backgroundColor: theme.color, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700,
        fontSize: textLabel ? (textLabel.length > 1 ? 12 : 18) : 16,
        flexShrink: 0
      }}>
        {textLabel ? textLabel : <Icon size={20} />}
      </div>
    );
  };

  const renderDetailPanelContent = (lic, showClose = false) => {
    const dp = lic.product || {};
    const lt = lic.license_type || dp.license_type || 'one_time';
    const validity = getValidity(lic);
    const status = getLicenseStatus(lic);
    const theme = getProductTheme(lic.name);

    const licenseTypeLabel = 
      lt === 'lifetime' ? 'Lifetime License' :
      lt === 'yearly' ? 'Yearly Renewal' :
      lt === 'monthly' ? 'Monthly Renewal' : 'One Time Purchase';

    let textLabel = null;
    const nameLower = (lic.name || '').toLowerCase();
    if (nameLower.includes('woocommerce')) textLabel = 'Woo';
    else if (nameLower.includes('astra')) textLabel = 'A';
    else if (nameLower.includes('discount')) textLabel = 'D';

    const showRenewal = dp.renewal_enabled && (lt === 'yearly' || lt === 'monthly');
    const isVirtual = dp.category === 'virtual';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Active Status Alert Banner */}
          {(() => {
            const badgeCfg = getStatusBadgeConfig(status, validity, lic, lt);
            return (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 8,
                background: badgeCfg.bg,
                border: `1px solid ${badgeCfg.border}`,
                color: badgeCfg.color,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                  {badgeCfg.icon}
                  <span>{badgeCfg.detailText}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>
                    {badgeCfg.expiryText}
                  </span>
                  {showClose && (
                    <button
                      onClick={() => setDetailLicense(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: badgeCfg.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        opacity: 0.8
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Pricing Metrics Box Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10,
              background: panel, border: `1px solid ${border}`
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: `${brand}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: brand, flexShrink: 0
              }}>
                <DollarSign size={14} />
              </div>
              <div>
                <p style={{ color: sub, fontSize: 10.5, fontWeight: 500, margin: 0 }}>Purchase Price</p>
                <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: '1px 0 0' }}>{formatPrice(lic.price !== undefined && lic.price !== null ? lic.price : dp.price, lic.currency || dp.currency)}</p>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10,
              background: panel, border: `1px solid ${border}`
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', flexShrink: 0
              }}>
                <RefreshCw size={13} />
              </div>
              <div>
                <p style={{ color: sub, fontSize: 10.5, fontWeight: 500, margin: 0 }}>Renewal Price</p>
                <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: '1px 0 0' }}>
                  {showRenewal ? `${formatPrice(lic.renewal_price !== undefined && lic.renewal_price !== null ? lic.renewal_price : dp.renewal_price, lic.currency || dp.currency)} / ${lt === 'yearly' ? 'Year' : 'Month'}` : 'Not Required'}
                </p>
              </div>
            </div>
          </div>

          {/* License Key Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Key size={14} style={{ color: brand }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>License Key</span>
            </div>
            {(() => {
              const activeKey = lic.license_key || dp.license_key;
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)',
                  border: `1px solid ${border}`,
                }}>
                  <span style={{ color: text, fontSize: 12.5, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                    {activeKey || '—'}
                  </span>
                  {activeKey && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                        toast({ title: 'License key copied to clipboard' });
                      }}
                      style={{
                        background: `${brand}18`, border: `1px solid ${brand}30`,
                        color: brand, padding: '4px 10px', borderRadius: 6, display: 'flex',
                        alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
                      }}
                    >
                      {copiedKey ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Subscription Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
              <Calendar size={14} style={{ color: brand }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Subscription Details</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: sub }}>Start Date</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: text }}>
                  <span>{formatDate(lic.start_date || lic.created_at)}</span>
                  <Calendar size={12} style={{ color: sub }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: sub }}>Expiry Date</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: text }}>
                  <span>{lt === 'lifetime' ? 'Lifetime' : formatDate(lic.expiry_date)}</span>
                  <Calendar size={12} style={{ color: sub }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: sub }}>Days Left</span>
                <span style={{ color: status === 'Active' ? '#22c55e' : ['Expired', 'Disabled', 'Suspended'].includes(status) ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                  {lt === 'lifetime' ? 'Never expires' : status === 'Expired' ? getExpiredText(lic.expiry_date) : validity.days != null ? `${validity.days} days` : validity.label}
                </span>
              </div>
            </div>
          </div>

          {/* Product Information Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
              <Package size={14} style={{ color: brand }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Product Information</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 12.5 }}>
                <span style={{ color: sub, flexShrink: 0 }}>Product Name</span>
                <span style={{ color: text, fontWeight: 600, textAlign: 'right', paddingLeft: 12 }}>{lic.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: sub }}>Product Type</span>
                <span style={{ color: text, fontWeight: 500 }}>{dp.type || 'Plugin'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: sub }}>Service Plan</span>
                <span style={{ color: text, fontWeight: 500 }}>{lic.membership_type || licenseTypeLabel}</span>
              </div>
              {lic.domain && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                  <span style={{ color: sub }}>Domain</span>
                  <span style={{ color: text, fontWeight: 500 }}>{lic.domain}</span>
                </div>
              )}
              {dp.description?.trim() && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <span style={{ color: sub, fontSize: 12.5 }}>Description</span>
                  <div style={{
                    color: text,
                    fontSize: 12,
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(0,0,0,0.15)',
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    padding: '8px 10px'
                  }}>
                    {dp.description.trim()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Downloads section - Hidden for Virtual services, documentation removed */}
          {!isVirtual && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
                <Download size={14} style={{ color: brand }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Downloads</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Main Product File Download */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: text, fontSize: 12.5, fontWeight: 600, margin: 0 }}>Main Product File</p>
                    <p style={{ color: sub, fontSize: 11, margin: '2px 0 0' }}>Version {dp.version || lic.version || '1.0.0'}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(lic)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 8,
                      background: `${brand}15`, border: `1.5px solid ${brand}30`,
                      color: brand, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${brand}25`;
                      e.currentTarget.style.borderColor = brand;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = `${brand}15`;
                      e.currentTarget.style.borderColor = `${brand}30`;
                    }}
                  >
                    <Download size={13} />
                    <span>Download Product</span>
                  </button>
                </div>

                {/* Documentation / Order Note Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px dashed ${border}`, paddingTop: 10 }}>
                  <div>
                    <p style={{ color: text, fontSize: 12.5, fontWeight: 600, margin: 0 }}>Documentation / Order Note</p>
                    <p style={{ color: sub, fontSize: 11, margin: '2px 0 0' }}>Help resources & guides</p>
                  </div>
                  <button
                    onClick={() => setSelectedNoteLicense(lic)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 8,
                      background: `${brand}15`, border: `1.5px solid ${brand}30`,
                      color: brand, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${brand}25`;
                      e.currentTarget.style.borderColor = brand;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = `${brand}15`;
                      e.currentTarget.style.borderColor = `${brand}30`;
                    }}
                  >
                    <FileText size={13} />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {isVirtual && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
                <FileText size={14} style={{ color: brand }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Resources</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: text, fontSize: 12.5, fontWeight: 600, margin: 0 }}>Documentation / Order Note</p>
                  <p style={{ color: sub, fontSize: 11, margin: '2px 0 0' }}>Help resources & guides</p>
                </div>
                <button
                  onClick={() => setSelectedNoteLicense(lic)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    background: `${brand}15`, border: `1.5px solid ${brand}30`,
                    color: brand, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${brand}25`;
                    e.currentTarget.style.borderColor = brand;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = `${brand}15`;
                    e.currentTarget.style.borderColor = `${brand}30`;
                  }}
                >
                  <FileText size={13} />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          )}

          {/* Features section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Features</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dp.license_registration && dp.automatic_updates && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, fontSize: 11.5, color: text }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Licenses</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, fontSize: 11.5, color: text }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Automatic update</span>
                  </div>
                </>
              )}
              {dp.manual_updates && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, fontSize: 11.5, color: text }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Manual Update</span>
                </div>
              )}
              {!dp.license_registration && !dp.automatic_updates && !dp.manual_updates && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, fontSize: 11.5, color: text }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>One time purchase</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Standing Banner */}
          {(() => {
            const badgeCfg = getStatusBadgeConfig(status, validity, lic, lt);
            return (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10,
                background: badgeCfg.standingBg,
                border: `1px solid ${badgeCfg.standingBorder}`,
                color: badgeCfg.standingColor
              }}>
                {status === 'Active' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 11 11 13 15 9"></polyline>
                  </svg>
                ) : (
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                )}
                <div style={{ fontSize: 12.5 }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>
                    {badgeCfg.standingTitle}
                  </p>
                  <p style={{ fontSize: 11, color: sub, margin: '2px 0 0' }}>
                    {badgeCfg.standingDesc}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '0 0 8px', display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div style={{ width: '100%', maxWidth: detailLicense && !isMobile ? 1280 : 1000, transition: 'max-width 0.2s ease' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: text, fontSize: 24, fontWeight: 700, margin: 0 }}>My Products</h2>
          <p style={{ color: sub, fontSize: 14, marginTop: 4 }}>Manage your licensed products, downloads and subscriptions.</p>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Main content column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Search, Filter, Layout toggles row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 320, flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1.2, minWidth: 200 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: sub }} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                    style={{
                      width: '100%', padding: '10px 14px 10px 36px', borderRadius: 8,
                      border: `1px solid ${border}`, background: panel, color: text,
                      outline: 'none', fontSize: 14,
                    }}
                  />
                </div>

                {/* Status Select */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    style={{
                      padding: '10px 36px 10px 14px', borderRadius: 8, border: `1px solid ${border}`,
                      background: panel, color: text, outline: 'none', fontSize: 14, cursor: 'pointer',
                      appearance: 'none', WebkitAppearance: 'none', minWidth: 130
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                    <option value="Disabled">Disabled</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: sub, pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Grid/List View Toggles */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: 10, borderRadius: 8, border: `1px solid ${border}`,
                    background: viewMode === 'grid' ? brand : panel,
                    color: viewMode === 'grid' ? '#fff' : sub,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: 10, borderRadius: 8, border: `1px solid ${border}`,
                    background: viewMode === 'list' ? brand : panel,
                    color: viewMode === 'list' ? '#fff' : sub,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Showing range */}
            <div style={{ color: sub, fontSize: 13, marginBottom: 16 }}>
              Showing {sorted.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} products
            </div>

            {/* List or Empty State */}
            {sorted.length === 0 ? (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
                <Package style={{ width: 40, height: 40, color: sub, margin: '0 auto 12px' }} />
                <p style={{ color: text, fontWeight: 500, margin: 0 }}>
                  {licenses.length === 0 ? 'No products assigned yet' : 'No products found'}
                </p>
                <p style={{ color: sub, fontSize: 13, marginTop: 4, margin: 0 }}>
                  {licenses.length === 0 
                    ? 'Products assigned to your account will appear here.' 
                    : 'No products match your search criteria.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {viewMode === 'list' ? (
                  /* LIST VIEW */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {paginated.map(license => {
                      const dp = license.product || {};
                      const status = getLicenseStatus(license);
                      const validity = getValidity(license);
                      const lt = license.license_type || dp.license_type || 'one_time';
                      const theme = getProductTheme(license.name);
                      const isSelected = detailLicense && detailLicense.id === license.id;

                      const licenseTypeLabel = 
                        lt === 'lifetime' ? 'Lifetime License' :
                        lt === 'yearly' ? 'Yearly Renewal' :
                        lt === 'monthly' ? 'Monthly Renewal' : 'One Time Purchase';

                      let textLabel = null;
                      const nameLower = (license.name || '').toLowerCase();
                      if (nameLower.includes('woocommerce')) textLabel = 'Woo';
                      else if (nameLower.includes('astra')) textLabel = 'A';
                      else if (nameLower.includes('discount')) textLabel = 'D';

                      const showRenewal = dp.renewal_enabled && (lt === 'yearly' || lt === 'monthly');

                      return (
                        <div
                          key={license.id}
                          onClick={() => setDetailLicense(license)}
                          style={{
                            background: card,
                            border: isSelected ? `1px solid ${brand}` : `1px solid ${border}`,
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? `0 0 0 1px ${brand}, 0 4px 12px rgba(232,123,53,0.08)` : 'none',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) e.currentTarget.style.borderColor = `${brand}88`;
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.borderColor = border;
                          }}
                        >
                          {/* Col 1: Icon + Name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1.5, minWidth: 150 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 8,
                              backgroundColor: theme.color, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 700,
                              fontSize: textLabel ? (textLabel.length > 1 ? 12 : 18) : 16,
                              flexShrink: 0
                            }}>
                              {textLabel ? textLabel : <theme.icon size={20} />}
                            </div>
                            <div>
                              <h4 style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{license.name}</h4>
                              <p style={{ color: sub, fontSize: 12, margin: '2px 0 0' }}>{dp.type || 'Plugin'} • {licenseTypeLabel}</p>
                            </div>
                          </div>

                          {/* Col 2: Purchase Price */}
                          <div style={{ flex: 0.8, minWidth: 80 }}>
                            <p style={{ color: text, fontSize: 15, fontWeight: 700, margin: 0 }}>{formatPrice(license.price !== undefined && license.price !== null ? license.price : dp.price, license.currency || dp.currency)}</p>
                            <p style={{ color: sub, fontSize: 12, margin: '2px 0 0' }}>Purchase Price</p>
                          </div>

                          {/* Col 3: Renewal Price */}
                          <div style={{ flex: 1.6, minWidth: 160 }}>
                            <p style={{ color: text, fontSize: 15, fontWeight: 700, margin: 0 }}>
                              {showRenewal ? `${formatPrice(license.renewal_price !== undefined && license.renewal_price !== null ? license.renewal_price : dp.renewal_price, license.currency || dp.currency)} / ${lt === 'yearly' ? 'Year' : 'Month'}` : 'Not Required'}
                            </p>
                            <p style={{ color: sub, fontSize: 12, margin: '2px 0 0' }}>Renewal Price</p>
                          </div>

                          {/* Col 4: Key & Expiry with stacked Status Badge */}
                          <div style={{ flex: 2.2, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                              {(() => {
                                const badgeCfg = getStatusBadgeConfig(status, validity, license, lt);
                                return (
                                  <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', borderRadius: 8,
                                    background: badgeCfg.bg,
                                    border: `1px solid ${badgeCfg.border}`,
                                    color: badgeCfg.color,
                                    fontSize: 11, fontWeight: 600
                                  }}>
                                    <span style={{
                                      width: 6, height: 6, borderRadius: 2,
                                      backgroundColor: badgeCfg.color
                                    }} />
                                    <span>{badgeCfg.text}</span>
                                  </div>
                                );
                              })()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {(() => {
                                const activeKey = license.license_key || dp.license_key;
                                return (
                                  <div>
                                    <span style={{ color: sub, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>License Key</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                                      <span style={{ color: text, fontSize: 12.5, fontFamily: 'monospace', letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                                        {activeKey || '—'}
                                      </span>
                                      {activeKey && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(activeKey);
                                            toast({ title: 'License key copied' });
                                          }}
                                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: sub, padding: 2, display: 'flex', alignItems: 'center' }}
                                          onMouseEnter={e => e.currentTarget.style.color = text}
                                          onMouseLeave={e => e.currentTarget.style.color = sub}
                                        >
                                          <Copy size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                              <div>
                                <span style={{ color: sub, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  {['Expired', 'Disabled', 'Suspended'].includes(status) ? 'Expired on' : 'Expires on'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
                                  <span style={{ color: text, fontSize: 12.5 }}>
                                    {lt === 'lifetime' ? 'Lifetime' : formatDate(license.expiry_date)}
                                  </span>
                                  <span style={{
                                    fontSize: 11, fontWeight: 600,
                                    color: status === 'Active' ? '#22c55e' : ['Expired', 'Suspended'].includes(status) ? '#ef4444' : '#f59e0b'
                                  }}>
                                    {lt === 'lifetime' ? 'Never expires' : ['Expired', 'Disabled', 'Suspended'].includes(status) ? (license.expiry_date ? getExpiredText(license.expiry_date) : validity.label) : validity.days != null ? `${validity.days} days left` : validity.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* GRID VIEW */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {paginated.map(license => {
                      const dp = license.product || {};
                      const status = getLicenseStatus(license);
                      const validity = getValidity(license);
                      const lt = license.license_type || dp.license_type || 'one_time';
                      const theme = getProductTheme(license.name);
                      const isSelected = detailLicense && detailLicense.id === license.id;

                      const licenseTypeLabel = 
                        lt === 'lifetime' ? 'Lifetime' :
                        lt === 'yearly' ? 'Yearly' :
                        lt === 'monthly' ? 'Monthly' : 'One-Time';

                      let textLabel = null;
                      const nameLower = (license.name || '').toLowerCase();
                      if (nameLower.includes('woocommerce')) textLabel = 'Woo';
                      else if (nameLower.includes('astra')) textLabel = 'A';
                      else if (nameLower.includes('discount')) textLabel = 'D';

                      const showRenewal = dp.renewal_enabled && (lt === 'yearly' || lt === 'monthly');

                      return (
                        <div
                          key={license.id}
                          onClick={() => setDetailLicense(license)}
                          style={{
                            background: card,
                            border: isSelected ? `1px solid ${brand}` : `1px solid ${border}`,
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? `0 0 0 1px ${brand}, 0 4px 12px rgba(232,123,53,0.08)` : 'none',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) e.currentTarget.style.borderColor = `${brand}88`;
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.borderColor = border;
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                backgroundColor: theme.color, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700,
                                fontSize: textLabel ? (textLabel.length > 1 ? 11 : 16) : 14,
                                flexShrink: 0
                              }}>
                                {textLabel ? textLabel : <theme.icon size={16} />}
                              </div>
                              <div>
                                <h4 style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                                  {license.name}
                                </h4>
                                <p style={{ color: sub, fontSize: 11, margin: '2px 0 0' }}>{dp.type || 'Plugin'} • {licenseTypeLabel}</p>
                              </div>
                            </div>
                            
                            {(() => {
                              const badgeCfg = getStatusBadgeConfig(status, validity, license, lt);
                              return (
                                <div style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '4px 8px', borderRadius: 6,
                                  background: badgeCfg.bg,
                                  border: `1px solid ${badgeCfg.border}`,
                                  color: badgeCfg.color,
                                  fontSize: 10.5, fontWeight: 600
                                }}>
                                  <span style={{
                                    width: 5, height: 5, borderRadius: 1.5,
                                    backgroundColor: badgeCfg.color
                                  }} />
                                  <span>{badgeCfg.text}</span>
                                </div>
                              );
                            })()}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 0', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
                            <div>
                              <p style={{ color: text, fontSize: 13.5, fontWeight: 700, margin: 0 }}>{formatPrice(license.price !== undefined && license.price !== null ? license.price : dp.price, license.currency || dp.currency)}</p>
                              <p style={{ color: sub, fontSize: 10.5, margin: '1px 0 0' }}>Purchase</p>
                            </div>
                            <div>
                              <p style={{ color: text, fontSize: 13.5, fontWeight: 700, margin: 0 }}>
                                {showRenewal ? `${formatPrice(license.renewal_price !== undefined && license.renewal_price !== null ? license.renewal_price : dp.renewal_price, license.currency || dp.currency)} / ${lt === 'yearly' ? 'Year' : 'Month'}` : 'Not Required'}
                              </p>
                              <p style={{ color: sub, fontSize: 10.5, margin: '1px 0 0' }}>Renewal</p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: sub }}>License Key</span>
                              {(() => {
                                const activeKey = license.license_key || dp.license_key;
                                return (
                                  <span style={{ color: text, fontFamily: 'monospace', fontSize: 11.5 }}>
                                    {activeKey ? `${activeKey.substring(0, 10)}...` : '—'}
                                  </span>
                                );
                              })()}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: sub }}>Expires On</span>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ color: text }}>
                                  {lt === 'lifetime' ? 'Lifetime' : formatDate(license.expiry_date)}
                                </span>
                                {['Expired', 'Disabled', 'Suspended'].includes(status) && license.expiry_date && (
                                  <span style={{ color: '#ef4444', fontSize: 10.5, fontWeight: 600, marginTop: 1 }}>
                                    {status === 'Expired' ? getExpiredText(license.expiry_date) : validity.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`,
                        background: panel, color: currentPage === 1 ? `${sub}50` : text,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 8,
                            border: `1px solid ${isActive ? brand : border}`,
                            background: isActive ? brand : panel,
                            color: isActive ? '#fff' : text,
                            fontWeight: isActive ? 600 : 400,
                            cursor: 'pointer'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`,
                        background: panel, color: currentPage === totalPages ? `${sub}50` : text,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Details Column for Desktop */}
          {detailLicense && !isMobile && (
            <div style={{
              width: 420,
              flexShrink: 0,
              background: card,
              borderRadius: 16,
              border: `1px solid ${border}`,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              position: 'sticky',
              top: 80,
              maxHeight: 'calc(100vh - 120px)',
            }}>
              <div className="no-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingTop: 24 }}>
                {renderDetailPanelContent(detailLicense, true)}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Product Details Modal Overlay (only on Mobile) */}
      {detailLicense && isMobile && (
        <div
          onClick={() => setDetailLicense(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              background: card,
              borderRadius: 24,
              width: '100%',
              maxWidth: 540,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${border}`,
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px 24px 12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {(() => {
                  const theme = getProductTheme(detailLicense.name);
                  const Icon = theme.icon;
                  let textLabel = null;
                  const nameLower = (detailLicense.name || '').toLowerCase();
                  if (nameLower.includes('woocommerce')) textLabel = 'Woo';
                  else if (nameLower.includes('astra')) textLabel = 'A';
                  else if (nameLower.includes('discount')) textLabel = 'D';
                  return (
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: theme.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: textLabel ? (textLabel.length > 1 ? 12 : 18) : 16,
                      flexShrink: 0
                    }}>
                      {textLabel ? textLabel : <Icon size={20} />}
                    </div>
                  );
                })()}
                <div>
                  <h3 style={{ color: text, fontSize: 14, fontWeight: 700, margin: 0 }}>
                    {detailLicense.name}
                  </h3>
                  <p style={{ color: sub, fontSize: 12, margin: '2px 0 0' }}>
                    {detailLicense.product?.type || 'Plugin'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailLicense(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: sub,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="no-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
              {renderDetailPanelContent(detailLicense, false)}
            </div>
          </div>
        </div>
      )}

      {/* Documentation & Order Note Modal */}
      {selectedNoteLicense && (
        <div
          onClick={() => setSelectedNoteLicense(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', background: card, borderRadius: 16,
              width: '100%', maxWidth: 500, padding: 24,
              border: `1px solid ${border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column', gap: 16
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
              <h3 style={{ color: text, fontSize: 14, fontWeight: 700, margin: 0 }}>
                Documentation & Order Note
              </h3>
              <button
                onClick={() => setSelectedNoteLicense(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: sub, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', width: 28, height: 28 }}
                onMouseEnter={e => e.currentTarget.style.background = hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  Product Name
                </label>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: text }}>
                  {selectedNoteLicense.name}
                </span>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  Documentation Link
                </label>
                {selectedNoteLicense.product?.documentation ? (
                  <a
                    href={selectedNoteLicense.product.documentation.startsWith('http') ? selectedNoteLicense.product.documentation : `https://${selectedNoteLicense.product.documentation}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: brand, fontWeight: 600, textDecoration: 'none', fontSize: 13, wordBreak: 'break-all' }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {selectedNoteLicense.product.documentation}
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: sub, fontStyle: 'italic' }}>No documentation link available.</span>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  Order Note
                </label>
                <div style={{
                  color: text, fontSize: 13, lineHeight: '1.4', whiteSpace: 'pre-wrap',
                  background: 'rgba(0,0,0,0.15)', border: `1px solid ${border}`, borderRadius: 8, padding: '10px 12px',
                  maxHeight: 200, overflowY: 'auto'
                }}>
                  {selectedNoteLicense.product?.note?.trim() || 'No notes available.'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setSelectedNoteLicense(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8, background: panel, border: `1px solid ${border}`,
                  color: text, cursor: 'pointer', fontSize: 13, fontWeight: 600
                }}
                onMouseEnter={e => e.currentTarget.style.background = hover}
                onMouseLeave={e => e.currentTarget.style.background = panel}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
