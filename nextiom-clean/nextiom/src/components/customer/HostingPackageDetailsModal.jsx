import React from 'react';
import { X, Server, HardDrive, Wifi, CheckCircle, Clock, XCircle } from 'lucide-react';
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
  const [requests, setRequests] = React.useState([]);
  const [planDefaults, setPlanDefaults] = React.useState({ disk: '', bw: '' });

  const border = c.border || '#ebebeb';
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

  const cpanelInfo = React.useMemo(() => parseJsonField(pkg?.cpanel) || {}, [pkg?.cpanel]);
  const ftpInfo = React.useMemo(() => parseJsonField(pkg?.ftp) || {}, [pkg?.ftp]);
  const additionalCredentials = React.useMemo(() => {
    const raw = pkg?.additional_credentials;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return parseJsonField(raw) || [];
  }, [pkg?.additional_credentials]);

  const isAutoRenew = Boolean(pkg?.auto_renew ?? pkg?.autoRenew);
  const renewalPrice = React.useMemo(() => {
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

  const requestMeta = React.useMemo(() => {
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

  React.useEffect(() => {
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

  React.useEffect(() => {
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
    padding: '12px 14px', borderRadius: 12,
    background: panel2, border: `1px solid ${border}`,
  };

  const getReqIcon = (status) => {
    const s = String(status || '').toLowerCase();
    if (['completed', 'approved'].includes(s)) return <CheckCircle style={{ width: 14, height: 14, color: '#16a34a' }} />;
    if (['rejected', 'cancelled'].includes(s)) return <XCircle style={{ width: 14, height: 14, color: '#dc2626' }} />;
    return <Clock style={{ width: 14, height: 14, color: '#ca8a04' }} />;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{
        background: isDark ? '#1C1E24' : '#fff',
        border: `1px solid ${border}`,
        borderRadius: 24,
        width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server style={{ width: 18, height: 18, color: brand }} />
            </div>
            <div>
              <p style={{ color: text, fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
                {requestMeta.plan || pkg.package_name || pkg.package_type || 'Hosting Package'}
              </p>
              <p style={{ color: subText, fontSize: 12 }}>
                {requestMeta.domain !== 'No domain' ? requestMeta.domain : requestMeta.billing_period || 'No domain'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: statusBg, color: statusColor, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
              {pkg.status}
            </span>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 16, height: 16, color: subText }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Plan + Billing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Hosting Type</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.hostingType}</p>
            </div>
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Plan Details</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.plan}</p>
              {(pkg.type || pkg.plan_name) && <p style={{ color: subText, fontSize: 12, marginTop: 2 }}>{pkg.type || pkg.plan_name}</p>}
            </div>
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Start Date</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{pkg.start_date ? new Date(pkg.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
            </div>
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Billing</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.billing_period}</p>
              <p style={{ color: subText, fontSize: 12, marginTop: 2 }}>
                Next Invoice: {(pkg.expiry_date || pkg.expiryDate) ? new Date(pkg.expiry_date || pkg.expiryDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Domain</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.domain}</p>
            </div>
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expiry</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>
                {requestMeta.expiryDate ? new Date(requestMeta.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{isAutoRenew ? 'Price (1st payment)' : 'Price'}</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.price ? `${requestMeta.currency} ${requestMeta.price}` : 'N/A'}</p>
            </div>
            {isAutoRenew && renewalPrice != null && (
              <div style={infoPanel}>
                <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Renewal Price</p>
                <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{`${requestMeta.currency} ${renewalPrice}`}</p>
              </div>
            )}
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Auto Renew</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{isAutoRenew ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>

          {/* Usage */}
          <div>
            <p style={{ color: text, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Resource Usage</p>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
              {[
                { Icon: HardDrive, label: 'Disk Usage', value: pkg.usage?.diskUsage ? `${pkg.usage.diskUsage} GB` : (pkg.disk_usage_limit || planDefaults.disk || 'N/A') },
                { Icon: Wifi, label: 'Bandwidth', value: pkg.usage?.bandwidthUsage ? `${pkg.usage.bandwidthUsage} GB` : (pkg.bandwidth_limit || planDefaults.bw || 'N/A') },
              ].map(({ Icon, label, value }) => (
                <div key={label} style={{ ...infoPanel, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '14px 10px' }}>
                  <Icon style={{ width: 18, height: 18, color: subText, marginBottom: 6 }} />
                  <p style={{ color: text, fontWeight: 800, fontSize: 16 }}>{value}</p>
                  <p style={{ color: subText, fontSize: 10, marginTop: 2 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={infoPanel}>
            <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Customer Notes</p>
            <p style={{ color: text, fontSize: 13 }}>{requestMeta.notes}</p>
          </div>

          {pkg.customer_message && (
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Message from Admin</p>
              <p style={{ color: text, fontSize: 13 }}>{pkg.customer_message}</p>
            </div>
          )}

          {pkg.show_hosting_access !== false && (cpanelInfo.url || cpanelInfo.username || cpanelInfo.password || cpanelInfo.notes) && (
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Control Panel Access</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {cpanelInfo.url && (
                  <div>
                    <p style={{ color: subText, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>URL</p>
                    <p style={{ color: text, fontSize: 13, wordBreak: 'break-all' }}>{cpanelInfo.url}</p>
                  </div>
                )}
                {cpanelInfo.username && (
                  <div>
                    <p style={{ color: subText, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Username</p>
                    <p style={{ color: text, fontSize: 13 }}>{cpanelInfo.username}</p>
                  </div>
                )}
                {cpanelInfo.password && (
                  <div>
                    <p style={{ color: subText, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Password</p>
                    <p style={{ color: text, fontSize: 13 }}>{cpanelInfo.password}</p>
                  </div>
                )}
                {cpanelInfo.notes && (
                  <div>
                    <p style={{ color: subText, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Notes</p>
                    <p style={{ color: text, fontSize: 13 }}>{cpanelInfo.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {pkg.show_ftp_access !== false && (ftpInfo.host || ftpInfo.username || ftpInfo.password) && (
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>FTP Access</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {ftpInfo.host && (
                  <div>
                    <p style={{ color: subText, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Host</p>
                    <p style={{ color: text, fontSize: 13 }}>{ftpInfo.host}</p>
                  </div>
                )}
                {ftpInfo.username && (
                  <div>
                    <p style={{ color: subText, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Username</p>
                    <p style={{ color: text, fontSize: 13 }}>{ftpInfo.username}</p>
                  </div>
                )}
                {ftpInfo.password && (
                  <div>
                    <p style={{ color: subText, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Password</p>
                    <p style={{ color: text, fontSize: 13 }}>{ftpInfo.password}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {pkg.show_additional_credentials !== false && additionalCredentials.length > 0 && (
            <div style={infoPanel}>
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Additional Credentials</p>
              <div style={{ display: 'grid', gap: 12 }}>
                {additionalCredentials.map((cred, idx) => (
                  <div key={idx} style={{ padding: 12, border: `1px solid ${border}`, borderRadius: 12, background: isDark ? '#16181d' : '#fff' }}>
                    <p style={{ color: text, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{cred.type || `Credential ${idx + 1}`}</p>
                    {cred.url && <p style={{ color: subText, fontSize: 12, marginBottom: 4 }}>URL: <span style={{ color: text }}>{cred.url}</span></p>}
                    {cred.username && <p style={{ color: subText, fontSize: 12, marginBottom: 4 }}>Username: <span style={{ color: text }}>{cred.username}</span></p>}
                    {cred.password && <p style={{ color: subText, fontSize: 12 }}>Password: <span style={{ color: text }}>{cred.password}</span></p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Requests */}
          {requests.filter(req => String(req.status || '').toLowerCase() !== 'approved').length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, paddingRight: 4 }}>
              {requests
                .filter(req => String(req.status || '').toLowerCase() !== 'approved')
                .slice(0, 5)
                .map((req) => (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {getReqIcon(req.status)}
                    <span style={{ color: subText, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{req.status}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px', borderRadius: 10, background: 'transparent',
                border: `1px solid ${border}`, color: subText,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = brand; e.currentTarget.style.color = brand; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = subText; }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HostingPackageDetailsModal;
