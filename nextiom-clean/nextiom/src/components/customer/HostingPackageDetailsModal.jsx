import React, { useState, useMemo, useEffect } from 'react';
import { X, Server, HardDrive, Wifi, CheckCircle, Clock, XCircle, Copy, ExternalLink, Shield, Lock, User, Key, Eye, EyeOff } from 'lucide-react';
import { HOSTING_STATUS, REQUEST_STATUS, getHostingRequests, getHostingActivityLog, getHostingPlans } from '@/lib/storage';

function statusBadgeStyle(status, isDark) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'completed'].includes(s))
    return { bg: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7', color: '#16a34a' };
  if (s.startsWith('pending'))
    return { bg: isDark ? 'rgba(234,179,8,0.15)' : '#fef9c3', color: '#ca8a04' };
  if (['rejected', 'cancelled', 'suspended', 'expired'].includes(s))
    return { bg: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#dc2626' };
  return { bg: isDark ? 'rgba(100,116,139,0.15)' : '#f1f5f9', color: '#64748b' };
}

function HostingPackageDetailsModal({ pkg, isOpen, onClose, isDark = false, c = {} }) {
  const [requests, setRequests] = useState([]);
  const [planDefaults, setPlanDefaults] = useState({ disk: '', bw: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';

  const parseRequestField = (raw, label) => {
    if (!raw) return null;
    const regex = new RegExp(`${label}:\\s*([^|;\\n]+)`, 'i');
    const match = raw.match(regex);
    return match?.[1]?.trim() || null;
  };

  const normalizeHostingKey = (value) => {
    const str = String(value || '').split('|')[0].trim().toLowerCase();
    return str.replace(/\s+/g, ' ').trim();
  };

  const parsePackageLabel = (raw) => {
    const mainPart = String(raw || '').split('|')[0]?.trim() || '';
    const dashIndex = mainPart.indexOf(' - ');
    return {
      hostingType: dashIndex >= 0 ? mainPart.slice(0, dashIndex).trim() : mainPart,
      planName: dashIndex >= 0 ? mainPart.slice(dashIndex + 3).trim() : mainPart,
    };
  };

  const parseJsonField = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const cpanelInfo = useMemo(() => parseJsonField(pkg?.cpanel) || {}, [pkg?.cpanel]);
  const ftpInfo = useMemo(() => parseJsonField(pkg?.ftp) || {}, [pkg?.ftp]);
  const additionalCredentials = useMemo(() => {
    const raw = pkg?.additional_credentials;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return parseJsonField(raw) || [];
  }, [pkg?.additional_credentials]);

  const isAutoRenew = Boolean(pkg?.auto_renew ?? pkg?.autoRenew);
  const renewalPrice = useMemo(() => {
    const raw = pkg?.next_renewal_price ?? pkg?.nextRenewalPrice;
    if (raw != null && raw !== '') return Number(raw);
    const price = pkg?.price ?? pkg?.first_price ?? null;
    const percentage = pkg?.renewal_percentage ?? pkg?.renewalPercentage;
    if (isAutoRenew && price != null && percentage != null && percentage !== '') {
      const p = parseFloat(price);
      const pct = parseFloat(percentage);
      if (!Number.isNaN(p) && !Number.isNaN(pct)) {
        return Number((p * (1 + pct / 100)).toFixed(2));
      }
    }
    return null;
  }, [pkg, isAutoRenew]);

  const requestMeta = useMemo(() => {
    const raw = pkg?.package_type || pkg?.package_name || pkg?.packageName || pkg?.notes || '';
    const parsed = parsePackageLabel(raw);
    return {
      hostingType: pkg?.hosting_type || parsed.hostingType || 'Hosting',
      plan: pkg?.plan_name || parsed.planName || raw || 'Hosting Request',
      billing_period: parseRequestField(raw, 'Billing') || pkg?.billing_period || '-',
      domain: pkg?.domain || pkg?.domain_name || parseRequestField(raw, 'Domain') || 'No domain',
      notes: pkg?.notes || parseRequestField(raw, 'Notes') || 'None',
      expiryDate: pkg?.expiry_date || pkg?.expiryDate || null,
      price: pkg?.price || null,
      currency: pkg?.currency || 'LKR',
    };
  }, [pkg]);

  useEffect(() => {
    if (!pkg) return;
    if (Array.isArray(pkg.relatedRequests) && pkg.relatedRequests.length > 0) {
      setRequests(pkg.relatedRequests);
      return;
    }
    if (pkg.linkedRequest) {
      setRequests([pkg.linkedRequest]);
      return;
    }
    getHostingRequests().then(reqs => {
      const pKey = normalizeHostingKey(pkg.package_type || pkg.package_name || pkg.packageName || '');
      const filtered = (reqs || []).filter(r => {
        if (r.package_id && pkg.id) return r.package_id === pkg.id;
        if (r.customer_id !== pkg.customer_id) return false;
        const rKey = normalizeHostingKey(r.package_name || r.package_type || r.packageName || '');
        if (rKey && pKey && rKey === pKey) return true;
        const rPlan = String(r.plan_name || r.package_name || r.package_type || '').trim().toLowerCase();
        const pPlan = String(pkg.plan_name || pkg.package_name || pkg.package_type || pkg.packageName || '').trim().toLowerCase();
        return rPlan && pPlan && rPlan === pPlan;
      });
      setRequests(filtered);
    });
  }, [pkg]);

  useEffect(() => {
    if (!pkg) return;
    const hostingType = pkg.hosting_type || (pkg.package_type || pkg.package_name || pkg.packageName || '').split('|')[0]?.split(' - ')[0]?.trim();
    const planName = pkg.plan_name || (pkg.package_type || pkg.package_name || pkg.packageName || '').split('|')[0]?.split(' - ')[1]?.trim() || (pkg.package_type || pkg.package_name || pkg.packageName || '').split('|')[0]?.trim();
    if (!hostingType || !planName) return;
    getHostingPlans().then(plans => {
      const found = (plans || []).find(p => String(p.hosting_type || '').toLowerCase() === String(hostingType || '').toLowerCase() && String(p.plan_name || '').toLowerCase() === String(planName || '').toLowerCase());
      if (found) {
        setPlanDefaults({ disk: found.storage || '', bw: found.bandwidth || '' });
      }
    }).catch(() => {});
  }, [pkg]);

  if (!isOpen || !pkg) return null;

  const { bg: statusBg, color: statusColor } = statusBadgeStyle(pkg.status, isDark);

  const infoPanel = {
    padding: '16px',
    borderRadius: 16,
    background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
    border: `1px solid ${border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  const getReqIcon = (status) => {
    const s = String(status || '').toLowerCase();
    if (['completed', 'approved'].includes(s)) return <CheckCircle style={{ width: 14, height: 14, color: '#16a34a' }} />;
    if (['rejected', 'cancelled'].includes(s)) return <XCircle style={{ width: 14, height: 14, color: '#dc2626' }} />;
    return <Clock style={{ width: 14, height: 14, color: '#ca8a04' }} />;
  };

  // Helper component to copy values easily
  const CopyShortcut = ({ value, label }) => {
    const [copied, setCopied] = useState(false);
    const doCopy = (e) => {
      e.stopPropagation();
      if (!value) return;
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    return (
      <button
        onClick={doCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 6,
          background: copied ? 'rgba(34,197,94,0.1)' : 'transparent',
          color: copied ? '#16a34a' : brand,
          border: 'none',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          marginLeft: 8,
          transition: 'all 0.15s',
        }}
      >
        <Copy style={{ width: 11, height: 11 }} />
        {copied ? 'Copied!' : 'Copy'}
      </button>
    );
  };

  // Password hide/show helper
  const PasswordField = ({ value, id }) => {
    const isVisible = !!visiblePasswords[id];
    const toggle = () => {
      setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
        <input
          type={isVisible ? 'text' : 'password'}
          value={value || ''}
          readOnly
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            fontWeight: 500,
            color: text,
            fontFamily: isVisible ? 'inherit' : 'monospace',
            letterSpacing: isVisible ? 'normal' : '0.15em',
            width: '100%',
            maxWidth: 200,
          }}
        />
        <button
          onClick={toggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            color: subText,
          }}
        >
          {isVisible ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
        </button>
        <CopyShortcut value={value} label="Password" />
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '16px' }}>
      <div style={{
        background: isDark ? '#15161A' : '#fff',
        border: `1px solid ${border}`,
        borderRadius: 24,
        width: '100%',
        maxWidth: 720,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'linear-gradient(to bottom, rgba(232,123,53,0.05), transparent)' : 'linear-gradient(to bottom, rgba(232,123,53,0.02), transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server style={{ width: 20, height: 20, color: brand }} />
            </div>
            <div>
              <p style={{ color: text, fontWeight: 800, fontSize: 18, marginBottom: 2 }}>
                {requestMeta.plan || pkg.package_name || pkg.package_type || 'Hosting Package'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: subText, fontSize: 13 }}>
                  {requestMeta.domain !== 'No domain' ? requestMeta.domain : 'No active domain'}
                </span>
                {requestMeta.domain !== 'No domain' && <CopyShortcut value={requestMeta.domain} label="Domain" />}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              background: statusBg,
              color: statusColor,
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 99,
              textTransform: 'capitalize',
            }}>
              {pkg.status}
            </span>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}
              onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}
            >
              <X style={{ width: 18, height: 18, color: text }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Key Details Grid */}
          <div>
            <p style={{ color: text, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Package Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <div style={infoPanel}>
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Hosting Type</span>
                <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.hostingType}</span>
              </div>
              <div style={infoPanel}>
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Plan Details</span>
                <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.plan}</span>
                {(pkg.type || pkg.plan_name) && <span style={{ color: subText, fontSize: 12 }}>{pkg.type || pkg.plan_name}</span>}
              </div>
              <div style={infoPanel}>
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Start Date</span>
                <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>
                  {pkg.start_date ? new Date(pkg.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </span>
              </div>
              <div style={infoPanel}>
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Billing Cycle</span>
                <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.billing_period}</span>
                <span style={{ color: subText, fontSize: 11 }}>
                  Next Invoice: {(pkg.expiry_date || pkg.expiryDate) ? new Date(pkg.expiry_date || pkg.expiryDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div style={infoPanel}>
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Domain Name</span>
                <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.domain}</span>
              </div>
              <div style={infoPanel}>
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Expiry Date</span>
                <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>
                  {requestMeta.expiryDate ? new Date(requestMeta.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div style={infoPanel}>
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>{isAutoRenew ? 'Price (1st payment)' : 'Price'}</span>
                <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.price ? `${requestMeta.currency} ${Number(requestMeta.price).toLocaleString()}` : 'N/A'}</span>
              </div>
              {isAutoRenew && renewalPrice != null && (
                <div style={infoPanel}>
                  <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Renewal Price</span>
                  <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>{`${requestMeta.currency} ${renewalPrice.toLocaleString()}`}</span>
                </div>
              )}
              <div style={infoPanel}>
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Auto Renew Status</span>
                <span style={{ color: isAutoRenew ? '#16a34a' : subText, fontWeight: 700, fontSize: 14 }}>
                  {isAutoRenew ? 'Active / Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Usage Metrics */}
          <div>
            <p style={{ color: text, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Resource Limits & Usage</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                {
                  Icon: HardDrive,
                  label: 'Disk Space',
                  value: pkg.usage?.diskUsage ? `${pkg.usage.diskUsage} GB` : (pkg.disk_usage_limit || planDefaults.disk || 'N/A'),
                  subtext: 'SSD Storage allocated for files & database'
                },
                {
                  Icon: Wifi,
                  label: 'Bandwidth',
                  value: pkg.usage?.bandwidthUsage ? `${pkg.usage.bandwidthUsage} GB` : (pkg.bandwidth_limit || planDefaults.bw || 'N/A'),
                  subtext: 'Monthly data transfer limit'
                },
              ].map(({ Icon, label, value, subtext }) => (
                <div key={label} style={{
                  padding: '16px',
                  borderRadius: 16,
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                  border: `1px solid ${border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon style={{ width: 18, height: 18, color: brand }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>{label}</span>
                    <span style={{ color: text, fontWeight: 800, fontSize: 18 }}>{value}</span>
                    <span style={{ color: subText, fontSize: 10, marginTop: 2 }}>{subtext}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {requestMeta.notes && requestMeta.notes !== 'None' && (
            <div style={{ ...infoPanel, gap: 6 }}>
              <span style={{ color: subText, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Notes</span>
              <p style={{ color: text, fontSize: 13, lineHeight: '1.5', margin: 0 }}>{requestMeta.notes}</p>
            </div>
          )}

          {pkg.customer_message && (
            <div style={{ ...infoPanel, borderLeft: `4px solid ${brand}`, gap: 6 }}>
              <span style={{ color: brand, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Notes</span>
              <p style={{ color: text, fontSize: 13, lineHeight: '1.5', margin: 0 }}>{pkg.customer_message}</p>
            </div>
          )}

          {/* Hosting Credentials Access */}
          {pkg.show_hosting_access !== false && (cpanelInfo.url || cpanelInfo.username || cpanelInfo.password || cpanelInfo.notes) && (
            <div style={{
              border: `1px solid ${border}`,
              borderRadius: 18,
              background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.4)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 18px',
                borderBottom: `1px solid ${border}`,
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Shield style={{ width: 14, height: 14, color: brand }} />
                <span style={{ color: text, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Control Panel Access</span>
              </div>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {cpanelInfo.url && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Login URL</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <a href={cpanelInfo.url} target="_blank" rel="noopener noreferrer" style={{ color: brand, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        {cpanelInfo.url} <ExternalLink style={{ width: 12, height: 12 }} />
                      </a>
                      <CopyShortcut value={cpanelInfo.url} label="URL" />
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {cpanelInfo.username && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Username</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: text, fontSize: 13, fontWeight: 500 }}>{cpanelInfo.username}</span>
                        <CopyShortcut value={cpanelInfo.username} label="Username" />
                      </div>
                    </div>
                  )}
                  {cpanelInfo.password && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Password</span>
                      <PasswordField value={cpanelInfo.password} id="cpanel" />
                    </div>
                  )}
                </div>
                {cpanelInfo.notes && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${border}`, paddingTop: 10 }}>
                    <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Access Notes</span>
                    <span style={{ color: text, fontSize: 12 }}>{cpanelInfo.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FTP Credentials Access */}
          {pkg.show_ftp_access !== false && (ftpInfo.host || ftpInfo.username || ftpInfo.password) && (
            <div style={{
              border: `1px solid ${border}`,
              borderRadius: 18,
              background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.4)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 18px',
                borderBottom: `1px solid ${border}`,
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Lock style={{ width: 14, height: 14, color: brand }} />
                <span style={{ color: text, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FTP Access Credentials</span>
              </div>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {ftpInfo.host && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>FTP Host / Server</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: text, fontSize: 13, fontWeight: 600 }}>{ftpInfo.host}</span>
                      <CopyShortcut value={ftpInfo.host} label="FTP Host" />
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {ftpInfo.username && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>FTP Username</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: text, fontSize: 13, fontWeight: 500 }}>{ftpInfo.username}</span>
                        <CopyShortcut value={ftpInfo.username} label="FTP Username" />
                      </div>
                    </div>
                  )}
                  {ftpInfo.password && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>FTP Password</span>
                      <PasswordField value={ftpInfo.password} id="ftp" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Credentials Access */}
          {pkg.show_additional_credentials !== false && additionalCredentials.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ color: text, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional Credentials</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {additionalCredentials.map((cred, idx) => (
                  <div key={idx} style={{
                    border: `1px solid ${border}`,
                    borderRadius: 16,
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${border}`, paddingBottom: 6 }}>
                      <Key style={{ width: 13, height: 13, color: brand }} />
                      <span style={{ color: text, fontWeight: 700, fontSize: 13 }}>{cred.type || `Credential Account #${idx + 1}`}</span>
                    </div>
                    {cred.url && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ color: subText, fontSize: 10, fontWeight: 600 }}>Access URL</span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <a href={cred.url} target="_blank" rel="noopener noreferrer" style={{ color: brand, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            {cred.url} <ExternalLink style={{ width: 10, height: 10 }} />
                          </a>
                          <CopyShortcut value={cred.url} label="URL" />
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {cred.username && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ color: subText, fontSize: 10, fontWeight: 600 }}>Username</span>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: text, fontSize: 12, fontWeight: 500 }}>{cred.username}</span>
                            <CopyShortcut value={cred.username} label="Username" />
                          </div>
                        </div>
                      )}
                      {cred.password && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ color: subText, fontSize: 10, fontWeight: 600 }}>Password</span>
                          <PasswordField value={cred.password} id={`additional-${idx}`} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Request / Activity Banner */}
          {requests.filter(req => String(req.status || '').toLowerCase() !== 'approved').length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 12,
              background: isDark ? 'rgba(234,179,8,0.1)' : '#fef9c3',
              border: `1px solid ${isDark ? 'rgba(234,179,8,0.2)' : '#fde047'}`,
            }}>
              <span style={{ color: isDark ? '#facc15' : '#854d0e', fontSize: 12, fontWeight: 700 }}>Active Requests / Setup Tasks:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {requests
                  .filter(req => String(req.status || '').toLowerCase() !== 'approved')
                  .slice(0, 5)
                  .map((req) => (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', padding: '4px 10px', borderRadius: 8, border: `1px solid ${border}` }}>
                      {getReqIcon(req.status)}
                      <span style={{ color: text, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {req.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${border}`, paddingTop: 18 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 28px',
                borderRadius: 12,
                background: brand,
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: `0 4px 14px rgba(232, 123, 53, 0.4)`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 6px 20px rgba(232, 123, 53, 0.5)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 14px rgba(232, 123, 53, 0.4)`;
              }}
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HostingPackageDetailsModal;

