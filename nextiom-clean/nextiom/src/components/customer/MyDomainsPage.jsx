import React, { useState, useEffect } from 'react';
import { Search, Loader2, Globe, Clock, X } from 'lucide-react';
import { getCustomerDomains, getCustomerDomainRequests, updateDomain, updateDomainRequest, resolveCustomerId } from '@/lib/storage';
import DomainDetailsModal from './DomainDetailsModal';
import { useToast } from '@/components/ui/use-toast';

function statusStyle(status, isDark) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'completed', 'registered', 'connected'].includes(s))
    return { bg: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7', color: '#16a34a' };
  if (s.startsWith('pending'))
    return { bg: isDark ? 'rgba(234,179,8,0.15)' : '#fef9c3', color: '#ca8a04' };
  if (['rejected', 'cancelled', 'disabled', 'expired', 'suspended'].includes(s))
    return { bg: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#dc2626' };
  return { bg: isDark ? 'rgba(100,116,139,0.15)' : '#f1f5f9', color: '#64748b' };
}

function MyDomainsPage({ user, isDark = false, c = {} }) {
  const [domains, setDomains] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [timelineItem, setTimelineItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const brand = c.brand || 'var(--brand-color)';
  const brandLight = c.brandLight || 'var(--brand-color-light)';
  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';

  useEffect(() => { loadDomains(); }, [user?.id, user?.email]);

  const loadDomains = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const customerId = await resolveCustomerId({ customerId: user.id, userId: user.id, email: user.email });
      if (!customerId) { setDomains([]); return; }

      const data = await getCustomerDomains(customerId);
      const reqs = await getCustomerDomainRequests(customerId);

      const combined = [
        ...(Array.isArray(data) ? data : []),
        ...(Array.isArray(reqs) ? reqs : []).map(r => ({
          ...r,
          id: `req-${r.id}`,
          name: r.domain_name || r.name || 'Unknown Domain',
          status: String(r.status || '').toLowerCase() === 'pending' ? 'Pending Registration' : r.status,
          isRequest: true,
        })),
      ];
      setDomains(combined);
    } catch {
      setDomains([]);
      toast({ title: 'Error', description: 'Failed to load domains', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getExpiredText = (date) => {
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
  };

  const filteredDomains = domains.filter(d =>
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Loader2 style={{ width: 28, height: 28, color: brand }} className="animate-spin" />
      </div>
    );
  }

  const inputStyle = {
    width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
    fontSize: 13, border: `1px solid ${borderStrong}`,
    borderRadius: 10, background: panel2, color: text, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Globe style={{ width: 16, height: 16, color: brand }} />
        </div>
        <h1 style={{ color: text, fontSize: 18, fontWeight: 700 }}>My Domains</h1>
      </div>

      <div style={{
        background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${border}`,
        borderRadius: 20,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        maxWidth: 900,
        width: '100%',
        margin: '0 auto',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
          <div style={{ position: 'relative', maxWidth: 320 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: subText }} />
            <input
              type="text"
              placeholder="Search domains…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = borderStrong}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: panel2 }}>
                {['Domain', 'Status', 'Start Date', 'Expiry', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: h === 'Actions' ? 'right' : 'left',
                    fontSize: 10, fontWeight: 700, color: subText,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    borderBottom: `1px solid ${border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDomains.length > 0 ? filteredDomains.map(domain => {
                const isExpired = domain.expiry_date && new Date(domain.expiry_date).getTime() < new Date().getTime();
                const displayStatus = isExpired ? 'EXPIRED' : (domain.status || 'Unknown');
                const { bg, color } = statusStyle(displayStatus, isDark);
                return (
                  <tr
                    key={domain.id}
                    style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: text, fontWeight: 600, fontSize: 13 }}>{domain.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                        {displayStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: subText, fontSize: 13 }}>
                      {domain.start_date ? new Date(domain.start_date).toLocaleDateString() : domain.created_at ? new Date(domain.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: subText, fontSize: 13 }}>
                      {domain.expiry_date ? (
                        <div>
                          <div style={{ fontSize: 12, color: isExpired ? '#ef4444' : text, fontWeight: isExpired ? 600 : 400 }}>
                            {new Date(domain.expiry_date).toLocaleDateString()}
                          </div>
                          {isExpired && (
                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>
                              {getExpiredText(domain.expiry_date)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: subText, fontSize: 13 }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => setTimelineItem(domain)}
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
                        <button
                          onClick={() => { setSelectedDomain(domain); setIsDetailsOpen(true); }}
                          style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: brandLight, color: brand, border: `1px solid ${brand}`,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = `rgba(232,123,53,0.25)`}
                          onMouseLeave={e => e.currentTarget.style.background = brandLight}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: subText, fontSize: 13 }}>
                    No domains found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DomainDetailsModal
        domain={selectedDomain}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        isDark={isDark}
        c={c}
      />

      <ItemTimelineModal
        item={timelineItem}
        type="domain"
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

export default MyDomainsPage;
