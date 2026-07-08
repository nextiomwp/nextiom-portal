import React, { useState, useEffect } from 'react';
import { Package, Download, RefreshCw, Infinity, CheckCircle, AlertCircle, Clock, Layers, Eye, EyeOff, X, Key, Calendar, DollarSign, Shield, Zap, Tag, MoreVertical, Search, ChevronDown, ChevronLeft, ChevronRight, Check, Copy, FileText, Globe, User, Lock } from 'lucide-react';
import { getLicenses, incrementDownloadCount } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const LICENSE_CFG = {
  one_time:  { label: 'One Time Purchase', icon: Package,   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  yearly:    { label: 'Yearly Renewal',    icon: RefreshCw, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  lifetime:  { label: 'Lifetime License',  icon: Infinity,  color: 'var(--brand-color)', bg: 'rgba(232,123,53,0.12)' },
};

function getValidity(license) {
  if (license.status === 'Disabled' || license.status === 'Suspended' || license.status === 'Expired') {
    return { valid: false, label: license.status, days: null };
  }
  const lt = license.license_type || license.product?.license_type || 'one_time';
  if (lt === 'lifetime') return { valid: true, label: 'Lifetime', days: null };
  if (lt === 'one_time') {
    return { valid: true, label: 'One Time Purchase', days: null, downloadUsed: false };
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
    return 'Active';
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

function getTextLabel(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('woocommerce') || lower.includes('woo')) return 'Woo';
  if (lower.includes('elementor')) return 'E';
  if (lower.includes('astra')) return 'A';
  if (lower.includes('discount')) return 'D';
  return null;
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
  const [activeTab, setActiveTab] = useState('overview');
  const [hoveredTab, setHoveredTab] = useState(null);
  const [showExpiredDownloadTip, setShowExpiredDownloadTip] = useState(false);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [timelineItem, setTimelineItem] = useState(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const bg = c?.bg || (isDark ? '#15161A' : '#f8f8f7');
  const card = c?.card || (isDark ? '#1C1E24' : '#fff');
  const panel = c?.panel2 || (isDark ? '#22252C' : '#f5f5f5');
  const border = c?.border || (isDark ? 'rgba(255, 255, 255, 0.06)' : '#ebebeb');
  const hover = c?.hover || (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f5f5f5');
  const text = c?.text || (isDark ? '#fff' : '#1a1a1a');
  const sub = c?.subText || (isDark ? '#a0a0a0' : '#888');
  const brand = c?.brand || 'var(--brand-color)';

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
    const status = getLicenseStatus(license);
    if (status === 'Expired') {
      toast({ title: 'Your product is expired. Please renew to download.', variant: 'destructive' });
      return;
    }
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
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} /  ${day} / ${year}`;
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

  const paginated = sorted;

  useEffect(() => {
    if (detailLicense) {
      const existsInSorted = sorted.some(l => l.id === detailLicense.id);
      if (!existsInSorted) {
        setDetailLicense(null);
      }
    }
  }, [search, statusFilter, licenses]);

  useEffect(() => {
    setActiveTab('overview');
    setShowLicenseKey(false);
    setShowLoginPassword(false);
  }, [detailLicense?.id]);

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
    const textLabel = getTextLabel(name);

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
    const isExpired = status === 'Expired';
    const theme = getProductTheme(lic.name);

    const licenseTypeLabel = 
      lt === 'lifetime' ? 'Lifetime License' :
      lt === 'yearly' ? 'Yearly Renewal' :
      lt === 'monthly' ? 'Monthly Renewal' : 'One Time Purchase';

    const showRenewal = dp.renewal_enabled && (lt === 'yearly' || lt === 'monthly');
    const isVirtual = dp.category === 'virtual';
    const badgeCfg = getStatusBadgeConfig(status, validity, lic, lt);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Header row with Status pill and Close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 20,
              background: badgeCfg.bg,
              border: `1px solid ${badgeCfg.border}`,
              color: badgeCfg.color,
              fontSize: 11.5,
              fontWeight: 600,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: badgeCfg.color, display: 'inline-block' }} />
              <span>
                {badgeCfg.text === 'ACTIVE' ? 'Active' : 
                 badgeCfg.text === 'EXPIRING SOON' ? 'Expiring Soon' : 
                 badgeCfg.text === 'DISABLED' ? 'Disabled' : 
                 badgeCfg.text === 'SUSPENDED' ? 'Suspended' : 'Expired'}
              </span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>{badgeCfg.expiryText}</span>
            </div>
            {showClose && (
              <button
                onClick={() => setDetailLicense(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: sub,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  borderRadius: '50%',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Product Title and Sub-label */}
          <div style={{ marginTop: 2 }}>
            <h3 style={{ color: text, fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
              {lic.name}
            </h3>
            <p style={{ color: sub, fontSize: 12.5, margin: '3px 0 0', fontWeight: 500 }}>
              {dp.type || 'Plugin'} • {licenseTypeLabel}
            </p>
          </div>

          {/* Pricing Metrics Box Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderRadius: 10,
            border: `1px solid ${border}`,
            background: 'rgba(255,255,255,0.01)',
            overflow: 'hidden',
            marginTop: 2
          }}>
            {/* Purchase Price */}
            <div style={{ padding: '10px 14px', borderRight: `1px solid ${border}` }}>
              <span style={{ color: sub, fontSize: 10.5, fontWeight: 500, display: 'block' }}>Purchase price</span>
              <span style={{ color: text, fontSize: 14.5, fontWeight: 700, display: 'block', marginTop: 3 }}>
                {formatPrice(lic.price !== undefined && lic.price !== null ? lic.price : dp.price, lic.currency || dp.currency)}
              </span>
            </div>
            {/* Renewal Price */}
            <div style={{ padding: '10px 14px' }}>
              <span style={{ color: sub, fontSize: 10.5, fontWeight: 500, display: 'block' }}>Renewal price</span>
              <span style={{
                color: showRenewal ? brand : '#22c55e',
                fontSize: 14.5,
                fontWeight: 700,
                display: 'block',
                marginTop: 3
              }}>
                {showRenewal ? `${formatPrice(lic.renewal_price !== undefined && lic.renewal_price !== null ? lic.renewal_price : dp.renewal_price, lic.currency || dp.currency)}` : 'Not required'}
              </span>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${border}`,
            margin: '2px 0 10px',
            position: 'relative'
          }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'subscription', label: 'Subscription' },
              { id: 'downloads', label: 'Downloads' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const isHovered = hoveredTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    flex: 1,
                    background: isHovered 
                      ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)') 
                      : 'transparent',
                    backdropFilter: isHovered ? 'blur(8px)' : 'none',
                    WebkitBackdropFilter: isHovered ? 'blur(8px)' : 'none',
                    border: 'none',
                    padding: '8px 4px',
                    borderRadius: '6px 6px 0 0',
                    color: isActive ? brand : (isHovered ? text : sub),
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: -1,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: brand,
                      borderRadius: '2px 2px 0 0'
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* License Key Section */}
              {lic.license_key && (
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>License Key</span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.12)',
                    border: `1px solid ${border}`
                  }}>
                    <span style={{
                      color: text,
                      fontSize: 12,
                      fontFamily: showLicenseKey ? 'monospace' : 'sans-serif',
                      letterSpacing: showLicenseKey ? 0.5 : 3,
                      userSelect: showLicenseKey ? 'all' : 'none'
                    }}>
                      {showLicenseKey ? lic.license_key : '••••••••••••••••••••'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setShowLicenseKey(!showLicenseKey)}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${border}`,
                          color: sub,
                          borderRadius: 6,
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = text}
                        onMouseLeave={e => e.currentTarget.style.color = sub}
                      >
                        {showLicenseKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lic.license_key);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                          toast({ title: 'License key copied to clipboard' });
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${border}`,
                          color: sub,
                          borderRadius: 6,
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = text}
                        onMouseLeave={e => e.currentTarget.style.color = sub}
                      >
                        {copiedKey ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Details Section */}
              {(lic.login_username || lic.login_password) && (
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Login Details</span>
                  <div style={{
                    borderRadius: 8,
                    border: `1px solid ${border}`,
                    background: 'rgba(0,0,0,0.12)',
                    overflow: 'hidden'
                  }}>
                    {lic.login_username && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 12px',
                        borderBottom: lic.login_password ? `1px solid ${border}` : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <User size={12} style={{ color: sub, flexShrink: 0 }} />
                          <span style={{ color: sub, fontSize: 11.5 }}>Email / Username</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: text, fontSize: 12, fontFamily: 'monospace', letterSpacing: 0.3, userSelect: 'all' }}>
                            {lic.login_username}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(lic.login_username);
                              toast({ title: 'Username copied to clipboard' });
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${border}`,
                              color: sub,
                              borderRadius: 5,
                              width: 22,
                              height: 22,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = text}
                            onMouseLeave={e => e.currentTarget.style.color = sub}
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                    {lic.login_password && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Lock size={12} style={{ color: sub, flexShrink: 0 }} />
                          <span style={{ color: sub, fontSize: 11.5 }}>Password</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            color: text,
                            fontSize: 12,
                            fontFamily: showLoginPassword ? 'monospace' : 'sans-serif',
                            letterSpacing: showLoginPassword ? 0.3 : 3,
                            userSelect: showLoginPassword ? 'all' : 'none'
                          }}>
                            {showLoginPassword ? lic.login_password : '••••••••••'}
                          </span>
                          <button
                            onClick={() => setShowLoginPassword(v => !v)}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${border}`,
                              color: sub,
                              borderRadius: 5,
                              width: 22,
                              height: 22,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = text}
                            onMouseLeave={e => e.currentTarget.style.color = sub}
                          >
                            {showLoginPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(lic.login_password);
                              toast({ title: 'Password copied to clipboard' });
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${border}`,
                              color: sub,
                              borderRadius: 5,
                              width: 22,
                              height: 22,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = text}
                            onMouseLeave={e => e.currentTarget.style.color = sub}
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Product Information Section */}
              <div style={{ marginTop: 2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>Product Information</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ color: sub, fontSize: 12.5 }}>Product type</span>
                    <span style={{ color: text, fontSize: 12.5, fontWeight: 600 }}>{dp.type || 'Plugin'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ color: sub, fontSize: 12.5 }}>Service plan</span>
                    <span style={{ color: text, fontSize: 12.5, fontWeight: 600 }}>{lic.membership_type || licenseTypeLabel}</span>
                  </div>
                  {(lic.version || dp.version) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ color: sub, fontSize: 12.5 }}>Version</span>
                    <span style={{ color: text, fontSize: 12.5, fontWeight: 600 }}>{lic.version || dp.version}</span>
                  </div>
                  )}
                  {lic.domain && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                      <span style={{ color: sub, fontSize: 12.5 }}>Domain</span>
                      <a
                        href={lic.domain.startsWith('http') ? lic.domain : `https://${lic.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: brand,
                          fontSize: 12.5,
                          fontWeight: 600,
                          textDecoration: 'none',
                          transition: 'text-decoration 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {lic.domain}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Features section */}
              <div style={{ marginTop: 2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Features</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {dp.license_registration && dp.automatic_updates && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 11.5, fontWeight: 600, color: '#22c55e' }}>
                        <span>✓ License Registration</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 11.5, fontWeight: 600, color: '#22c55e' }}>
                        <span>✓ Auto Updates</span>
                      </div>
                    </>
                  )}
                  {dp.manual_updates && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 11.5, fontWeight: 600, color: '#22c55e' }}>
                      <span>✓ Manual Updates</span>
                    </div>
                  )}
                  {!dp.license_registration && !dp.automatic_updates && !dp.manual_updates && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 11.5, fontWeight: 600, color: '#ef4444' }}>
                        <span>✗ No Updates</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 11.5, fontWeight: 600, color: '#ef4444' }}>
                        <span>✗ No license</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Description Section */}
              {(lic.notes?.trim() || dp.description?.trim()) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Description</span>
                  <div style={{
                    color: text,
                    fontSize: 11.5,
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(0,0,0,0.12)',
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    padding: '6px 8px'
                  }}>
                    {lic.notes?.trim() || dp.description?.trim()}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>Subscription Details</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ color: sub, fontSize: 12.5 }}>Start date</span>
                    <span style={{ color: text, fontSize: 12.5, fontWeight: 600 }}>{formatDate(lic.start_date || lic.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ color: sub, fontSize: 12.5 }}>Expiry date</span>
                    <span style={{ color: text, fontSize: 12.5, fontWeight: 600 }}>{lt === 'lifetime' ? 'Lifetime' : formatDate(lic.expiry_date)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ color: sub, fontSize: 12.5 }}>Days left</span>
                    <span style={{
                      color: status === 'Active' ? '#22c55e' : ['Expired', 'Disabled', 'Suspended'].includes(status) ? '#ef4444' : '#f59e0b',
                      fontSize: 12.5,
                      fontWeight: 600
                    }}>
                      {lt === 'lifetime' ? 'Never expires' : status === 'Expired' ? getExpiredText(lic.expiry_date) : validity.days != null ? `${validity.days} days` : validity.label}
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setTimelineItem(lic)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                    color: text,
                    border: `1px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}
                  onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'}
                >
                  <Clock size={13} /> View License History & Timeline
                </button>
              </div>
            </div>
          )}

          {activeTab === 'downloads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  {isVirtual ? 'RESOURCES' : 'FILES & RESOURCES'}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {!isVirtual && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.01)',
                      border: `1px solid ${border}`
                    }}>
                      <div>
                        <p style={{ color: text, fontSize: 13, fontWeight: 600, margin: 0 }}>Main product file</p>
                        <p style={{ color: sub, fontSize: 10.5, margin: '3px 0 0' }}>{lic.version || dp.version ? `Version ${lic.version || dp.version}` : 'Latest version'}</p>
                      </div>
                      <div 
                        style={{ position: 'relative' }}
                        onMouseEnter={() => { if (isExpired) setShowExpiredDownloadTip(true); }}
                        onMouseLeave={() => { if (isExpired) setShowExpiredDownloadTip(false); }}
                      >
                        <button
                          onClick={() => { if (!isExpired) handleDownload(lic); }}
                          disabled={isExpired}
                          style={{
                            background: 'transparent',
                            border: isExpired ? `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}` : `1.5px solid ${brand}`,
                            color: isExpired ? sub : brand,
                            padding: '5px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isExpired ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.2s',
                            opacity: isExpired ? 0.5 : 1,
                            pointerEvents: isExpired ? 'none' : 'auto'
                          }}
                          onMouseEnter={e => {
                            if (!isExpired) e.currentTarget.style.background = `${brand}15`;
                          }}
                          onMouseLeave={e => {
                            if (!isExpired) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </button>

                        {isExpired && showExpiredDownloadTip && (
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: 0,
                            marginBottom: 8,
                            width: 220,
                            background: '#ef4444',
                            color: '#fff',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                            zIndex: 10,
                            lineHeight: 1.3,
                            textAlign: 'left'
                          }}>
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: 20,
                              width: 0,
                              height: 0,
                              borderLeft: '5px solid transparent',
                              borderRight: '5px solid transparent',
                              borderTop: '5px solid #ef4444'
                            }} />
                            Your product is expired. Please renew to download.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.01)',
                    border: `1px solid ${border}`
                  }}>
                    <div>
                      <p style={{ color: text, fontSize: 13, fontWeight: 600, margin: 0 }}>Documentation / order note</p>
                      <p style={{ color: sub, fontSize: 10.5, margin: '3px 0 0' }}>Help resources & guides</p>
                    </div>
                    <button
                      onClick={() => setSelectedNoteLicense(lic)}
                      style={{
                        background: 'transparent',
                        border: `1.5px solid ${brand}`,
                        color: brand,
                        padding: '5px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${brand}15`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Standing Banner */}
          {(() => {
            return (
              <div style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: badgeCfg.standingBg,
                border: `1px solid ${badgeCfg.standingBorder}`,
                color: badgeCfg.standingColor,
                marginTop: 4
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>
                  {badgeCfg.standingTitle}
                </p>
                <p style={{ fontSize: 11, opacity: 0.8, margin: '2px 0 0' }}>
                  {badgeCfg.standingDesc}
                </p>
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
              Showing {sorted.length} {sorted.length === 1 ? 'product' : 'products'}
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
              <div className="no-scrollbar" style={{
                maxHeight: 'calc(100vh - 290px)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                paddingRight: 4
              }}>
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

                      const textLabel = getTextLabel(license.name);

                      return (
                        <div
                          key={license.id}
                          onClick={() => setDetailLicense(license)}
                          style={{
                            background: card,
                            border: isSelected ? `1.5px solid ${brand}` : `1px solid ${border}`,
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'stretch' : 'center',
                            justifyContent: 'space-between',
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
                          {/* Col 1: Icon + Name & Subtitle */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                              <h4 style={{ color: text, fontSize: 14.5, fontWeight: 700, margin: 0, lineHeight: 1.3, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {license.name}
                              </h4>
                              <p style={{ color: sub, fontSize: 12.5, margin: 0 }}>
                                {dp.type || 'Plugin'} · {licenseTypeLabel}
                              </p>
                            </div>
                          </div>

                          {/* Col 2: Price and Status */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isMobile ? 'space-between' : 'flex-end',
                            gap: isMobile ? 12 : 24,
                            flexShrink: 0,
                            width: isMobile ? '100%' : 'auto',
                            borderTop: isMobile ? `1px solid ${border}` : 'none',
                            paddingTop: isMobile ? 12 : 0,
                            marginTop: isMobile ? 4 : 0
                          }}>
                            {/* Price */}
                            <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                              <p style={{ color: text, fontSize: 15, fontWeight: 700, margin: 0 }}>
                                {formatPrice(license.price !== undefined && license.price !== null ? license.price : dp.price, license.currency || dp.currency)}
                              </p>
                              <p style={{ color: sub, fontSize: 11, margin: '2px 0 0' }}>
                                Purchase price
                              </p>
                            </div>

                            {/* Status */}
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTimelineItem(license);
                                }}
                                style={{
                                  padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                  background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                                  color: text, border: `1px solid ${border}`,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'background 0.15s',
                                }}
                                title="History / Timeline"
                              >
                                <Clock style={{ width: 13, height: 13 }} />
                              </button>
                              {(() => {
                                const badgeCfg = getStatusBadgeConfig(status, validity, license, lt);
                                return (
                                  <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', borderRadius: 20,
                                    background: badgeCfg.bg,
                                    border: `1px solid ${badgeCfg.border}`,
                                    color: badgeCfg.color,
                                    fontSize: 11, fontWeight: 700,
                                    letterSpacing: 0.5,
                                  }}>
                                    <span style={{
                                      width: 6, height: 6, borderRadius: '50%',
                                      backgroundColor: badgeCfg.color
                                    }} />
                                    <span>{badgeCfg.text}</span>
                                  </div>
                                );
                              })()}
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

                      const textLabel = getTextLabel(license.name);

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
                            
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTimelineItem(license);
                                }}
                                style={{
                                  padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                                  background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                                  color: text, border: `1px solid ${border}`,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'background 0.15s',
                                }}
                                title="History / Timeline"
                              >
                                <Clock style={{ width: 12, height: 12 }} />
                              </button>
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
                                const activeKey = license.license_key;
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
              top: 16,
              maxHeight: 'calc(100vh - 140px)',
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
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
              paddingTop: 24
            }}
          >
            <div className="no-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
              {renderDetailPanelContent(detailLicense, true)}
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

      <ItemTimelineModal
        item={timelineItem}
        type="license"
        isOpen={!!timelineItem}
        onClose={() => setTimelineItem(null)}
        isDark={isDark}
        c={c}
      />
    </div>
  );
}

