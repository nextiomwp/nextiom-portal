import React, { useState, useEffect } from 'react';
import { Search, Loader2, Server, Eye } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';

  const normalizeHostingKey = (value) => String(value || '').split('|')[0].trim().toLowerCase();

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

        return {
          ...pkg,
          package_type: pkg.package_type || linkedRequest?.package_type || parsed.plan,
          packageName: pkg.packageName || pkg.package_name || parsed.plan,
          package_name: pkg.package_name || pkg.packageName || parsed.plan,
          hosting_type: pkg.hosting_type || linkedRequest?.hosting_type || parsed.hosting_type,
          plan_name: pkg.plan_name || linkedRequest?.plan_name || parsed.plan_name,
          billing_period: pkg.billing_period || linkedRequest?.billing_period || parsed.billing_period,
          domain: pkg.domain || linkedRequest?.domain || parsed.domain || 'N/A',
          notes: pkg.notes || linkedRequest?.notes || parsed.notes,
          start_date: pkg.start_date || linkedRequest?.start_date || linkedRequest?.updated_at || pkg.created_at,
          expiry_date: pkg.expiry_date || linkedRequest?.expiry_date || null,
          disk_usage_limit: pkg.disk_usage_limit || linkedRequest?.disk_usage_limit || null,
          bandwidth_limit: pkg.bandwidth_limit || linkedRequest?.bandwidth_limit || null,
          currency: pkg.currency || linkedRequest?.currency || 'LKR',
          relatedRequests: linkedRequest ? [linkedRequest] : [],
          linkedRequestId: linkedRequest?.id || null,
          isRequest: false,
        };
      });

      const combined = [
        ...enrichedPackages,
        ...(Array.isArray(reqs) ? reqs : []).filter(r => !linkedRequestIds.has(r.id)).map(r => {
          const parsed = parseHostingRequest(r);
          return {
            ...r,
            id: `req-${r.id}`,
            package_type: parsed.plan,
            packageName: parsed.plan,
            plan: parsed.plan,
            hosting_type: parsed.hosting_type,
            plan_name: parsed.plan_name,
            billing_period: parsed.billing_period,
            status: String(r.status || '').toLowerCase() === 'pending' ? 'Pending Setup' : r.status,
            domain: parsed.domain || 'N/A',
            notes: parsed.notes,
            start_date: r.start_date || r.updated_at || r.created_at,
            expiry_date: r.expiry_date || null,
            disk_usage_limit: r.disk_usage_limit || null,
            bandwidth_limit: r.bandwidth_limit || null,
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <button
                        onClick={() => { setSelectedPackage(pkg); setIsDetailsOpen(true); }}
                        style={{
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: brandLight, color: brand, border: `1px solid ${brand}`,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `rgba(232,123,53,0.25)`}
                        onMouseLeave={e => e.currentTarget.style.background = brandLight}
                      >
                        <Eye style={{ width: 13, height: 13 }} /> View
                      </button>
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
      </div>

      <HostingPackageDetailsModal
        pkg={selectedPackage}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        isDark={isDark}
        c={c}
      />
    </div>
  );
}

export default MyHostingPackagesPage;
