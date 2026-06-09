import React from 'react';
import { X, Globe } from 'lucide-react';

function statusBadgeStyle(status, isDark) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'registered', 'completed'].includes(s))
    return { bg: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7', color: '#16a34a' };
  if (s.includes('pending'))
    return { bg: isDark ? 'rgba(234,179,8,0.15)' : '#fef9c3', color: '#ca8a04' };
  if (['rejected', 'expired', 'cancelled', 'disabled'].includes(s))
    return { bg: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#dc2626' };
  return { bg: isDark ? 'rgba(100,116,139,0.15)' : '#f1f5f9', color: '#64748b' };
}

function DomainDetailsModal({ domain, isOpen, onClose, isDark = false, c = {} }) {
  if (!isOpen || !domain) return null;

  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const panel2 = c.panel2 || '#f5f5f5';

  const formatDate = (val) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const isExpired = domain.expiry_date && new Date(domain.expiry_date).getTime() < new Date().getTime();
  const displayStatus = isExpired ? 'EXPIRED' : (domain.status || 'Unknown');
  const { bg: statusBg, color: statusColor } = statusBadgeStyle(displayStatus, isDark);

  const rows = [
    { label: 'Domain Name', value: domain.name || domain.domain_name || 'N/A' },
    { label: 'Registration Period', value: domain.registration_period ? `${domain.registration_period} Year${domain.registration_period !== 1 ? 's' : ''}` : 'N/A' },
    { label: 'Start Date', value: formatDate(domain.start_date || domain.created_at) },
    { label: 'Expiry Date', value: formatDate(domain.expiry_date || domain.expiryDate) },
    { label: 'Auto Renew', value: (domain.auto_renew ?? domain.autoRenew) ? 'Enabled' : 'Disabled' },
    { label: 'Notes', value: domain.notes || '—' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{
        background: isDark ? '#1C1E24' : '#fff',
        border: `1px solid ${border}`,
        borderRadius: 24,
        width: '100%', maxWidth: 480,
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe style={{ width: 18, height: 18, color: brand }} />
            </div>
            <div>
              <p style={{ color: text, fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
                {domain.name || domain.domain_name}
              </p>
              <p style={{ color: subText, fontSize: 12 }}>Domain details</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: statusBg, color: statusColor, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
              {displayStatus}
            </span>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 16, height: 16, color: subText }} />
            </button>
          </div>
        </div>

        {/* Rows */}
        <div style={{ padding: '8px 24px' }}>
          {rows.map(({ label, value }, i) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', fontSize: 13,
              borderBottom: i < rows.length - 1 ? `1px solid ${border}` : 'none',
            }}>
              <span style={{ color: subText, fontWeight: 500 }}>{label}</span>
              <span style={{ color: text, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end' }}>
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
  );
}

export default DomainDetailsModal;