function ItemTimelineModal({ item, type, isOpen, onClose, isDark = false, c = {} }) {
  if (!isOpen || !item) return null;

  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || 'var(--brand-color)';
  const brandLight = c.brandLight || 'var(--brand-color-light)';
  const card = c.card || (isDark ? '#1C1E24' : '#fff');

  const safeFormatDate = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  };

  let timelineItems = [];
  try {
    if (item.renewal_history && Array.isArray(item.renewal_history)) {
      timelineItems = [...item.renewal_history];
    }
  } catch (e) {
    console.error(e);
  }

  if (timelineItems.length === 0) {
    let initialPeriod = 'yearly';
    if (type === 'hosting') {
      initialPeriod = item.billing_period || 'yearly';
    } else if (type === 'license') {
      initialPeriod = 'yearly';
    } else if (type === 'domain') {
      initialPeriod = item.registration_period || 'yearly';
    } else if (type === 'email') {
      initialPeriod = item.registration_period || 'yearly';
    }

    timelineItems.push({
      renew_start_date: item.start_date || item.purchase_date || item.created_at,
      renewal_time: initialPeriod,
      expiry_date: item.expiry_date
    });
  }

  const typeLabels = {
    hosting: 'Hosting Package',
    license: 'Product License',
    domain: 'Domain Name',
    email: 'Email Account'
  };

  const displayName = 
    type === 'hosting' ? (item.package_name || item.packageName || 'Hosting Package') :
    type === 'license' ? (item.name || 'Product License') :
    type === 'domain' ? (item.name || item.domain_name || 'Domain Name') :
    type === 'email' ? (item.email || 'Email Account') : 'Item';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 24,
        width: '100%', maxWidth: 480,
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: 18, height: 18, color: brand }} />
            </div>
            <div>
              <p style={{ color: text, fontWeight: 700, fontSize: 16, marginBottom: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 280 }}>
                {displayName}
              </p>
              <p style={{ color: subText, fontSize: 12 }}>{typeLabels[type]} Timeline</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 16, height: 16, color: subText }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }} className="no-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 16 }}>
            {/* Vertical timeline line */}
            <div style={{ 
              position: 'absolute', 
              top: 8, 
              bottom: 8, 
              left: 4, 
              width: 2, 
              background: isDark ? 'rgba(255,255,255,0.1)' : '#ebebeb' 
            }} />

            {timelineItems.map((entry, idx) => {
              const isLatest = idx === timelineItems.length - 1;
              return (
                <div key={idx} style={{ position: 'relative', paddingBottom: idx === timelineItems.length - 1 ? 0 : 20 }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: -16, 
                    top: 4, 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    background: isLatest ? brand : (isDark ? '#4b5563' : '#9ca3af'),
                    border: `2px solid ${card}`,
                    boxShadow: isLatest ? `0 0 8px ${brand}` : 'none',
                    zIndex: 2
                  }} />

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isLatest ? brand : text }}>
                        {idx === 0 ? 'Initial Purchase' : `Renewal #${idx}`}
                      </span>
                      <span style={{ fontSize: 11, background: isDark ? 'rgba(255,255,255,0.05)' : '#eaeaea', padding: '2px 6px', borderRadius: 4, color: subText, textTransform: 'capitalize' }}>
                        {entry.renewal_time || 'yearly'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: subText, marginTop: 4 }}>
                      Duration: <strong>{safeFormatDate(entry.renew_start_date)}</strong> to <strong>{safeFormatDate(entry.expiry_date)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            style={{ 
              padding: '8px 20px', 
              borderRadius: 8, 
              border: 'none', 
              background: brand, 
              color: '#fff', 
              fontSize: 13, 
              fontWeight: 700, 
              cursor: 'pointer' 
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
