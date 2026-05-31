import React from 'react';
import { X, Server, HardDrive, Wifi, Mail, Database, CheckCircle, Clock, XCircle } from 'lucide-react';
import { HOSTING_STATUS, REQUEST_STATUS, getHostingRequests, getHostingActivityLog } from '@/lib/storage';

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

  const requestMeta = React.useMemo(() => {
    const raw = pkg?.package_type || pkg?.package_name || pkg?.packageName || pkg?.notes || '';
    return {
      plan: raw.split('|')[0]?.trim() || raw || 'Hosting Request',
      billing_period: parseRequestField(raw, 'Billing') || pkg?.billing_period || '-',
      domain: pkg?.domain || pkg?.domain_name || parseRequestField(raw, 'Domain') || 'No domain',
      notes: pkg?.notes || parseRequestField(raw, 'Notes') || 'None',
    };
  }, [pkg]);

  React.useEffect(() => {
    if (!pkg) return;
    getHostingRequests().then(reqs => {
      const filtered = (reqs || []).filter(r => {
        if (r.package_id && pkg.id) return r.package_id === pkg.id;
        const rPkg = r.package_name || r.package_type || r.packageName;
        const pPkg = pkg.package_name || pkg.package_type || pkg.packageName;
        return r.customer_id === pkg.customer_id && rPkg === pPkg;
      });
      setRequests(filtered);
    });
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
              <p style={{ color: subText, fontSize: 12 }}>{requestMeta.domain}</p>
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
              <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Plan Details</p>
              <p style={{ color: text, fontWeight: 700, fontSize: 14 }}>{requestMeta.plan}</p>
              {pkg.type && <p style={{ color: subText, fontSize: 12, marginTop: 2 }}>{pkg.type}</p>}
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
          </div>

          {/* Usage */}
          <div>
            <p style={{ color: text, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Resource Usage</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { Icon: HardDrive, label: 'Disk Usage', value: `${pkg.usage?.diskUsage || 0} GB`, limit: pkg.disk_usage_limit || pkg.planDisk || '' },
                { Icon: Wifi, label: 'Bandwidth', value: `${pkg.usage?.bandwidthUsage || 0} GB`, limit: pkg.bandwidth_limit || pkg.planBw || '' },
                { Icon: Mail, label: 'Email Accounts', value: pkg.usage?.emailAccounts || 0, limit: '' },
                { Icon: Database, label: 'Databases', value: pkg.usage?.databases || 0, limit: '' },
              ].map(({ Icon, label, value, limit }) => (
                <div key={label} style={{ ...infoPanel, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '14px 10px' }}>
                  <Icon style={{ width: 18, height: 18, color: subText, marginBottom: 6 }} />
                  <p style={{ color: text, fontWeight: 800, fontSize: 16 }}>{value}</p>
                  <p style={{ color: subText, fontSize: 10, marginTop: 2 }}>{label}</p>
                  {limit ? <p style={{ color: subText, fontSize: 9, marginTop: 4, opacity: 0.6 }}>Limit: {limit}</p> : null}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={infoPanel}>
            <p style={{ color: subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Customer Notes</p>
            <p style={{ color: text, fontSize: 13 }}>{requestMeta.notes}</p>
          </div>

          {/* Recent Requests */}
          <div>
            <p style={{ color: text, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Recent Requests</p>
            {requests.length > 0 ? (
              <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
                {requests.slice(0, 5).map((req, i) => (
                  <div key={req.id} style={{
                    padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: i < Math.min(requests.length, 5) - 1 ? `1px solid ${border}` : 'none',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <p style={{ color: text, fontSize: 13, fontWeight: 600 }}>{req.type}</p>
                      <p style={{ color: subText, fontSize: 11 }}>{req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getReqIcon(req.status)}
                      <span style={{ color: subText, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{req.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: subText, fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '16px', border: `1px dashed ${border}`, borderRadius: 12 }}>
                No requests found.
              </p>
            )}
          </div>

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
