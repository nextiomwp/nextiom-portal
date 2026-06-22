import React, { useState, useEffect } from 'react';
import { Loader2, Globe, Server, Bell, TrendingUp, TrendingDown, ShoppingCart, CheckCircle2, DollarSign, Phone, Mail, MapPin, Building, ChevronRight, Info, ExternalLink, Package, Shield, Key, CreditCard, MessageSquare, Clock, Settings, Megaphone, AlertCircle, X, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import NewsAnnouncementsCard from './NewsAnnouncementsCard';
import RateUsCard from './RateUsCard';

function getLast6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    };
  });
}

function getMonthKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function StatusBadge({ status, isDark }) {
  const s = String(status || '').toLowerCase();
  let bg, color, label;
  if (['active', 'approved', 'completed', 'connected', 'registered'].includes(s)) {
    bg = isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7'; color = '#16a34a'; label = s.charAt(0).toUpperCase() + s.slice(1);
  } else if (s.startsWith('pending')) {
    bg = isDark ? 'rgba(234,179,8,0.15)' : '#fef9c3'; color = '#ca8a04'; label = 'Pending';
  } else if (['rejected', 'cancelled', 'closed', 'disabled', 'expired', 'suspended'].includes(s)) {
    bg = isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2'; color = '#dc2626'; label = s.charAt(0).toUpperCase() + s.slice(1);
  } else if (['processing', 'reviewing'].includes(s)) {
    bg = isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe'; color = '#2563eb'; label = 'Processing';
  } else if (s === 'payment_required' || s === 'payment required') {
    bg = isDark ? 'rgba(249,115,22,0.15)' : '#ffedd5'; color = '#ea580c'; label = 'Payment Due';
  } else {
    bg = isDark ? 'rgba(100,116,139,0.15)' : '#f1f5f9'; color = '#64748b'; label = status || 'Info';
  }
  return (
    <span style={{ backgroundColor: bg, color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function LineChart({ data, c, isDark }) {
  const W = 480, H = 120;
  const pad = { t: 16, r: 12, b: 32, l: 32 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const maxV = Math.max(...data.map(d => d.count), 2);
  const yTicks = [0, Math.ceil(maxV / 2), maxV];
  const brand = c.brand || '#E87B35';
  const subText = c.subText || '#888';

  const pts = data.map((d, i) => ({
    x: pad.l + (data.length > 1 ? (i / (data.length - 1)) : 0.5) * cW,
    y: pad.t + cH - (d.count / maxV) * cH,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)},${(pad.t + cH).toFixed(1)} L ${pts[0].x.toFixed(1)},${(pad.t + cH).toFixed(1)} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="dg-orders" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={brand} stopOpacity="0.3" />
          <stop offset="100%" stopColor={brand} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => {
        const y = pad.t + cH - (tick / maxV) * cH;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y}
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="1" />
            <text x={pad.l - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill={subText}>{tick}</text>
          </g>
        );
      })}
      {areaPath && <path d={areaPath} fill="url(#dg-orders)" />}
      {linePath && <path d={linePath} fill="none" stroke={brand} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4"
          fill={brand} stroke={isDark ? '#1C1E24' : '#fff'} strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pts[i]?.x} y={H - 4} textAnchor="middle" fontSize="9" fill={subText}>{d.label}</text>
      ))}
    </svg>
  );
}

