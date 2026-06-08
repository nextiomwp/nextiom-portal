import React, { useState, useEffect } from 'react';
import { Loader2, Globe, Server, Bell, TrendingUp, TrendingDown, ShoppingCart, CheckCircle2, DollarSign, Calendar, Phone, Mail, MapPin, Building, ChevronRight, Info, ExternalLink } from 'lucide-react';
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
    notification: { Icon: Bell, color: '#E87B35', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
  };
  const { Icon, color, bg } = map[type] || map.notification;
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon style={{ width: 16, height: 16, color }} />
    </div>
  );
}

function StatMiniCard({ icon: Icon, iconBg, iconColor, label, value, valueColor, c, isDark }) {
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  return (
    <div style={{
      background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
      border: `1px solid ${border}`,
      borderRadius: 16,
      padding: '16px 20px',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <p style={{ color: subText, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
        <p style={{ color: valueColor || text, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</p>
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 18, height: 18, color: iconColor }} />
      </div>
    </div>
  );
}

function DashboardPage({ user, isDark = false, c = {}, onNavigate }) {
  const [data, setData] = useState({
    chartData: [],
    totalOrders: 0,
    approvedOrders: 0,
    totalSpend: 'LKR 0.00 / USD 0.00',
    successRate: 0,
    growth: 0,
    recentActivity: [],
    isLoading: true,
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  const brand = c.brand || '#E87B35';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';

  const memberSince = user?.memberSince
    ? new Date(user.memberSince).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

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
        const [domainRes, hostingRes, emailRes, notifRes, invoiceRes] = await Promise.all([
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
            .limit(5),
          supabase.from('invoices')
            .select('total, currency')
            .eq('status', 'paid')
            .eq('client_email', user.email),
        ]);

        const domains = domainRes.data || [];
        const hostings = hostingRes.data || [];
        const emails = emailRes.data || [];
        const allOrders = [...domains, ...hostings, ...emails];

        const approved = allOrders.filter(o =>
          ['approved', 'completed', 'active'].includes(String(o.status || '').toLowerCase())
        );

        const invoices = invoiceRes.data || [];
        const totals = invoices.reduce((acc, inv) => {
          const cur = inv.currency === 'USD' ? 'USD' : 'LKR';
          acc[cur] += parseFloat(inv.total) || 0;
          return acc;
        }, { LKR: 0, USD: 0 });

        const formatCurrency = (amount, currency) => {
          if (currency === 'USD') {
            return 'USD ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          return 'LKR ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const totalSpend = ['LKR', 'USD']
          .map(cur => formatCurrency(totals[cur], cur))
          .join(' / ') || formatCurrency(0, 'LKR');

        const months = getLast6Months();
        const chartData = months.map(m => ({
          ...m,
          count: allOrders.filter(o => getMonthKey(o.created_at) === m.key).length,
        }));

        const recent3 = chartData.slice(3).reduce((s, d) => s + d.count, 0);
        const older3 = chartData.slice(0, 3).reduce((s, d) => s + d.count, 0);
        const growth = older3 === 0 ? (recent3 > 0 ? 100 : 0) : Math.round(((recent3 - older3) / older3) * 100);

        const activityItems = [
          ...domains.slice(0, 4).map(r => ({
            id: `d-${r.id}`,
            type: 'domain',
            title: r.domain_name || 'Domain Registration',
            subtitle: 'Domain Request',
            status: r.status,
            date: r.created_at,
          })),
          ...hostings.slice(0, 4).map(r => ({
            id: `h-${r.id}`,
            type: 'hosting',
            title: r.package_type?.split('|')[0]?.trim() || 'Hosting Request',
            subtitle: 'Hosting Package',
            status: r.status,
            date: r.created_at,
          })),
          ...emails.slice(0, 4).map(r => ({
            id: `e-${r.id}`,
            type: 'email',
            title: r.email || 'Email Registration',
            subtitle: 'Email Request',
            status: r.status,
            date: r.created_at,
          })),
          ...(notifRes.data || []).slice(0, 3).map(n => ({
            id: `n-${n.id}`,
            type: 'notification',
            title: n.title,
            subtitle: n.message?.substring(0, 48) + (n.message?.length > 48 ? '…' : ''),
            status: n.type || 'info',
            date: n.created_at,
          })),
        ]
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 6);

        setData({
          chartData,
          totalOrders: allOrders.length,
          approvedOrders: approved.length,
          totalSpend,
          successRate: allOrders.length === 0 ? 0 : Math.round((approved.length / allOrders.length) * 100),
          growth,
          recentActivity: activityItems,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 64 }}>
      {/* Row 1: 4 Stat Mini Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatMiniCard
          icon={ShoppingCart}
          iconBg={brandLight}
          iconColor={brand}
          label="Total Orders"
          value={data.totalOrders}
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
          c={c}
          isDark={isDark}
        />
        <StatMiniCard
          icon={DollarSign}
          iconBg={isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe'}
          iconColor="#2563eb"
          label="Total Spend"
          value={data.totalSpend}
          c={c}
          isDark={isDark}
        />
        <StatMiniCard
          icon={Calendar}
          iconBg={isDark ? 'rgba(124,58,237,0.15)' : '#ede9fe'}
          iconColor="#7c3aed"
          label="Member Since"
          value={memberSince}
          c={c}
          isDark={isDark}
        />
      </div>

      {/* Row 3: Orders Overview + Recent Activity */}
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
                const dest = item.type === 'domain' ? 'domains_my' : item.type === 'hosting' ? 'hosting_my' : item.type === 'email' ? 'emails_my' : 'notifications';
                const canNav = !!onNavigate;
                return (
                <div
                  key={item.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: canNav ? 'pointer' : 'default', transition: 'background 0.15s' }}
                  onClick={() => canNav && onNavigate(dest)}
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

      {/* Row 3: News + Rate Us + Need Help */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-2">
          <NewsAnnouncementsCard isDark={isDark} c={c} customerId={user?.id} />
        </div>
        <div className="lg:col-span-1">
          <RateUsCard user={user} isDark={isDark} c={c} />
        </div>
        <div className="lg:col-span-1">
          {/* Need Help Card */}
          <div style={{
            ...cardStyle,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            height: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Info style={{ width: 15, height: 15, color: brand }} />
              </div>
              <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Need Help?</span>
            </div>
            <p style={{ color: subText, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
              Our support team is here to help
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => onNavigate('support_create')}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 10,
                  background: brand,
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#d4692a'}
                onMouseLeave={e => e.currentTarget.style.background = brand}
              >
                Create Support Ticket
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ height: 1, flex: 1, background: border }} />
                <span style={{ color: subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>or</span>
                <div style={{ height: 1, flex: 1, background: border }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Call Us Now</p>
                <p style={{ color: brand, fontSize: 16, fontWeight: 800 }}>+94 70 203 2323</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: About Company + Contact + Visit Website + Quick Links */}
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

        {/* Visit Our Website Card */}
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
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Visit Our Website</span>
          </div>
          <p style={{ color: subText, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            Discover more about our services, company, and latest offers on our official website.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '6px 0' }}>
            {[
              'Latest Offers & Promotions',
              'Service Details & Pricing',
              'Knowledge Base & Guides'
            ].map((point, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: brand, flexShrink: 0 }} />
                <span style={{ color: text, fontSize: 11, fontWeight: 500 }}>{point}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.open('https://nextiom.com', '_blank')}
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = brandLight}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>Visit Website</span>
            <ExternalLink style={{ width: 12, height: 12 }} />
          </button>
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
      </div>
    </div>
  );
}

export default DashboardPage;
