import React, { useState, useEffect } from 'react';
import { Search, Loader2, Server, Eye, Clock, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getCustomerHostingPackages, getCustomerHostingRequests, resolveCustomerId } from '@/lib/storage';
import HostingPackageDetailsModal from './HostingPackageDetailsModal';

function statusStyle(status, isDark) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'completed'].includes(s))
    return { bg: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7', color: '#16a34a' };
  if (s.startsWith('pending'))
    return { bg: isDark ? 'rgba(234,179,8,0.15)' : '#fef9c3', color: '#ca8a04' };
  if (['rejected', 'cancelled', 'disabled', 'expired', 'suspended'].includes(s))
    return { bg: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#dc2626' };
  if (['processing', 'reviewing'].includes(s))
    return { bg: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe', color: '#2563eb' };
  return { bg: isDark ? 'rgba(100,116,139,0.15)' : '#f1f5f9', color: '#64748b' };
}

function MyHostingPackagesPage({ user, isDark = false, c = {} }) {
  const [packages, setPackages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
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

  const normalizeHostingKey = (value) => String(value || '').split('|')[0].trim().toLowerCase();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { loadPackages(); }, [user?.id, user?.email]);

  const billingMonths = (billing) => {
    const b = String(billing || '').toLowerCase();
    if (b.includes('yearly') || b.includes('annual')) return 12;
    if (b.includes('6')) return 6;
    if (b.includes('3')) return 3;
    return 1;
  };

  const calcExpiry = (pkg) => {
    if (pkg.expiry_date) return new Date(pkg.expiry_date);
    const isApproved = ['active', 'approved', 'completed'].includes(String(pkg.status || '').toLowerCase());
    if (!isApproved || !pkg.updated_at) return null;
    const base = new Date(pkg.updated_at);
    base.setMonth(base.getMonth() + billingMonths(pkg.billing_period));
    return base;
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

  const parseRequestField = (raw, label) => {
    if (!raw) return null;
    const regex = new RegExp(`${label}:\\s*([^|;\\n]+)`, 'i');
    const match = raw.match(regex);
    return match?.[1]?.trim() || null;
  };

  const parseHostingRequest = (request) => {
    const raw = request.package_type || request.notes || '';
    const plan = raw.split('|')[0]?.trim() || raw || 'Hosting Request';
    const packageParts = plan.split(' - ');
    return {
      plan,
      hosting_type: request.hosting_type || packageParts[0]?.trim() || '',
      plan_name: request.plan_name || packageParts[1]?.trim() || packageParts[0]?.trim() || '',
      billing_period: parseRequestField(raw, 'Billing'),
      domain: request.domain || request.domain_name || parseRequestField(raw, 'Domain'),
      notes: parseRequestField(raw, 'Notes') || 'None',
    };
  };

  const loadPackages = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const customerId = await resolveCustomerId({ customerId: user.id, userId: user.id, email: user.email });
      if (!customerId) { setPackages([]); return; }

      const data = await getCustomerHostingPackages(customerId);
      const reqs = await getCustomerHostingRequests(customerId);

      const requestIndex = new Map();
      (Array.isArray(reqs) ? reqs : []).forEach(req => {
        const key = `${req.customer_id || customerId}:${normalizeHostingKey(req.package_name || req.package_type || req.packageName)}`;
        if (!key) return;
        requestIndex.set(key, req);
      });

      const linkedRequestIds = new Set();

      const enrichedPackages = (Array.isArray(data) ? data : []).map(pkg => {
        const key = `${pkg.customer_id || customerId}:${normalizeHostingKey(pkg.package_name || pkg.package_type || pkg.packageName)}`;
        const linkedRequest = requestIndex.get(key) || null;
        if (linkedRequest) linkedRequestIds.add(linkedRequest.id);
        const parsed = linkedRequest ? parseHostingRequest(linkedRequest) : parseHostingRequest(pkg);

        const billingPeriod = pkg.billing_period || linkedRequest?.billing_period || parsed.billing_period;
        const start_date = pkg.start_date || linkedRequest?.start_date || linkedRequest?.updated_at || pkg.created_at;

        // Calculate expiry date
        let expiryDate = null;
        if (pkg.expiry_date || linkedRequest?.expiry_date) {
          expiryDate = new Date(pkg.expiry_date || linkedRequest.expiry_date);
        } else {
          const isApproved = ['active', 'approved', 'completed'].includes(String(pkg.status || '').toLowerCase());
          if (isApproved && (pkg.updated_at || pkg.created_at)) {
            const base = new Date(pkg.updated_at || pkg.created_at);
            base.setMonth(base.getMonth() + billingMonths(billingPeriod));
            expiryDate = base;
          }
        }

        let isExpired = false;
        if (expiryDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const exp = new Date(expiryDate);
          exp.setHours(0, 0, 0, 0);
          isExpired = today.getTime() > exp.getTime();
        }

        const initialStatus = pkg.status || 'Active';
        const displayStatus = isExpired ? 'Expired' : initialStatus;

        return {
          ...pkg,
          status: displayStatus,
          package_type: pkg.package_type || linkedRequest?.package_type || parsed.plan,
          packageName: pkg.packageName || pkg.package_name || parsed.plan,
          package_name: pkg.package_name || pkg.packageName || parsed.plan,
          hosting_type: pkg.hosting_type || linkedRequest?.hosting_type || parsed.hosting_type,
          plan_name: pkg.plan_name || linkedRequest?.plan_name || parsed.plan_name,
          billing_period: billingPeriod,
          domain: pkg.domain || linkedRequest?.domain || parsed.domain || 'N/A',
          notes: pkg.notes || linkedRequest?.notes || parsed.notes,
          start_date: start_date,
          expiry_date: expiryDate ? expiryDate.toISOString() : null,
          disk_usage_limit: pkg.disk_limit || pkg.disk_usage_limit || linkedRequest?.disk_usage_limit || null,
          bandwidth_limit: pkg.bandwidth_limit || linkedRequest?.bandwidth_limit || null,
          cpu_cores: pkg.cpu_cores || linkedRequest?.cpu_cores_limit || null,
          ram: pkg.ram || linkedRequest?.ram_limit || null,
          inodes: pkg.inodes || linkedRequest?.inodes_limit || null,
          addon_domains: pkg.addon_domains || linkedRequest?.addon_domains_limit || null,
          email_accounts: pkg.email_accounts || linkedRequest?.email_accounts_limit || null,
          databases: pkg.databases || linkedRequest?.databases_limit || null,
          currency: pkg.currency || linkedRequest?.currency || 'LKR',
          relatedRequests: linkedRequest ? [linkedRequest] : [],
          linkedRequestId: linkedRequest?.id || null,
          renewal_history: pkg.renewal_history || linkedRequest?.renewal_history || [],
          isRequest: false,
        };
      });

      const combined = [
        ...enrichedPackages,
        ...(Array.isArray(reqs) ? reqs : []).filter(r => !linkedRequestIds.has(r.id)).map(r => {
          const parsed = parseHostingRequest(r);
          let expiryDate = null;
          if (r.expiry_date) {
            expiryDate = new Date(r.expiry_date);
          }
          let isExpired = false;
          if (expiryDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const exp = new Date(expiryDate);
            exp.setHours(0, 0, 0, 0);
            isExpired = today.getTime() > exp.getTime();
          }
          const initialStatus = String(r.status || '').toLowerCase() === 'pending' ? 'Pending Setup' : r.status;
          const displayStatus = isExpired ? 'Expired' : initialStatus;
          return {
            ...r,
            id: `req-${r.id}`,
            status: displayStatus,
            package_type: parsed.plan,
            packageName: parsed.plan,
            plan: parsed.plan,
            hosting_type: parsed.hosting_type,
            plan_name: parsed.plan_name,
            billing_period: parsed.billing_period,
            domain: parsed.domain || 'N/A',
            notes: parsed.notes,
            start_date: r.start_date || r.updated_at || r.created_at,
            expiry_date: expiryDate ? expiryDate.toISOString() : null,
            disk_usage_limit: r.disk_usage_limit || null,
            bandwidth_limit: r.bandwidth_limit || null,
            cpu_cores: r.cpu_cores_limit || null,
            ram: r.ram_limit || null,
            inodes: r.inodes_limit || null,
            addon_domains: r.addon_domains_limit || null,
            email_accounts: r.email_accounts_limit || null,
            databases: r.databases_limit || null,
            currency: r.currency || 'LKR',
            isRequest: true,
          };
        }),
      ];
      setPackages(combined);
    } catch (err) {
      console.error('Error loading packages:', err);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPackages = packages.filter(p =>
    (p.package_name || p.package_type || p.packageName || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          <Server style={{ width: 16, height: 16, color: brand }} />
        </div>
        <h1 style={{ color: text, fontSize: 18, fontWeight: 700 }}>My Hosting Packages</h1>
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
        {/* Search bar */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
          <div style={{ position: 'relative', maxWidth: 320 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: subText }} />
            <input
              type="text"
              placeholder="Search packages…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = borderStrong}
            />
          </div>
        </div>

        {/* Table */}
        {isMobile ? (
          filteredPackages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px' }}>
              {filteredPackages.map(pkg => {
                const { bg, color } = statusStyle(pkg.status, isDark);
                const displayName = pkg.package_name || pkg.package_type || pkg.packageName || 'N/A';
                const expiryDate = calcExpiry(pkg);
                const daysLeft = expiryDate ? Math.ceil((expiryDate - new Date()) / 86400000) : null;
                const expiryColor = daysLeft !== null && daysLeft <= 7 ? '#ef4444' : daysLeft !== null && daysLeft <= 30 ? '#f97316' : subText;
                return (
                  <div
                    key={pkg.id}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: text, wordBreak: 'break-all', marginRight: 8 }}>
                        {displayName}
                      </div>
                      <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>
                        {pkg.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: subText }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Domain:</span>
                        <span style={{ color: text, wordBreak: 'break-all' }}>{pkg.domain || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Start Date:</span>
                        <span style={{ color: text }}>
                          {pkg.start_date ? new Date(pkg.start_date).toLocaleDateString() : pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Expiry:</span>
                        {expiryDate ? (
                          <span style={{ color: expiryColor, fontWeight: 600 }}>
                            {expiryDate.toLocaleDateString()} ({daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`})
                          </span>
                        ) : (
                          <span style={{ color: text }}>—</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: `1px solid ${border}`, paddingTop: 10, marginTop: 4 }}>
                      <button
                        onClick={() => setTimelineItem(pkg)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                          color: text, border: `1px solid ${border}`,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Clock style={{ width: 13, height: 13, marginRight: 6 }} />
                        History
                      </button>
                      <button
                        onClick={() => { setSelectedPackage(pkg); setIsDetailsOpen(true); }}
                        style={{
                          padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: brandLight, color: brand, border: `1px solid ${brand}`,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Eye style={{ width: 13, height: 13 }} /> View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: subText, fontSize: 13 }}>
              No hosting packages found
            </div>
          )
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: panel2 }}>
                  {['Package', 'Domain', 'Status', 'Start Date', 'Expiry', 'Actions'].map((h, i) => (
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
                {filteredPackages.length > 0 ? filteredPackages.map(pkg => {
                  const { bg, color } = statusStyle(pkg.status, isDark);
                  const displayName = pkg.package_name || pkg.package_type || pkg.packageName || 'N/A';
                  const expiryDate = calcExpiry(pkg);
                  const daysLeft = expiryDate ? Math.ceil((expiryDate - new Date()) / 86400000) : null;
                  const expiryColor = daysLeft !== null && daysLeft <= 7 ? '#ef4444' : daysLeft !== null && daysLeft <= 30 ? '#f97316' : subText;
                  return (
                    <tr
                      key={pkg.id}
                      style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = hover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: text, fontWeight: 600, fontSize: 13 }}>{displayName}</td>
                      <td style={{ padding: '12px 16px', color: subText, fontSize: 13 }}>{pkg.domain || 'N/A'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                          {pkg.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: subText, fontSize: 13 }}>
                        {pkg.start_date ? new Date(pkg.start_date).toLocaleDateString() : pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {expiryDate ? (
                          <div>
                            <div style={{ fontSize: 12, color: expiryColor, fontWeight: 600 }}>
                              {expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                            <div style={{ fontSize: 11, color: expiryColor, marginTop: 2 }}>
                              {daysLeft <= 0 ? getExpiredText(expiryDate) : `${daysLeft}d remaining`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: subText, fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => setTimelineItem(pkg)}
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
                            onClick={() => { setSelectedPackage(pkg); setIsDetailsOpen(true); }}
                            style={{
                              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: brandLight, color: brand, border: `1px solid ${brand}`,
                              transition: 'background 0.15s',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `rgba(232,123,53,0.25)`}
                            onMouseLeave={e => e.currentTarget.style.background = brandLight}
                          >
                            <Eye style={{ width: 13, height: 13 }} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: subText, fontSize: 13 }}>
                      No hosting packages found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HostingPackageDetailsModal
        pkg={selectedPackage}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        isDark={isDark}
        c={c}
      />

      <ItemTimelineModal
        item={timelineItem}
        type="hosting"
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

export default MyHostingPackagesPage;