function ActivityIcon({ type, isDark }) {
  const map = {
    domain: { Icon: Globe, color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.2)' : '#ede9fe' },
    hosting: { Icon: Server, color: '#0891b2', bg: isDark ? 'rgba(8,145,178,0.2)' : '#cffafe' },
    email: { Icon: Mail, color: '#e87b35', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    login: { Icon: Shield, color: '#3b82f6', bg: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe' },
    product: { Icon: Package, color: '#ec4899', bg: isDark ? 'rgba(236,72,153,0.2)' : '#fce7f3' },
    invoice: { Icon: CreditCard, color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5' },
    ticket: { Icon: MessageSquare, color: '#14b8a6', bg: isDark ? 'rgba(20,184,166,0.2)' : '#ccfbf1' },
    expiration: { Icon: Clock, color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7' },
    update: { Icon: Settings, color: '#6366f1', bg: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff' },
    announcement: { Icon: Megaphone, color: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2' },
  };
  const item = map[type] || { Icon: Bell, color: '#e87b35', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' };
  const Icon = item.Icon;
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon style={{ width: 16, height: 16, color: item.color }} />
    </div>
  );
}

function StatMiniCard({ icon: Icon, iconBg, iconColor, label, value, valueColor, description, quickActionText, onClick, c, isDark }) {
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';

  return (
    <div
      onClick={onClick}
      className="transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer"
      style={{
        background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: '18px 20px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxSizing: 'border-box'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = brand;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = border;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: subText, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
          <p style={{ color: valueColor || text, fontSize: 18, fontWeight: 800, lineHeight: 1.2, margin: 0, wordBreak: 'break-all' }}>{value}</p>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
      </div>
      
      {description && (
        <p style={{ color: subText, fontSize: 11, margin: '8px 0 0 0', lineHeight: 1.4 }}>{description}</p>
      )}

      {quickActionText && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: brand, fontSize: 11, fontWeight: 700, marginTop: 12, borderTop: `1px solid ${border}`, paddingTop: 8 }}>
          <span>{quickActionText}</span>
          <ChevronRight style={{ width: 12, height: 12 }} />
        </div>
      )}
    </div>
  );
}

function DashboardPage({ user, isDark = false, c = {}, onNavigate }) {
  const [data, setData] = useState({
    chartData: [],
    totalOrders: 0,
    approvedOrders: 0,
    totalProducts: 0,
    totalSpend: 'LKR 0.00 / USD 0.00',
    successRate: 0,
    growth: 0,
    recentActivity: [],
    invoiceSummary: {
      paid: { count: 0, LKR: 0, USD: 0 },
      pending: { count: 0, LKR: 0, USD: 0 },
      overdue: { count: 0, LKR: 0, USD: 0 }
    },
    serviceHealth: {
      hosting: 'unknown',
      domain: 'unknown',
      email: 'unknown',
      renewalSoon: false,
    },
    renewalAlerts: [],
    latestAnnouncement: null,
    isLoading: true,
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const brand = c.brand || '#E87B35';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    onChange(media);
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) { setData(d => ({ ...d, isLoading: false })); return; }
      const customerId = user.id;

      try {
        const [
          domainRes, 
          hostingRes, 
          emailRes, 
          notifRes, 
          invoiceRes, 
          customerRes, 
          productsRes,
          hostingPackagesRes,
          domainsRes,
          emailsRes,
          latestAnnouncementRes
        ] = await Promise.all([
          supabase.from('domain_requests')
            .select('id, status, created_at, domain_name')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false }),
          supabase.from('hosting_requests')
            .select('id, status, created_at, package_type')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false }),
          supabase.from('email_requests')
            .select('id, status, created_at, email')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false }),
          supabase.from('notifications')
            .select('id, title, message, type, created_at, read_status')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })
            .limit(15),
          supabase.from('invoices')
            .select('total, currency, status, invoice_date, due_date')
            .eq('client_email', user.email),
          supabase.from('customers')
            .select('notifications_cleared_at')
            .eq('id', customerId)
            .maybeSingle(),
          supabase.from('licenses')
            .select('*, products(id, name, type, license_type, category)')
            .eq('customer_id', customerId),
          supabase.from('hosting_packages')
            .select('id, package_type, status, expiry_date, domain_name')
            .eq('customer_id', customerId),
          supabase.from('domains')
            .select('id, domain_name, status, expiry_date')
            .eq('customer_id', customerId),
          supabase.from('email_requests')
            .select('id, email, status, expiry_date')
            .eq('customer_id', customerId),
          supabase.from('notifications')
            .select('id, title, message, created_at')
            .eq('customer_id', customerId)
            .eq('type', 'announcement')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        const clearedTime = customerRes?.data?.notifications_cleared_at 
          ? new Date(customerRes.data.notifications_cleared_at).getTime() 
          : 0;

        const domains = domainRes.data || [];
        const hostings = hostingRes.data || [];
        const emails = emailRes.data || [];
        const allOrders = [...domains, ...hostings, ...emails];

        const approved = allOrders.filter(o =>
          ['approved', 'completed', 'active'].includes(String(o.status || '').toLowerCase())
        );

        // Process Invoices for Summary
        const invoices = invoiceRes.data || [];
        const todayStr = new Date().toISOString().split('T')[0];
        
        const processedInvoices = invoices.map(inv => {
          let status = inv.status;
          if (status !== 'paid' && status !== 'payment_submitted') {
            const due = inv.due_date ? inv.due_date.split('T')[0] : null;
            if (due && due < todayStr) {
              status = 'overdue';
            }
          }
          return { ...inv, status };
        });

        const invoiceSummary = processedInvoices.reduce((acc, inv) => {
          const status = inv.status;
          const currency = inv.currency === 'USD' ? 'USD' : 'LKR';
          const total = parseFloat(inv.total) || 0;

          let cat = 'pending';
          if (status === 'paid') cat = 'paid';
          else if (status === 'overdue') cat = 'overdue';
          else cat = 'pending';

          acc[cat].count += 1;
          acc[cat][currency] += total;
          return acc;
        }, {
          paid: { count: 0, LKR: 0, USD: 0 },
          pending: { count: 0, LKR: 0, USD: 0 },
          overdue: { count: 0, LKR: 0, USD: 0 }
        });

        // Compute Total Spend
        const formatCurrency = (amount, currency) => {
          if (currency === 'USD') {
            return 'USD ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          return 'LKR ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const totalSpend = ['LKR', 'USD']
          .map(cur => formatCurrency(invoiceSummary.paid[cur], cur))
          .join(' / ') || formatCurrency(0, 'LKR');

        const months = getLast6Months();
        const chartData = months.map(m => ({
          ...m,
          count: allOrders.filter(o => getMonthKey(o.created_at) === m.key).length,
        }));

        const recent3 = chartData.slice(3).reduce((s, d) => s + d.count, 0);
        const older3 = chartData.slice(0, 3).reduce((s, d) => s + d.count, 0);
        const growth = older3 === 0 ? (recent3 > 0 ? 100 : 0) : Math.round(((recent3 - older3) / older3) * 100);

        // Process Service Health
        const hasActiveHosting = hostingPackagesRes.data?.some(h => ['active', 'connected', 'approved'].includes(String(h.status || '').toLowerCase()));
        const hasActiveDomain = domainsRes.data?.some(d => ['active', 'registered', 'approved', 'connected'].includes(String(d.status || '').toLowerCase()));
        const hasActiveEmail = emailsRes.data?.some(e => ['active', 'connected', 'approved', 'completed'].includes(String(e.status || '').toLowerCase()));

        // Process Renewal Alerts (<30 days)
        const getDaysUntilExpiry = (expiryDate) => {
          if (!expiryDate) return null;
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const exp = new Date(expiryDate);
          exp.setHours(0, 0, 0, 0);
          const diff = exp.getTime() - now.getTime();
          return Math.ceil(diff / 86400000);
        };

        const renewalAlerts = [];
        
        (domainsRes.data || []).forEach(d => {
          if (d.expiry_date) {
            const days = getDaysUntilExpiry(d.expiry_date);
            if (days !== null && days >= 0 && days <= 30) {
              renewalAlerts.push({
                type: 'domain',
                name: d.domain_name,
                days,
                message: `Domain ${d.domain_name} expires in ${days} day${days !== 1 ? 's' : ''}.`
              });
            }
          }
        });

        (hostingPackagesRes.data || []).forEach(h => {
          if (h.expiry_date) {
            const days = getDaysUntilExpiry(h.expiry_date);
            if (days !== null && days >= 0 && days <= 30) {
              const planName = h.package_type?.split('|')[0]?.trim() || 'Hosting Plan';
              renewalAlerts.push({
                type: 'hosting',
                name: planName,
                days,
                message: `Hosting ${planName} (${h.domain_name || 'No domain'}) expires in ${days} day${days !== 1 ? 's' : ''}.`
              });
            }
          }
        });

        const licenses = productsRes.data || [];
        let hasExpiredProducts = false;

        licenses.forEach(l => {
          const prodName = l.products?.name || l.name || 'Software Product';
          let isLickExpired = false;
          let isLickExpiringSoon = false;
          let days = null;

          if (l.status === 'Expired') {
            isLickExpired = true;
          } else if (l.status === 'Disabled' || l.status === 'Suspended') {
            // Disabled or suspended
          } else {
            const lt = l.license_type || l.products?.license_type || 'one_time';
            if ((lt === 'yearly' || lt === 'monthly') && l.expiry_date) {
              days = getDaysUntilExpiry(l.expiry_date);
              if (days !== null) {
                if (days <= 0) {
                  isLickExpired = true;
                } else if (days <= 30) {
                  isLickExpiringSoon = true;
                }
              }
            }
          }

          if (isLickExpired) {
            hasExpiredProducts = true;
            renewalAlerts.push({
              type: 'product',
              name: prodName,
              days: days !== null ? days : -1,
              message: `Product ${prodName} has expired.`
            });
          } else if (isLickExpiringSoon) {
            renewalAlerts.push({
              type: 'product',
              name: prodName,
              days,
              message: `Product ${prodName} expires in ${days} day${days !== 1 ? 's' : ''}.`
            });
          }
        });

        const hasRenewalSoon = renewalAlerts.length > 0;

        // Process Recent Activity (up to 8 items, sorting notifications and request logs)
        const notificationItems = (notifRes.data || []).map(n => {
          let activityType = 'notification';
          let actTitle = n.title;
          let actSubtitle = n.message || '';

          if (n.type === 'customer_login') {
            activityType = 'login';
            actTitle = 'Security Login';
            actSubtitle = n.message || 'Customer login session';
          } else if (n.type === 'product_assigned' || n.type === 'new_product') {
            activityType = 'product';
            actSubtitle = 'Product Assignment';
          } else if (n.type === 'invoice') {
            activityType = 'invoice';
          } else if (n.type === 'ticket') {
            activityType = 'ticket';
          } else if (n.type === 'expiration') {
            activityType = 'expiration';
          } else if (n.type === 'update') {
            activityType = 'update';
          } else if (n.type === 'announcement') {
            activityType = 'announcement';
          }

          return {
            id: `n-${n.id}`,
            type: activityType,
            title: actTitle,
            subtitle: actSubtitle.substring(0, 60) + (actSubtitle.length > 60 ? '…' : ''),
            status: n.type || 'info',
            date: n.created_at,
          };
        });

        let activityItems = [
          ...domains.slice(0, 5).map(r => ({
            id: `d-${r.id}`,
            type: 'domain',
            title: r.domain_name || 'Domain Registration',
            subtitle: 'Domain Request Submitted',
            status: r.status,
            date: r.created_at,
          })),
          ...hostings.slice(0, 5).map(r => ({
            id: `h-${r.id}`,
            type: 'hosting',
            title: r.package_type?.split('|')[0]?.trim() || 'Hosting Request',
            subtitle: 'Hosting Request Submitted',
            status: r.status,
            date: r.created_at,
          })),
          ...emails.slice(0, 5).map(r => ({
            id: `e-${r.id}`,
            type: 'email',
            title: r.email || 'Email Registration',
            subtitle: 'Email Request Submitted',
            status: r.status,
            date: r.created_at,
          })),
          ...notificationItems
        ];

        if (clearedTime > 0) {
          activityItems = activityItems.filter(item => !item.date || new Date(item.date).getTime() > clearedTime);
        }

        activityItems = activityItems
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 5);

        const totalProducts = licenses.length;

        // Compute products status
        let productsStatus = 'inactive';
        if (licenses.length > 0) {
          if (hasExpiredProducts) {
            productsStatus = 'expired';
          } else {
            productsStatus = 'active';
          }
        }

        setData({
          chartData,
          totalOrders: allOrders.length,
          approvedOrders: approved.length,
          totalProducts,
          totalSpend,
          successRate: allOrders.length === 0 ? 0 : Math.round((approved.length / allOrders.length) * 100),
          growth,
          recentActivity: activityItems,
          invoiceSummary,
          serviceHealth: {
            hosting: hasActiveHosting ? 'active' : 'inactive',
            domain: hasActiveDomain ? 'active' : 'inactive',
            email: hasActiveEmail ? 'active' : 'inactive',
            products: productsStatus,
            renewalSoon: hasRenewalSoon,
          },
          renewalAlerts,
          latestAnnouncement: latestAnnouncementRes?.data || null,
          isLoading: false,
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
        setData(d => ({ ...d, isLoading: false }));
      }
    };

    loadData();
  }, [user]);

  if (data.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Loader2 style={{ width: 32, height: 32, color: brand }} className="animate-spin" />
      </div>
    );
  }

  const cardStyle = {
    background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${border}`,
    borderRadius: 20,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
  };

  const isAnnouncementBannerVisible = data.latestAnnouncement && 
    !announcementDismissed && 
    localStorage.getItem(`dismissed_announcement_${data.latestAnnouncement.id}`) !== 'true';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 64 }}>
      {/* Top Announcement Banner */}
      {isAnnouncementBannerVisible && (
        <div style={{
          background: isDark ? 'rgba(232,123,53,0.15)' : '#fff7ed',
          border: `1px solid ${isDark ? 'rgba(232,123,53,0.3)' : '#fed7aa'}`,
          borderRadius: 16,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Megaphone style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.latestAnnouncement.title}
              </p>
              <p style={{ color: subText, fontSize: 11, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.latestAnnouncement.message}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => onNavigate('announcements')}
              style={{
                background: brand,
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#d4692a'}
              onMouseLeave={e => e.currentTarget.style.background = brand}
            >
              View Update
            </button>
            <button
              onClick={() => {
                localStorage.setItem(`dismissed_announcement_${data.latestAnnouncement.id}`, 'true');
                setAnnouncementDismissed(true);
              }}
              style={{ background: 'none', border: 'none', color: subText, cursor: 'pointer', padding: 4 }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ color: text, fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          Welcome Back, {user?.name || 'Customer'} 👋
        </h1>
        <p style={{ color: subText, fontSize: 13, margin: 0 }}>
          Here is a detailed overview of your active services, billing summaries, and recent activity.
        </p>
      </div>

      {/* Row 1: 4 Stat Mini Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatMiniCard
          icon={ShoppingCart}
          iconBg={brandLight}
          iconColor={brand}
          label="Total Orders"
          value={data.totalOrders}
          description="View and track custom orders"
          quickActionText="View order history"
          onClick={() => onNavigate('order_history')}
          c={c}
          isDark={isDark}
        />
        <StatMiniCard
          icon={CheckCircle2}
          iconBg={isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7'}
          iconColor="#16a34a"
          label="Approved Orders"
          value={data.approvedOrders}
          valueColor="#16a34a"
          description="All active & completed services"
          quickActionText="Manage services"
          onClick={() => onNavigate('order_history')}
          c={c}
          isDark={isDark}
        />
        <StatMiniCard
          icon={Package}
          iconBg={isDark ? 'rgba(124,58,237,0.15)' : '#ede9fe'}
          iconColor="#7c3aed"
          label="Total Products"
          value={data.totalProducts}
          description="Licensed software & downloads"
          quickActionText="Manage licenses"
          onClick={() => onNavigate('products')}
          c={c}
          isDark={isDark}
        />
        <StatMiniCard
          icon={DollarSign}
          iconBg={isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe'}
          iconColor="#2563eb"
          label="Total Spend"
          value={data.totalSpend}
          description="Paid invoices to date"
          quickActionText="View invoices"
          onClick={() => onNavigate('invoices')}
          c={c}
          isDark={isDark}
        />
      </div>

      {/* Row 2: Orders Overview + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Orders Overview */}
        <div className="lg:col-span-3" style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart style={{ width: 16, height: 16, color: brand }} />
              <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Orders Overview</span>
            </div>
            <span style={{ background: panel2, color: subText, fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 99 }}>
              Last 6 Months
            </span>
          </div>

          <div style={{ width: '100%' }}>
            <LineChart data={data.chartData} c={c} isDark={isDark} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, paddingTop: 12, borderTop: `1px solid ${border}` }}>
            {[
              { label: 'Total Orders', value: data.totalOrders, valueColor: text },
              {
                label: 'vs prev period',
                value: `${data.growth >= 0 ? '+' : ''}${data.growth}%`,
                icon: data.growth >= 0
                  ? <TrendingUp style={{ width: 12, height: 12, color: '#16a34a' }} />
                  : <TrendingDown style={{ width: 12, height: 12, color: '#dc2626' }} />,
                valueColor: data.growth >= 0 ? '#16a34a' : '#dc2626',
              },
              { label: 'Approved', value: data.approvedOrders, valueColor: text },
              {
                label: 'Success Rate',
                value: `${data.successRate}%`,
                valueColor: data.successRate >= 50 ? '#16a34a' : '#ea580c',
              },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {s.icon}
                  <span style={{ color: s.valueColor, fontSize: 18, fontWeight: 800 }}>{s.value}</span>
                </div>
                <p style={{ color: subText, fontSize: 10, marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2" style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Bell style={{ width: 16, height: 16, color: brand }} />
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Recent Activity</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.recentActivity.length > 0 ? (
              data.recentActivity.map(item => {
                let dest = 'notifications';
                if (item.type === 'domain') dest = 'domains_my';
                else if (item.type === 'hosting') dest = 'hosting_my';
                else if (item.type === 'email') dest = 'emails_my';
                else if (item.type === 'login') dest = 'profile';
                else if (item.type === 'product') dest = 'products';
                else if (item.type === 'invoice') dest = 'invoices';
                else if (item.type === 'ticket') dest = 'support_tickets';
                else if (item.type === 'announcement') dest = 'announcements';
                else if (item.type === 'update') dest = 'dashboard';
                else if (item.type === 'notification' && (item.status === 'quotation' || String(item.title || '').toLowerCase().includes('quotation'))) {
                  dest = 'quotations';
                }
                const canNav = !!onNavigate;
                return (
                <div
                  key={item.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: canNav ? 'pointer' : 'default', transition: 'background 0.15s' }}
                  onClick={async () => {
                    if (canNav) {
                      if (item.id.startsWith('n-')) {
                        const notifId = item.id.replace('n-', '');
                        supabase.from('notifications').update({ read_status: true }).eq('id', notifId).then(({ error }) => {
                          if (error) console.error('Failed to mark notification as read:', error);
                        });
                      }
                      onNavigate(dest);
                    }
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = hover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ActivityIcon type={item.type} isDark={isDark} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: text, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                    <p style={{ color: subText, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ color: subText, fontSize: 10 }}>
                      {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <StatusBadge status={item.status} isDark={isDark} />
                  </div>
                </div>
                );
              })
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 128 }}>
                <Bell style={{ width: 28, height: 28, color: subText, opacity: 0.2, marginBottom: 8 }} />
                <p style={{ color: subText, fontSize: 12 }}>No recent activity</p>
              </div>
            )}
          </div>

          {data.recentActivity.length > 0 && (
            <p style={{ color: subText, fontSize: 10, textAlign: 'center', marginTop: 12, paddingTop: 8, borderTop: `1px solid ${border}` }}>
              Showing latest {data.recentActivity.length} activities
            </p>
          )}
        </div>
      </div>

      {/* Row 3: Service Health Status, Renewal Alerts & Invoice Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Service Health & Renewal Alerts (3 cols) */}
        <div className="lg:col-span-3" style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server style={{ width: 16, height: 16, color: brand }} />
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Service Health & Expiry Alerts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: panel2, padding: 14, borderRadius: 14, border: `1px solid ${border}` }}>
              <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>Service Status Check</p>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: text, fontSize: 12, fontWeight: 500 }}>Web Hosting</span>
                <span style={{
                  color: data.serviceHealth.hosting === 'active' ? '#16a34a' : subText,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {data.serviceHealth.hosting === 'active' ? '✓ Hosting Active' : '✗ Inactive'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: text, fontSize: 12, fontWeight: 500 }}>Active Domains</span>
                <span style={{
                  color: data.serviceHealth.domain === 'active' ? '#16a34a' : subText,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {data.serviceHealth.domain === 'active' ? '✓ Domain Active' : '✗ Inactive'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: text, fontSize: 12, fontWeight: 500 }}>Custom Emails</span>
                <span style={{
                  color: data.serviceHealth.email === 'active' ? '#16a34a' : subText,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {data.serviceHealth.email === 'active' ? '✓ Email Active' : '✗ Inactive'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: text, fontSize: 12, fontWeight: 500 }}>Licensed Products</span>
                <span style={{
                  color: data.serviceHealth.products === 'active' ? '#16a34a' : (data.serviceHealth.products === 'expired' ? '#dc2626' : subText),
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {data.serviceHealth.products === 'active' ? '✓ Products Active' : (data.serviceHealth.products === 'expired' ? '⚠ Expired Products' : '✗ Inactive')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${border}`, paddingTop: 8, marginTop: 4 }}>
                <span style={{ color: text, fontSize: 12, fontWeight: 500 }}>Renewal State</span>
                <span style={{
                  color: data.serviceHealth.renewalSoon ? '#f59e0b' : '#16a34a',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {data.serviceHealth.renewalSoon ? '⚠ Renewal Due Soon' : '✓ All Up-to-Date'}
                </span>
              </div>
            </div>

            {/* Renewal Reminders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: panel2, padding: 14, borderRadius: 14, border: `1px solid ${border}` }}>
              <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>Renewal Alerts</p>
              
              <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 110 }}>
                {data.renewalAlerts.length > 0 ? (
                  data.renewalAlerts.map((alert, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'start',
                      gap: 8,
                      background: isDark ? 'rgba(245,158,11,0.06)' : '#fffbeb',
                      border: `1px solid ${isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7'}`,
                      borderRadius: 8,
                      padding: '6px 10px',
                    }}>
                      <AlertCircle style={{ width: 14, height: 14, color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ color: text, fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}>
                        {alert.message}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 80 }}>
                    <CheckCircle2 style={{ width: 22, height: 22, color: '#16a34a', opacity: 0.6, marginBottom: 6 }} />
                    <span style={{ color: subText, fontSize: 11, textAlign: 'center' }}>All services are running smoothly.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Summary Widget (2 cols) */}
        <div
          onClick={() => onNavigate('invoices')}
          className="lg:col-span-2 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer"
          style={{
            ...cardStyle,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxSizing: 'border-box'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = brand; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = border; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard style={{ width: 16, height: 16, color: brand }} />
              <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Invoice Summary</span>
            </div>
            <span style={{ color: brand, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
              Manage Invoices <ChevronRight style={{ width: 12, height: 12 }} />
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Paid Summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: panel2, padding: '8px 12px', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a' }} />
                <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>Paid Invoices</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: text, fontSize: 12, fontWeight: 700 }}>{data.invoiceSummary.paid.count} Paid</span>
                <p style={{ color: subText, fontSize: 10, margin: 0 }}>
                  LKR {data.invoiceSummary.paid.LKR.toLocaleString()} / USD {data.invoiceSummary.paid.USD.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Pending Summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: panel2, padding: '8px 12px', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>Pending Invoices</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: text, fontSize: 12, fontWeight: 700 }}>{data.invoiceSummary.pending.count} Pending</span>
                <p style={{ color: subText, fontSize: 10, margin: 0 }}>
                  LKR {data.invoiceSummary.pending.LKR.toLocaleString()} / USD {data.invoiceSummary.pending.USD.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Overdue Summary */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: data.invoiceSummary.overdue.count > 0 ? (isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2') : panel2,
              border: data.invoiceSummary.overdue.count > 0 ? `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : '#fecaca'}` : 'none',
              padding: '8px 12px',
              borderRadius: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>Overdue Invoices</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: data.invoiceSummary.overdue.count > 0 ? '#ef4444' : text, fontSize: 12, fontWeight: 700 }}>
                  {data.invoiceSummary.overdue.count} Overdue
                </span>
                <p style={{ color: subText, fontSize: 10, margin: 0 }}>
                  LKR {data.invoiceSummary.overdue.LKR.toLocaleString()} / USD {data.invoiceSummary.overdue.USD.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: News + Need Help */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 h-full">
          <NewsAnnouncementsCard isDark={isDark} c={c} customerId={user?.id} />
        </div>
        <div className="lg:col-span-2 h-full">
          {/* Need Help Card */}
          <div style={{
            ...cardStyle,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            height: '100%',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ color: text, fontSize: 16, fontWeight: 700, margin: 0 }}>Need Help?</h3>
            <p style={{ color: subText, fontSize: 12, margin: '-6px 0 0 0' }}>Our support team is here to help</p>

            <button
              onClick={() => onNavigate('support_create')}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 10,
                background: brand,
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#d4692a'}
              onMouseLeave={e => e.currentTarget.style.background = brand}
            >
              Create Support Ticket
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '2px 0' }}>
              <div style={{ height: 1, flex: 1, background: border }} />
              <span style={{ color: subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>or</span>
              <div style={{ height: 1, flex: 1, background: border }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full" style={{ marginTop: 'auto' }}>
              {/* Call Us Card */}
              <a
                href="tel:+94702032323"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: panel2,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = brand}
                onMouseLeave={e => e.currentTarget.style.borderColor = border}
              >
                <Phone style={{ width: 16, height: 16, color: brand, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ color: text, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Call Us</span>
                  <span style={{ color: subText, fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>+94 70 203 2323</span>
                </div>
              </a>

              {/* Knowledge Base Card */}
              <a
                href="https://nextiom.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: panel2,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = brand}
                onMouseLeave={e => e.currentTarget.style.borderColor = border}
              >
                <BookOpen style={{ width: 16, height: 16, color: '#3b82f6', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ color: text, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Knowledge Base</span>
                  <span style={{ color: brand, fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>Explore Docs</span>
                </div>
              </a>

              {/* WhatsApp Card */}
              <a
                href="https://wa.me/message/GSCYIITXTDGXO1"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: panel2,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = brand}
                onMouseLeave={e => e.currentTarget.style.borderColor = border}
              >
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: '#22c55e', flexShrink: 0 }}>
                  <path d="M12.031 2c-5.51 0-9.99 4.48-9.99 9.99 0 2.062.626 3.979 1.698 5.568l-1.116 4.093 4.205-1.103c1.517.927 3.308 1.465 5.203 1.465 5.51 0 9.99-4.48 9.99-9.99S17.541 2 12.031 2zm0 1.662c4.595 0 8.328 3.733 8.328 8.328S16.626 20.318 12.031 20.318c-1.83 0-3.528-.592-4.912-1.597l-.353-.255-2.434.638.653-2.395-.286-.399c-1.144-1.593-1.821-3.535-1.821-5.637.001-4.595 3.734-8.328 8.329-8.328zm-3.328 3.864c-.144 0-.361.054-.541.252-.18.198-.685.67-.685 1.632 0 .963.702 1.892.8 2.025.099.135 1.352 2.158 3.298 2.977.463.195.825.312 1.107.402.465.147.888.126 1.222.076.372-.056 1.145-.468 1.306-.921.161-.453.161-.842.113-.923-.048-.081-.18-.129-.379-.228-.198-.099-1.145-.565-1.321-.629-.177-.064-.306-.096-.437.099-.13.195-.504.629-.617.755-.113.127-.225.142-.424.043-.198-.099-.838-.309-1.597-.986-.591-.527-.989-1.18-.105-1.328.099-.165.198-.243.297-.342.099-.099.13-.165.198-.297.066-.132.033-.249-.016-.348-.049-.099-.437-1.053-.598-1.442-.157-.38-.33-.328-.453-.334l-.387-.008z" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ color: text, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>WhatsApp</span>
                  <span style={{ color: subText, fontSize: 9, whiteSpace: 'nowrap' }}>Chat Now</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: About Company + Contact + Quick Links + Rate Us */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* About Our Company Card */}
        <div style={{
          ...cardStyle,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building style={{ width: 15, height: 15, color: brand }} />
            </div>
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>About Our Company</span>
          </div>
          <p style={{ color: subText, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            Nextiom is a trusted provider of domain registration, web hosting, email solutions, and digital services.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '6px 0' }}>
            {[
              'Reliable Infrastructure',
              '24/7 Customer Support',
              'Secure & Scalable Solutions'
            ].map((point, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: brand, flexShrink: 0 }} />
                <span style={{ color: text, fontSize: 11, fontWeight: 500 }}>{point}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate('about_company')}
            style={{
              marginTop: 'auto',
              padding: '8px 18px',
              borderRadius: 10,
              background: 'transparent',
              color: brand,
              border: `1px solid ${brand}`,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s',
              textAlign: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.background = brandLight}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Learn More About Us
          </button>
        </div>

        {/* Contact Information Card */}
        <div style={{
          ...cardStyle,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone style={{ width: 15, height: 15, color: brand }} />
            </div>
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Contact Information</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '4px 0' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Phone style={{ width: 14, height: 14, color: brand, marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: 0 }}>+94 70 203 2323</p>
                <p style={{ color: subText, fontSize: 10, margin: 0 }}>Mon – Fri (9:00 AM – 6:00 PM)</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Mail style={{ width: 14, height: 14, color: brand, marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: 0 }}>info@nextiom.com</p>
                <p style={{ color: subText, fontSize: 10, margin: 0 }}>We reply within 24 hours</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <MapPin style={{ width: 14, height: 14, color: brand, marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: 0 }}>Niwandama, Ja Ela – 11350</p>
                <p style={{ color: subText, fontSize: 10, margin: 0 }}>Sri Lanka</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Globe style={{ width: 14, height: 14, color: brand, marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: 0 }}><a href="https://nextiom.com" target="_blank" rel="noopener noreferrer" style={{ color: text, textDecoration: 'underline' }}>https://nextiom.com</a></p>
                <p style={{ color: subText, fontSize: 10, margin: 0 }}>Official website</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('about_contact')}
              style={{
                marginTop: 'auto',
                padding: '8px 18px',
                borderRadius: 10,
                background: 'transparent',
                color: brand,
                border: `1px solid ${brand}`,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s',
                textAlign: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = brandLight}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              View All Contact Options
            </button>
          </div>
        </div>

        {/* Quick Links Card */}
        <div style={{
          ...cardStyle,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Globe style={{ width: 15, height: 15, color: brand }} />
            </div>
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Quick Links</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {[
              { label: 'My Hosting', dest: 'hosting_my' },
              { label: 'My Domains', dest: 'domains_my' },
              { label: 'My Emails', dest: 'emails_my' },
              { label: 'My Invoices', dest: 'invoices' }
            ].map((link, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate(link.dest)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = hover}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{link.label}</span>
                <ChevronRight style={{ width: 14, height: 14, color: subText }} />
              </div>
            ))}
          </div>
        </div>

        <RateUsCard user={user} isDark={isDark} c={c} />
      </div>
    </div>
  );
}

export default DashboardPage;
