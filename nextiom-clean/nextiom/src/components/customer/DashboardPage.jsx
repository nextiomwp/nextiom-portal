import React, { useState, useEffect } from 'react';
import { Loader2, Globe, Server, Bell, TrendingUp, TrendingDown, ShoppingCart, CheckCircle2, DollarSign, Phone, Mail, MapPin, Building, ChevronRight, Info, ExternalLink, Package, Shield, Key, CreditCard, MessageSquare, Clock, Settings, Megaphone, AlertCircle, X, BookOpen, Briefcase, ShieldCheck, Zap, BarChart3, ArrowUpRight, Layers, Activity, Ticket } from 'lucide-react';
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
  const W = 480, H = 130;
  const pad = { t: 16, r: 16, b: 36, l: 36 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const maxV = Math.max(...data.map(d => d.count), 2);
  const yTicks = [0, Math.ceil(maxV / 2), maxV];
  const brand = c.brand || 'var(--brand-color)';
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
          <stop offset="0%" stopColor={brand} stopOpacity="0.35" />
          <stop offset="100%" stopColor={brand} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => {
        const y = pad.t + cH - (tick / maxV) * cH;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y}
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="1" strokeDasharray="4,4" />
            <text x={pad.l - 8} y={y + 3.5} textAnchor="end" fontSize="9" fill={subText}>{tick}</text>
          </g>
        );
      })}
      {areaPath && <path d={areaPath} fill="url(#dg-orders)" />}
      {linePath && <path d={linePath} fill="none" stroke={brand} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5"
          fill={brand} stroke={isDark ? '#1C1E24' : '#fff'} strokeWidth="2.5" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pts[i]?.x} y={H - 4} textAnchor="middle" fontSize="9" fill={subText}>{d.label}</text>
      ))}
    </svg>
  );
}

function ActivityIcon({ type, isDark }) {
  const map = {
    domain: { Icon: Globe, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    hosting: { Icon: Server, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    email: { Icon: Mail, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    login: { Icon: Shield, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    product: { Icon: Package, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    invoice: { Icon: CreditCard, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    ticket: { Icon: MessageSquare, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    expiration: { Icon: Clock, color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7' },
    update: { Icon: Settings, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' },
    announcement: { Icon: Megaphone, color: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2' },
  };
  const item = map[type] || { Icon: Bell, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.2)' : '#fff7ed' };
  const Icon = item.Icon;
  return (
    <div style={{ width: 38, height: 38, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon style={{ width: 16, height: 16, color: item.color }} />
    </div>
  );
}

/* ─────────────── REDESIGNED STAT CARD ─────────────── */
function StatMiniCard({ icon: Icon, iconBg, iconColor, label, value, valueColor, description, quickActionText, onClick, c, isDark }) {
  const [hovered, setHovered] = useState(false);
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || 'var(--brand-color)';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: isDark ? 'rgba(28,30,36,0.9)' : '#fff',
        border: `1px solid ${hovered ? brand : border}`,
        borderRadius: 18,
        padding: '20px 20px 16px',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: hovered
          ? (isDark ? `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${brand}22` : `0 8px 32px var(--brand-color-light)`)
          : (isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)'),
        cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        height: '100%',
      }}
    >


      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${iconColor}30`,
        }}>
          <Icon style={{ width: 20, height: 20, color: iconColor }} />
        </div>
        <ArrowUpRight style={{ width: 14, height: 14, color: subText, opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }} />
      </div>

      <p style={{ color: subText, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{label}</p>
      <p style={{ color: valueColor || text, fontSize: 20, fontWeight: 800, lineHeight: 1.2, margin: '0 0 6px 0', wordBreak: 'break-all' }}>{value}</p>

      {description && (
        <p style={{ color: subText, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{description}</p>
      )}

      {quickActionText && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: brand, fontSize: 11, fontWeight: 700,
          marginTop: 12, paddingTop: 10,
          borderTop: `1px solid ${border}`,
        }}>
          <span>{quickActionText}</span>
          <ChevronRight style={{ width: 11, height: 11 }} />
        </div>
      )}
    </div>
  );
}

/* ─────────────── PROJECT PROGRESS WIDGET ─────────────── */
/* ─────────────── PROJECT PROGRESS WIDGET ─────────────── */
function ProjectProgressWidget({ jobs, onNavigate, c, isDark }) {
  const [hovered, setHovered] = useState(false);
  const brand = c.brand || 'var(--brand-color)';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';

  const cardStyle = {
    background: isDark ? 'rgba(28,30,36,0.9)' : '#fff',
    border: `1px solid ${hovered ? brand : border}`,
    borderRadius: 20,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: hovered
      ? (isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(232,123,53,0.08)')
      : (isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)'),
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    boxSizing: 'border-box',
    height: '100%',
    cursor: 'pointer',
    transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    overflow: 'hidden',
    position: 'relative',
  };

  const activeJobs = (jobs || []).filter(j => j.status === 'Active');

  if (activeJobs.length === 0) {
    return (
      <div style={cardStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => onNavigate('jobs')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: isDark ? 'var(--brand-color-light)' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase style={{ width: 16, height: 16, color: brand }} />
            </div>
            <span style={{ color: text, fontWeight: 700, fontSize: 15 }}>Project Progress</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 140 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase style={{ width: 24, height: 24, color: subText, opacity: 0.4 }} />
          </div>
          <p style={{ color: subText, fontSize: 13, margin: 0, textAlign: 'center' }}>No active projects at the moment.</p>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate('support_create'); }}
            style={{
              background: brand,
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: 4,
              boxShadow: `0 4px 14px ${brand}40`,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${brand}50`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 14px ${brand}40`; }}
          >
            Start a Project
          </button>
        </div>
      </div>
    );
  }

  // Helper function to render a single job's progress bar
  const renderJobProgress = (job) => {
    const defaultProgressSteps = [
      'Request Submitted', 'Under Review', 'Waiting for Customer', 'Job Created',
      'Design Phase', 'Development', 'Testing', 'Client Review', 'Completed'
    ];
    const steps = Array.isArray(job.timeline_steps) ? job.timeline_steps : defaultProgressSteps;
    const progressStep = job.progress_step ?? 0;

    let pct = 0;
    if (job.status === 'Completed') {
      pct = 100;
    } else if (job.status === 'On Hold') {
      pct = 30;
    } else {
      pct = job.progress_percent !== undefined && job.progress_percent !== null
        ? job.progress_percent
        : Math.round((progressStep / Math.max(1, steps.length - 1)) * 100);
    }

    const currentStage = steps[progressStep] || 'In Progress';

    let estDateStr = 'In Review';
    if (job.estimated_completion_date) {
      const d = new Date(job.estimated_completion_date);
      estDateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    const filledCount = Math.round(pct / 10);
    const emptyCount = 10 - filledCount;
    const blockProgressBar = '■'.repeat(filledCount) + '□'.repeat(emptyCount);

    return { pct, currentStage, estDateStr, blockProgressBar };
  };

  return (
    <div
      onClick={() => onNavigate('jobs')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={cardStyle}
    >


      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: isDark ? 'var(--brand-color-light)' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase style={{ width: 16, height: 16, color: brand }} />
          </div>
          <span style={{ color: text, fontWeight: 700, fontSize: 15 }}>Project Progress</span>
        </div>
        <span style={{ color: brand, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
          View Queue <ChevronRight style={{ width: 12, height: 12 }} />
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center', maxHeight: '200px', overflowY: 'auto' }} className="no-scrollbar">
        {activeJobs.map((job, idx) => {
          const { pct, currentStage, estDateStr } = renderJobProgress(job);
          return (
            <div key={job.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderBottom: idx < activeJobs.length - 1 ? `1px solid ${border}` : 'none', paddingBottom: idx < activeJobs.length - 1 ? 14 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ color: text, fontSize: 14, fontWeight: 700, margin: '0 0 2px 0' }}>{job.title}</h4>
                  <p style={{ color: subText, fontSize: 10, margin: 0 }}>Category: {job.category || 'Project'}</p>
                </div>
                <span style={{ color: text, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ width: '100%', height: 6, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${brand}, #f59e0b)`,
                    borderRadius: 99,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: `0 0 6px ${brand}40`,
                  }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: panel2, padding: '6px 10px', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                  <span style={{ color: subText, fontSize: 9, display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, marginBottom: 2 }}>Current Stage</span>
                  <span style={{ color: text, fontSize: 11, fontWeight: 700 }}>{currentStage}</span>
                </div>
                <div style={{ background: panel2, padding: '6px 10px', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                  <span style={{ color: subText, fontSize: 9, display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, marginBottom: 2 }}>Est. Completion</span>
                  <span style={{ color: text, fontSize: 11, fontWeight: 700 }}>{estDateStr}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── ACCOUNT STATUS WIDGET ─────────────── */
function AccountStatusWidget({ user, data, c, isDark, onNavigate }) {
  const [isHovered, setIsHovered] = useState(false);

  const brand = c.brand || 'var(--brand-color)';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const brandLight = c.brandLight || 'var(--brand-color-light)';

  const profileFields = ['name', 'phone', 'company', 'country'];
  let filledFields = 0;
  const missingFields = [];
  const fieldLabels = { name: 'Full Name', phone: 'Phone Number', company: 'Company Name', country: 'Country' };

  profileFields.forEach(field => {
    if (user[field] && String(user[field]).trim() !== '') {
      filledFields++;
    } else {
      missingFields.push(fieldLabels[field] || field);
    }
  });
  const profileCompletePct = Math.round((filledFields / profileFields.length) * 100);

  const invoices = data.invoices || [];
  const totalInvoicesCount = invoices.length;
  const paidInvoicesCount = invoices.filter(inv => inv.status === 'paid' || inv.status === 'partially_refunded').length;
  const invoicesPaidPct = totalInvoicesCount > 0 ? Math.round((paidInvoicesCount / totalInvoicesCount) * 100) : 100;

  const hostingList = data.hostingPackages || [];
  const domainList = data.domains || [];
  const emailList = data.emails || [];
  const totalServices = hostingList.length + domainList.length + emailList.length;
  const activeHosting = hostingList.filter(h => ['active', 'approved', 'completed'].includes(String(h.status || '').toLowerCase())).length;
  const activeDomains = domainList.filter(d => ['active', 'registered', 'approved'].includes(String(d.status || '').toLowerCase())).length;
  const activeEmails = emailList.filter(e => ['active', 'registered', 'completed', 'approved'].includes(String(e.status || '').toLowerCase())).length;
  const activeServices = activeHosting + activeDomains + activeEmails;
  const servicesActivePct = totalServices > 0 ? Math.round((activeServices / totalServices) * 100) : 100;

  const overdueCount = data.invoiceSummary?.overdue?.count || 0;
  let overallStatus = 'Healthy Account';
  let overallColor = '#16a34a';
  let overallBg = isDark ? 'rgba(22,163,74,0.12)' : '#f0fdf4';
  let overallDot = '#16a34a';

  if (overdueCount > 0) {
    overallStatus = 'Attention Required';
    overallColor = '#ef4444';
    overallBg = isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2';
    overallDot = '#ef4444';
  } else if (profileCompletePct < 50 || servicesActivePct === 0) {
    overallStatus = 'Setup Incomplete';
    overallColor = '#f97316';
    overallBg = isDark ? 'rgba(249,115,22,0.12)' : '#fff7ed';
    overallDot = '#f97316';
  }

  const avgPct = Math.round((profileCompletePct + invoicesPaidPct + servicesActivePct) / 3);

  const radius = 32;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (avgPct / 100) * circumference;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onNavigate && onNavigate('profile')}
      style={{
        background: isDark ? 'rgba(28,30,36,0.9)' : '#fff',
        border: `1px solid ${isHovered ? brand : border}`,
        borderRadius: 20,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: isHovered
          ? (isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(232,123,53,0.08)')
          : (isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)'),
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        boxSizing: 'border-box',
        height: '100%',
        position: 'relative',
        cursor: onNavigate ? 'pointer' : 'default',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >


      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck style={{ width: 16, height: 16, color: brand }} />
        </div>
        <span style={{ color: text, fontWeight: 700, fontSize: 15 }}>Account Status</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Radial progress ring */}
          <div style={{ position: 'relative', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="transparent"
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                strokeWidth={strokeWidth}
              />
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="transparent"
                stroke={overallColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 0.8s ease-in-out',
                  filter: `drop-shadow(0 0 6px ${overallColor}30)`
                }}
              />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: text, fontSize: 16, fontWeight: 800 }}>{avgPct}%</span>
              <span style={{ color: subText, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</span>
            </div>
          </div>

          {/* Details list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
            {[
              { label: 'Profile Setup', pct: profileCompletePct, color: brand, bg: isDark ? 'var(--brand-color-light)' : '#fff7ed' },
              { label: 'Invoices Paid', pct: invoicesPaidPct, color: brand, bg: isDark ? 'var(--brand-color-light)' : '#fff7ed' },
              { label: 'Services Active', pct: servicesActivePct, color: brand, bg: isDark ? 'var(--brand-color-light)' : '#fff7ed' }
            ].map(({ label, pct, color, bg }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 10, background: bg,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}`,
                position: label === 'Profile Setup' ? 'relative' : undefined
              }}>
                <span style={{ color: text, fontSize: 11, fontWeight: 600 }}>{label}</span>
                <span style={{ color, fontSize: 11, fontWeight: 800 }}>{pct}%</span>

                {label === 'Profile Setup' && profileCompletePct < 100 && isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '115%',
                      right: 0,
                      background: isDark ? 'rgba(22,24,30,0.98)' : 'rgba(255,255,255,0.98)',
                      border: `1.5px solid ${brand}`,
                      borderRadius: 12,
                      padding: '10px 14px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                      zIndex: 50,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      width: '200px'
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: brand }}>Missing Details:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {missingFields.map(f => (
                        <span key={f} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: isDark ? 'rgba(232,123,53,0.12)' : 'rgba(232,123,53,0.07)', color: brand, fontWeight: 600, border: `1px solid rgba(232,123,53,0.2)` }}>
                          {f}
                        </span>
                      ))}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 9, color: subText }}>Click card to edit profile.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: overallBg,
          padding: '10px 14px', borderRadius: 12, marginTop: 4,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: overallDot, display: 'inline-block', boxShadow: `0 0 6px ${overallDot}` }} />
            <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Overall Status</span>
          </div>
          <span style={{ color: overallColor, fontSize: 12, fontWeight: 800 }}>{overallStatus}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── SERVICE SUB CARD (HELPER) ─────────────── */
function ServiceSubCard({ label, description, activeCount, expiredCount, icon: Icon, onClick, c, isDark }) {
  const [hovered, setHovered] = React.useState(false);
  const brand = c.brand || 'var(--brand-color)';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';

  // Determine icon background and color based on service status counts
  let iconBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8f8f7';
  let iconBorder = `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;
  let iconColor = isDark ? '#a0a0a0' : '#888';

  if (expiredCount > 0) {
    iconBg = isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2';
    iconBorder = `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`;
    iconColor = '#dc2626';
  } else if (activeCount > 0) {
    iconBg = isDark ? 'rgba(34,197,94,0.08)' : '#f0fdf4';
    iconBorder = `1px solid ${isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)'}`;
    iconColor = '#16a34a';
  }

  const showInactive = activeCount === 0 && expiredCount === 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isDark ? 'rgba(28,30,36,0.5)' : '#fff',
        border: `1px solid ${border}`,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? (isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 15px rgba(0,0,0,0.05)')
          : 'none',
        transition: 'all 0.2s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Top half content */}
      <div style={{ display: 'flex', gap: 14, padding: '20px 20px 16px 20px', alignItems: 'flex-start' }}>
        {/* Icon container */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: iconBg,
          border: iconBorder,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon style={{ width: 22, height: 22, color: iconColor }} />
        </div>

        {/* Text info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ color: text, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>
            {label}
          </h4>

          {/* Status indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {showInactive ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />
                <span style={{ color: subText, fontSize: 11, fontWeight: 600 }}>Inactive (0)</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
                  <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>Active ({activeCount})</span>
                </div>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', fontSize: 11 }}>|</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626' }} />
                  <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }}>Expired ({expiredCount})</span>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          <p style={{ color: subText, fontSize: 11, margin: 0, lineHeight: 1.4 }}>
            {description}
          </p>
        </div>
      </div>

      {/* Bottom details bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderTop: `1px solid ${border}`,
        background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4, border: `1px solid ${brand}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity style={{ width: 10, height: 10, color: brand }} />
          </div>
          <span style={{ color: brand, fontSize: 11, fontWeight: 700 }}>View Details</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s' }}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </div>
  );
}

/* ─────────────── SERVICE HEALTH CARD ─────────────── */
function ServiceHealthCard({ data, c, isDark, onNavigate }) {
  const [hovered, setHovered] = useState(false);
  const brand = c.brand || 'var(--brand-color)';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';

  const services = [
    { label: 'Web Hostings', key: 'hosting', Icon: Server, description: 'Hosting packages and websites', dest: 'hosting_my' },
    { label: 'Active Domains', key: 'domain', Icon: Globe, description: 'Domain registration and management', dest: 'domains_my' },
    { label: 'Custom Emails', key: 'email', Icon: Mail, description: 'Business email accounts and services', dest: 'emails_my' },
    { label: 'Products', key: 'products', Icon: Package, description: 'Licenses, addons and digital products', dest: 'products' },
  ];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isDark ? 'rgba(28,30,36,0.9)' : '#fff',
        border: `1px solid ${hovered ? brand : border}`,
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        boxSizing: 'border-box',
        height: '100%',
        boxShadow: hovered
          ? (isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(232,123,53,0.08)')
          : (isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)'),
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Header icon box */}
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8f8f7',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity style={{ width: 22, height: 22, color: brand }} />
          </div>
          <div>
            <span style={{ color: text, fontWeight: 700, fontSize: 16, display: 'block', marginBottom: 2 }}>Service Health</span>
            <span style={{ color: subText, fontSize: 12, display: 'block' }}>Real-time status of all our services and systems</span>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
          background: data.serviceHealth.renewalSoon ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)',
          color: data.serviceHealth.renewalSoon ? '#ef4444' : '#22c55e',
          border: `1px solid ${data.serviceHealth.renewalSoon ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          {data.serviceHealth.renewalSoon ? '⚠ Renewal Due' : '✓ All Systems Go'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginTop: 6, flex: 1 }}>
        {services.map(({ label, key, Icon, description, dest }) => {
          const activeCount = data.serviceHealth[key + 'Count'] || 0;
          const expiredCount = data.serviceHealth[key + 'ExpiredCount'] || 0;

          return (
            <ServiceSubCard
              key={key}
              label={label}
              description={description}
              activeCount={activeCount}
              expiredCount={expiredCount}
              icon={Icon}
              onClick={() => onNavigate && onNavigate(dest)}
              c={c}
              isDark={isDark}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── INVOICE SUMMARY CARD ─────────────── */
function InvoiceSummaryCard({ invoiceSummary, onNavigate, c, isDark }) {
  const [hovered, setHovered] = useState(false);
  const brand = c.brand || 'var(--brand-color)';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const brandLight = c.brandLight || 'var(--brand-color-light)';

  const rows = [
    { label: 'Paid', key: 'paid', color: '#16a34a', bg: isDark ? 'rgba(22,163,74,0.1)' : '#f0fdf4', dot: '#16a34a' },
    { label: 'Pending', key: 'pending', color: '#2563eb', bg: isDark ? 'rgba(37,99,235,0.1)' : '#eff6ff', dot: '#3b82f6' },
    { label: 'Overdue', key: 'overdue', color: '#dc2626', bg: isDark ? 'rgba(220,38,38,0.1)' : '#fef2f2', dot: '#ef4444' },
  ];

  return (
    <div
      onClick={() => onNavigate('invoices')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isDark ? 'rgba(28,30,36,0.9)' : '#fff',
        border: `1px solid ${hovered ? brand : border}`,
        borderRadius: 20,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: hovered
          ? (isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(232,123,53,0.08)')
          : (isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)'),
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxSizing: 'border-box',
        height: '100%',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard style={{ width: 16, height: 16, color: brand }} />
          </div>
          <span style={{ color: text, fontWeight: 700, fontSize: 15 }}>Invoice Summary</span>
        </div>
        <span style={{ color: brand, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
          Manage <ChevronRight style={{ width: 12, height: 12 }} />
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
        {rows.map(({ label, key, color, bg, dot }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: invoiceSummary[key].count > 0 ? bg : panel2,
            padding: '10px 14px', borderRadius: 12,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
            transition: 'background 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: `0 0 5px ${dot}80` }} />
              <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{label} Invoices</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: invoiceSummary[key].count > 0 ? color : text, fontSize: 12, fontWeight: 800 }}>{invoiceSummary[key].count} {label}</span>
              <p style={{ color: subText, fontSize: 10, margin: 0 }}>
                LKR {invoiceSummary[key].LKR.toLocaleString()} / USD {invoiceSummary[key].USD.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── MAIN DASHBOARD ─────────────── */
function DashboardPage({ user, isDark = false, c = {}, onNavigate }) {
  const [ordersHovered, setOrdersHovered] = useState(false);
  const [activityHovered, setActivityHovered] = useState(false);
  const [healthHovered, setHealthHovered] = useState(false);
  const [helpHovered, setHelpHovered] = useState(false);
  const [aboutHovered, setAboutHovered] = useState(false);
  const [contactHovered, setContactHovered] = useState(false);
  const [quickHovered, setQuickHovered] = useState(false);

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
      products: 'unknown',
      renewalSoon: false,
      hostingCount: 0,
      hostingExpiredCount: 0,
      domainCount: 0,
      domainExpiredCount: 0,
      emailCount: 0,
      emailExpiredCount: 0,
      productsCount: 0,
      productsExpiredCount: 0,
    },
    renewalAlerts: [],
    latestAnnouncement: null,
    invoices: [],
    hostingPackages: [],
    domains: [],
    emails: [],
    jobs: [],
    isLoading: true,
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const brand = c.brand || 'var(--brand-color)';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';
  const brandLight = c.brandLight || 'var(--brand-color-light)';

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
          latestAnnouncementRes,
          jobsRes
        ] = await Promise.all([
          supabase.from('domain_requests').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
          supabase.from('hosting_requests').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
          supabase.from('email_requests').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
          supabase.from('notifications').select('id, title, message, type, created_at, read_status').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(15),
          supabase.from('invoices').select('total, currency, status, invoice_date, due_date').eq('client_email', user.email),
          supabase.from('customers').select('notifications_cleared_at').eq('id', customerId).maybeSingle(),
          supabase.from('licenses').select('*, products(id, name, type, license_type, category)').eq('customer_id', customerId),
          supabase.from('hosting_packages').select('*').eq('customer_id', customerId),
          supabase.from('domains').select('*').eq('customer_id', customerId),
          supabase.from('email_requests').select('*').eq('customer_id', customerId),
          supabase.from('notifications').select('id, title, message, created_at, start_date, end_date').eq('customer_id', customerId).eq('type', 'announcement').order('created_at', { ascending: false }).limit(5),
          supabase.from('jobs').select('*').eq('customer_id', customerId).order('created_date', { ascending: false })
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

        const invoices = invoiceRes.data || [];
        const todayStr = new Date().toISOString().split('T')[0];

        const processedInvoices = invoices.map(inv => {
          let status = inv.status;
          if (status !== 'paid' && status !== 'payment_submitted' && status !== 'refunded' && status !== 'partially_refunded' && status !== 'ongoing') {
            const due = inv.due_date ? inv.due_date.split('T')[0] : null;
            if (due && due < todayStr) { status = 'overdue'; }
          }
          return { ...inv, status };
        });

        const invoiceSummary = processedInvoices.reduce((acc, inv) => {
          const status = inv.status;
          const currency = inv.currency === 'USD' ? 'USD' : 'LKR';
          const total = parseFloat(inv.total) || 0;
          const refunded = parseFloat(inv.refunded_amount) || 0;
          let cat = 'pending';
          if (status === 'paid' || status === 'partially_refunded' || status === 'refunded') cat = 'paid';
          else if (status === 'overdue') cat = 'overdue';
          acc[cat].count += 1;
          if (cat === 'paid') {
            const paidAmt = status === 'paid' ? total : (parseFloat(inv.paid_amount) || total);
            const netPaid = Math.max(0, paidAmt - refunded);
            acc[cat][currency] += netPaid;
          } else {
            acc[cat][currency] += total;
          }
          return acc;
        }, { paid: { count: 0, LKR: 0, USD: 0 }, pending: { count: 0, LKR: 0, USD: 0 }, overdue: { count: 0, LKR: 0, USD: 0 } });

        const formatCurrency = (amount, currency) => {
          if (currency === 'USD') return 'USD ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return 'LKR ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const totalSpend = ['LKR', 'USD'].map(cur => formatCurrency(invoiceSummary.paid[cur], cur)).join(' / ') || formatCurrency(0, 'LKR');

        const months = getLast6Months();
        const chartData = months.map(m => ({
          ...m,
          count: allOrders.filter(o => getMonthKey(o.created_at) === m.key).length,
        }));

        const recent3 = chartData.slice(3).reduce((s, d) => s + d.count, 0);
        const older3 = chartData.slice(0, 3).reduce((s, d) => s + d.count, 0);
        const growth = older3 === 0 ? (recent3 > 0 ? 100 : 0) : Math.round(((recent3 - older3) / older3) * 100);

        const getDaysUntilExpiry = (expiryDate) => {
          if (!expiryDate) return null;
          const now = new Date(); now.setHours(0, 0, 0, 0);
          const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
          return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
        };

        const getBillingMonths = (billing) => {
          const b = String(billing || '').toLowerCase();
          if (b.includes('yearly') || b.includes('annual')) return 12;
          if (b.includes('6')) return 6;
          if (b.includes('3')) return 3;
          return 1;
        };

        const parseRequestField = (raw, label) => {
          if (!raw) return null;
          const regex = new RegExp(`${label}:\\s*([^|;\\n]+)`, 'i');
          const match = raw.match(regex);
          return match?.[1]?.trim() || null;
        };

        const getHostingExpiryDate = (h) => {
          if (h.expiry_date) return new Date(h.expiry_date);
          const isApproved = ['active', 'connected', 'approved', 'completed'].includes(String(h.status || '').toLowerCase());
          if (!isApproved) return null;
          const updated = h.updated_at || h.created_at;
          if (!updated) return null;
          const base = new Date(updated);
          const raw = h.package_type || h.notes || '';
          const billingPeriod = parseRequestField(raw, 'Billing') || h.billing_period;
          base.setMonth(base.getMonth() + getBillingMonths(billingPeriod));
          return base;
        };

        const isHostingActive = (h) => {
          const status = String(h.status || '').toLowerCase();
          const approved = ['active', 'connected', 'approved', 'completed'].includes(status);
          if (!approved) return false;
          const exp = getHostingExpiryDate(h);
          if (exp) {
            return exp.getTime() >= new Date().getTime();
          }
          return true;
        };

        const isHostingExpired = (h) => {
          const status = String(h.status || '').toLowerCase();
          if (status === 'expired') return true;
          const exp = getHostingExpiryDate(h);
          if (exp) {
            return exp.getTime() < new Date().getTime();
          }
          return false;
        };

        const isDomainActive = (d) => {
          const status = String(d.status || '').toLowerCase();
          const approved = ['active', 'registered', 'approved', 'connected', 'completed'].includes(status);
          if (!approved) return false;
          const isExpired = d.expiry_date && new Date(d.expiry_date).getTime() < new Date().getTime();
          return !isExpired;
        };

        const isDomainExpired = (d) => {
          const status = String(d.status || '').toLowerCase();
          if (status === 'expired') return true;
          const isExpired = d.expiry_date && new Date(d.expiry_date).getTime() < new Date().getTime();
          return !!isExpired;
        };

        const isEmailActive = (e) => {
          const status = String(e.status || '').toLowerCase();
          const approved = ['active', 'connected', 'approved', 'completed'].includes(status);
          if (!approved) return false;
          const isExpired = e.expiry_date && new Date(e.expiry_date).getTime() < new Date().getTime();
          return !isExpired;
        };

        const isEmailExpired = (e) => {
          const status = String(e.status || '').toLowerCase();
          if (status === 'expired') return true;
          const isExpired = e.expiry_date && new Date(e.expiry_date).getTime() < new Date().getTime();
          return !!isExpired;
        };

        // Deduplicate and combine hosting packages and requests
        const normalizeHostingKey = (value) => String(value || '').split('|')[0].trim().toLowerCase();
        
        const rawPackages = hostingPackagesRes.data || [];
        const rawRequests = hostingRes.data || [];
        
        const requestIndex = new Map();
        rawRequests.forEach(req => {
          const key = `${req.customer_id || customerId}:${normalizeHostingKey(req.package_name || req.package_type || req.packageName)}`;
          requestIndex.set(key, req);
        });

        const linkedRequestIds = new Set();
        
        const enrichedPackages = rawPackages.map(pkg => {
          const key = `${pkg.customer_id || customerId}:${normalizeHostingKey(pkg.package_name || pkg.package_type || pkg.packageName)}`;
          const linkedRequest = requestIndex.get(key) || null;
          if (linkedRequest) linkedRequestIds.add(linkedRequest.id);
          
          const raw = linkedRequest?.package_type || linkedRequest?.notes || pkg.package_type || pkg.notes || '';
          const billingPeriod = pkg.billing_period || linkedRequest?.billing_period || parseRequestField(raw, 'Billing');
          const expiryDate = pkg.expiry_date || linkedRequest?.expiry_date || null;
          
          return {
            ...pkg,
            billing_period: billingPeriod,
            expiry_date: expiryDate,
          };
        });

        const unlinkedRequests = rawRequests.filter(r => !linkedRequestIds.has(r.id)).map(r => {
          const raw = r.package_type || r.notes || '';
          const billingPeriod = parseRequestField(raw, 'Billing');
          return {
            ...r,
            billing_period: billingPeriod,
          };
        });

        const combinedHosting = [...enrichedPackages, ...unlinkedRequests];

        const activeHostingSet = new Set();
        const expiredHostingSet = new Set();
        combinedHosting.forEach(h => {
          const key = String(h.package_name || h.package_type || h.packageName || '').toLowerCase().trim();
          if (key) {
            if (isHostingActive(h)) {
              activeHostingSet.add(key);
            } else if (isHostingExpired(h)) {
              expiredHostingSet.add(key);
            }
          }
        });
        activeHostingSet.forEach(key => {
          expiredHostingSet.delete(key);
        });
        const hostingActiveCount = activeHostingSet.size;
        const hostingExpiredCount = expiredHostingSet.size;

        let hostingStatus = 'inactive';
        if (combinedHosting.length > 0) {
          const hasActive = hostingActiveCount > 0;
          const hasExpired = hostingExpiredCount > 0;
          hostingStatus = hasActive ? 'active' : (hasExpired ? 'expired' : 'inactive');
        }

        // Deduplicate and count active/expired domains
        const activeDomainSet = new Set();
        const expiredDomainSet = new Set();
        const activeDomainList1 = (domainsRes.data || []).filter(isDomainActive);
        const activeDomainList2 = (domainRes.data || []).filter(isDomainActive);
        const expiredDomainList1 = (domainsRes.data || []).filter(isDomainExpired);
        const expiredDomainList2 = (domainRes.data || []).filter(isDomainExpired);

        activeDomainList1.forEach(d => {
          const key = String(d.domain_name || d.name || '').toLowerCase().trim();
          if (key) activeDomainSet.add(key);
        });
        activeDomainList2.forEach(d => {
          const key = String(d.domain_name || d.name || '').toLowerCase().trim();
          if (key) activeDomainSet.add(key);
        });

        expiredDomainList1.forEach(d => {
          const key = String(d.domain_name || d.name || '').toLowerCase().trim();
          if (key) expiredDomainSet.add(key);
        });
        expiredDomainList2.forEach(d => {
          const key = String(d.domain_name || d.name || '').toLowerCase().trim();
          if (key) expiredDomainSet.add(key);
        });

        activeDomainSet.forEach(key => {
          expiredDomainSet.delete(key);
        });
        const domainActiveCount = activeDomainSet.size;
        const domainExpiredCount = expiredDomainSet.size;

        let domainStatus = 'inactive';
        const allDomains = [...(domainsRes.data || []), ...(domainRes.data || [])];
        if (allDomains.length > 0) {
          const hasActive = domainActiveCount > 0;
          const hasExpired = domainExpiredCount > 0;
          domainStatus = hasActive ? 'active' : (hasExpired ? 'expired' : 'inactive');
        }

        const activeEmailSet = new Set();
        const expiredEmailSet = new Set();
        (emailsRes.data || []).forEach(e => {
          const key = String(e.email || '').toLowerCase().trim();
          if (key) {
            if (isEmailActive(e)) {
              activeEmailSet.add(key);
            } else if (isEmailExpired(e)) {
              expiredEmailSet.add(key);
            }
          }
        });
        activeEmailSet.forEach(key => {
          expiredEmailSet.delete(key);
        });
        const emailActiveCount = activeEmailSet.size;
        const emailExpiredCount = expiredEmailSet.size;

        let emailStatus = 'inactive';
        if ((emailsRes.data || []).length > 0) {
          const hasActive = emailActiveCount > 0;
          const hasExpired = emailExpiredCount > 0;
          emailStatus = hasActive ? 'active' : (hasExpired ? 'expired' : 'inactive');
        }

        const renewalAlerts = [];

        (domainsRes.data || []).forEach(d => {
          if (d.expiry_date) {
            const days = getDaysUntilExpiry(d.expiry_date);
            if (days !== null && days >= 0 && days <= 30) {
              const name = d.domain_name || d.name || 'Domain';
              renewalAlerts.push({ type: 'domain', name, days, message: `Domain ${name} expires in ${days} day${days !== 1 ? 's' : ''}.` });
            }
          }
        });

        combinedHosting.forEach(h => {
          const exp = getHostingExpiryDate(h);
          if (exp) {
            const days = getDaysUntilExpiry(exp);
            if (days !== null && days >= 0 && days <= 30) {
              const planName = h.package_name || h.package_type || h.packageName || 'Hosting Plan';
              const displayName = planName.split('|')[0]?.trim() || 'Hosting Plan';
              const domainName = h.domain || h.domain_name || 'No domain';
              renewalAlerts.push({ type: 'hosting', name: displayName, days, message: `Hosting ${displayName} (${domainName}) expires in ${days} day${days !== 1 ? 's' : ''}.` });
            }
          }
        });

        (emailsRes.data || []).forEach(e => {
          if (e.expiry_date) {
            const days = getDaysUntilExpiry(e.expiry_date);
            if (days !== null && days >= 0 && days <= 30) {
              const name = e.email || 'Email Account';
              renewalAlerts.push({ type: 'email', name, days, message: `Email ${name} expires in ${days} day${days !== 1 ? 's' : ''}.` });
            }
          }
        });

        const licenses = productsRes.data || [];
        let hasExpiredProducts = false;
        let productsActiveCount = 0;
        let productsExpiredCount = 0;

        licenses.forEach(l => {
          const prodName = l.products?.name || l.name || 'Software Product';
          let isLickExpired = false;
          let isLickExpiringSoon = false;
          let days = null;

          if (l.status === 'Expired') {
            isLickExpired = true;
          } else if (l.status !== 'Disabled' && l.status !== 'Suspended') {
            const lt = l.license_type || l.products?.license_type || 'one_time';
            if ((lt === 'yearly' || lt === 'monthly') && l.expiry_date) {
              days = getDaysUntilExpiry(l.expiry_date);
              if (days !== null) {
                if (days <= 0) isLickExpired = true;
                else if (days <= 30) isLickExpiringSoon = true;
              }
            }
          }

          if (isLickExpired) {
            hasExpiredProducts = true;
            renewalAlerts.push({ type: 'product', name: prodName, days: days !== null ? days : -1, message: `Product ${prodName} has expired.` });
            productsExpiredCount++;
          } else {
            if (l.status !== 'Disabled' && l.status !== 'Suspended') {
              productsActiveCount++;
            }
            if (isLickExpiringSoon) {
              renewalAlerts.push({ type: 'product', name: prodName, days, message: `Product ${prodName} expires in ${days} day${days !== 1 ? 's' : ''}.` });
            }
          }
        });

        const hasRenewalSoon = renewalAlerts.length > 0;

        const notificationItems = (notifRes.data || []).map(n => {
          let activityType = 'notification';
          let actTitle = n.title;
          let actSubtitle = n.message || '';

          if (n.type === 'customer_login') { activityType = 'login'; actTitle = 'Security Login'; actSubtitle = n.message || 'Customer login session'; }
          else if (n.type === 'product_assigned' || n.type === 'new_product') { activityType = 'product'; actSubtitle = 'Product Assignment'; }
          else if (n.type === 'invoice') activityType = 'invoice';
          else if (n.type === 'ticket') activityType = 'ticket';
          else if (n.type === 'expiration') activityType = 'expiration';
          else if (n.type === 'update') activityType = 'update';
          else if (n.type === 'announcement') activityType = 'announcement';

          return { id: `n-${n.id}`, type: activityType, title: actTitle, subtitle: actSubtitle.substring(0, 60) + (actSubtitle.length > 60 ? '…' : ''), status: n.type || 'info', date: n.created_at };
        });

        let activityItems = [
          ...domains.slice(0, 5).map(r => ({ id: `d-${r.id}`, type: 'domain', title: r.domain_name || 'Domain Registration', subtitle: 'Domain Request Submitted', status: r.status, date: r.created_at })),
          ...hostings.slice(0, 5).map(r => ({ id: `h-${r.id}`, type: 'hosting', title: r.package_type?.split('|')[0]?.trim() || 'Hosting Request', subtitle: 'Hosting Request Submitted', status: r.status, date: r.created_at })),
          ...emails.slice(0, 5).map(r => ({ id: `e-${r.id}`, type: 'email', title: r.email || 'Email Registration', subtitle: 'Email Request Submitted', status: r.status, date: r.created_at })),
          ...notificationItems
        ];

        if (clearedTime > 0) {
          activityItems = activityItems.filter(item => !item.date || new Date(item.date).getTime() > clearedTime);
        }

        activityItems = activityItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);

        const totalProducts = licenses.length;
        let productsStatus = 'inactive';
        if (licenses.length > 0) {
          const hasActive = productsActiveCount > 0;
          const hasExpired = productsExpiredCount > 0;
          productsStatus = hasActive ? 'active' : (hasExpired ? 'expired' : 'inactive');
        }

        setData({
          chartData, totalOrders: allOrders.length, approvedOrders: approved.length,
          totalProducts, totalSpend,
          successRate: allOrders.length === 0 ? 0 : Math.round((approved.length / allOrders.length) * 100),
          growth, recentActivity: activityItems, invoiceSummary,
          serviceHealth: {
            hosting: hostingStatus,
            domain: domainStatus,
            email: emailStatus,
            products: productsStatus,
            renewalSoon: hasRenewalSoon,
            hostingCount: hostingActiveCount,
            hostingExpiredCount,
            domainCount: domainActiveCount,
            domainExpiredCount,
            emailCount: emailActiveCount,
            emailExpiredCount,
            productsCount: productsActiveCount,
            productsExpiredCount,
          },
          renewalAlerts,
          latestAnnouncement: (() => {
            if (latestAnnouncementRes?.data && Array.isArray(latestAnnouncementRes.data)) {
              const now = new Date();
              return latestAnnouncementRes.data.find(ann => {
                if (ann.start_date && new Date(ann.start_date) > now) return false;
                if (ann.end_date && new Date(ann.end_date) < now) return false;
                return true;
              }) || null;
            }
            return null;
          })(),
          invoices: processedInvoices,
          hostingPackages: hostingPackagesRes.data || [],
          domains: domainsRes.data || [],
          emails: emailsRes.data || [],
          jobs: jobsRes.data || [],
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 64, gap: 16 }}>
        <Loader2 style={{ width: 36, height: 36, color: brand }} className="animate-spin" />
        <p style={{ color: subText, fontSize: 13 }}>Loading your dashboard…</p>
      </div>
    );
  }

  const cardStyle = {
    background: isDark ? 'rgba(28,30,36,0.9)' : '#fff',
    border: `1px solid ${border}`,
    borderRadius: 20,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)',
  };

  const getCardStyle = (hovered) => ({
    ...cardStyle,
    border: `1px solid ${hovered ? brand : border}`,
    boxShadow: hovered
      ? (isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(232,123,53,0.08)')
      : cardStyle.boxShadow,
    transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
  });

  const isAnnouncementBannerVisible = data.latestAnnouncement &&
    !announcementDismissed &&
    localStorage.getItem(`dismissed_announcement_${data.latestAnnouncement.id}`) !== 'true';

  const statCards = [
    {
      icon: ShoppingCart, iconBg: brandLight, iconColor: brand,
      label: 'Total Orders', value: data.totalOrders,
      description: 'View and track custom orders',
      quickActionText: 'View order history',
      onClick: () => onNavigate('order_history'),
      gradient: `linear-gradient(90deg, ${brand}, #f59e0b)`,
    },
    {
      icon: CheckCircle2, iconBg: isDark ? 'rgba(232,123,53,0.12)' : '#fff7ed', iconColor: brand,
      label: 'Approved Orders', value: data.approvedOrders, valueColor: brand,
      description: 'All active & completed services',
      quickActionText: 'Manage services',
      onClick: () => onNavigate('order_history'),
      gradient: `linear-gradient(90deg, ${brand}, #f59e0b)`,
    },
    {
      icon: Package, iconBg: isDark ? 'rgba(232,123,53,0.12)' : '#fff7ed', iconColor: brand,
      label: 'Total Products', value: data.totalProducts,
      description: 'Licensed software & downloads',
      quickActionText: 'Manage licenses',
      onClick: () => onNavigate('products'),
      gradient: `linear-gradient(90deg, ${brand}, #f59e0b)`,
    },
    {
      icon: DollarSign, iconBg: isDark ? 'rgba(232,123,53,0.12)' : '#fff7ed', iconColor: brand,
      label: 'Total Spend', value: data.totalSpend,
      description: 'Paid invoices to date',
      quickActionText: 'View invoices',
      onClick: () => onNavigate('invoices'),
      gradient: `linear-gradient(90deg, ${brand}, #f59e0b)`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 64 }}>

      {/* ── Announcement Banner ── */}
      {isAnnouncementBannerVisible && (
        <div style={{
          background: isDark ? 'rgba(232,123,53,0.12)' : 'linear-gradient(135deg, #fff7ed, #ffedd5)',
          border: `1px solid ${isDark ? 'rgba(232,123,53,0.3)' : '#fed7aa'}`,
          borderRadius: 16, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          boxShadow: '0 2px 12px rgba(232,123,53,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 10px ${brand}50` }}>
              <Megaphone style={{ width: 15, height: 15, color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.latestAnnouncement.title}</p>
              <p style={{ color: subText, fontSize: 11, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.latestAnnouncement.message}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => onNavigate('announcements')} style={{ background: brand, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 10px ${brand}40`, whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = '#d4692a'} onMouseLeave={e => e.currentTarget.style.background = brand}>
              View Update
            </button>
            <button onClick={() => { localStorage.setItem(`dismissed_announcement_${data.latestAnnouncement.id}`, 'true'); setAnnouncementDismissed(true); }}
              style={{ background: 'none', border: 'none', color: subText, cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}



      {/* ── Row 1: 4 Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatMiniCard key={i} {...card} c={c} isDark={isDark} />
        ))}
      </div>

      {/* ── Row 2: Orders Overview + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Orders Overview */}
        <div
          className="lg:col-span-3"
          onMouseEnter={() => setOrdersHovered(true)}
          onMouseLeave={() => setOrdersHovered(false)}
          style={{
            ...getCardStyle(ordersHovered),
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 style={{ width: 16, height: 16, color: brand }} />
              </div>
              <span style={{ color: text, fontWeight: 700, fontSize: 15 }}>Orders Overview</span>
            </div>
            <span style={{ background: panel2, color: subText, fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 99, letterSpacing: 0.3 }}>
              Last 6 Months
            </span>
          </div>

          <div style={{ width: '100%' }}>
            <LineChart data={data.chartData} c={c} isDark={isDark} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, paddingTop: 16, borderTop: `1px solid ${border}` }}>
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
              <div key={i} style={{ textAlign: 'center', padding: '10px 8px', background: panel2, borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  {s.icon}
                  <span style={{ color: s.valueColor, fontSize: 20, fontWeight: 800 }}>{s.value}</span>
                </div>
                <p style={{ color: subText, fontSize: 10, margin: 0, fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="lg:col-span-2"
          onMouseEnter={() => setActivityHovered(true)}
          onMouseLeave={() => setActivityHovered(false)}
          style={{
            ...getCardStyle(activityHovered),
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell style={{ width: 16, height: 16, color: brand }} />
            </div>
            <span style={{ color: text, fontWeight: 700, fontSize: 15 }}>Recent Activity</span>
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
                else if (item.type === 'notification' && (item.status === 'quotation' || String(item.title || '').toLowerCase().includes('quotation'))) { dest = 'quotations'; }
                const canNav = !!onNavigate;
                return (
                  <div
                    key={item.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: canNav ? 'pointer' : 'default', transition: 'background 0.15s' }}
                    onClick={async () => {
                      if (canNav) {
                        if (item.id.startsWith('n-')) {
                          const notifId = item.id.replace('n-', '');
                          supabase.from('notifications').update({ read_status: true }).eq('id', notifId).then(({ error }) => { if (error) console.error('Failed to mark notification as read:', error); });
                        }
                        onNavigate(dest);
                      }
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = hover}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <ActivityIcon type={item.type} isDark={isDark} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: text, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{item.title}</p>
                      <p style={{ color: subText, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>{item.subtitle}</p>
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, minHeight: 140 }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell style={{ width: 22, height: 22, color: subText, opacity: 0.4 }} />
                </div>
                <p style={{ color: subText, fontSize: 12, margin: 0 }}>No recent activity</p>
              </div>
            )}
          </div>

          {data.recentActivity.length > 0 && (
            <p style={{ color: subText, fontSize: 10, textAlign: 'center', marginTop: 14, paddingTop: 10, borderTop: `1px solid ${border}` }}>
              Showing latest {data.recentActivity.length} activities
            </p>
          )}
        </div>
      </div>

      {/* ── Row 3: Project Progress + Account Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3" style={{ height: '100%' }}>
          <ProjectProgressWidget jobs={data.jobs} onNavigate={onNavigate} c={c} isDark={isDark} />
        </div>
        <div className="lg:col-span-2" style={{ height: '100%' }}>
          <AccountStatusWidget user={user} data={data} c={c} isDark={isDark} onNavigate={onNavigate} />
        </div>
      </div>

      {/* ── Row 4: Service Health + Invoice Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <ServiceHealthCard data={data} c={c} isDark={isDark} onNavigate={onNavigate} />
        </div>
        <div className="lg:col-span-2">
          <InvoiceSummaryCard invoiceSummary={data.invoiceSummary} onNavigate={onNavigate} c={c} isDark={isDark} />
        </div>
      </div>

      {/* ── Row 5: News + Need Help ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 flex flex-col row5-card-container">
          <NewsAnnouncementsCard isDark={isDark} c={c} customerId={user?.id} />
        </div>
        <div className="lg:col-span-2 flex flex-col row5-card-container">
          <div
            onMouseEnter={() => setHelpHovered(true)}
            onMouseLeave={() => setHelpHovered(false)}
            style={{ 
              ...getCardStyle(helpHovered), 
              padding: 24, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between', 
              gap: 20, 
              height: '100%', 
              boxSizing: 'border-box', 
              position: 'relative', 
              overflow: 'hidden' 
            }}
          >
            {/* Header: Lightning Badge + Title & Description */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.03)', 
                border: `1px solid ${isDark ? 'rgba(232,123,53,0.2)' : 'rgba(232,123,53,0.4)'}`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Zap style={{ width: 22, height: 22, color: brand }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h3 style={{ color: text, fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Need Help?</h3>
                <p style={{ color: subText, fontSize: 13, margin: 0, lineHeight: 1.4 }}>
                  Create a support ticket, call us, or chat via WhatsApp during business hours.
                </p>
              </div>
            </div>

            {/* Response Time Info Banner */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              fontSize: 12, 
              color: subText,
              padding: '2px 0'
            }}>
              <Clock style={{ width: 16, height: 16, color: brand }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: text }}>Response Time:</span>
                <span style={{ color: brand, fontWeight: 600 }}>30 Min – 1 Hr</span>
                <span style={{ opacity: 0.6 }}>|</span>
                <span style={{ opacity: 0.7 }}>May take up to 24 Hrs during busy periods.</span>
              </div>
            </div>

            {/* Action Button: Create Support Ticket */}
            <button
              onClick={() => onNavigate('support_create')}
              style={{ 
                alignSelf: 'center',
                width: 'auto',
                padding: '12px 24px', 
                borderRadius: 12, 
                background: brand, 
                border: 'none', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 700, 
                cursor: 'pointer', 
                boxShadow: `0 4px 12px ${brand}30`, 
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                marginBottom: 4
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${brand}40`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 12px ${brand}30`; }}
            >
              <Ticket style={{ width: 16, height: 16 }} />
              Create Support Ticket
            </button>
 
            {/* Separator */}
            <div style={{ textAlign: 'center', margin: '4px 0' }}>
              <span style={{ color: subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.6 }}>— OR REACH OUT —</span>
            </div>
 
            {/* Reach Out Grid: Call Us & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full" style={{ marginTop: 'auto' }}>
              {/* Call Us Box */}
              <a href="tel:+94702032323"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: 12,
                  padding: '20px 12px', 
                  borderRadius: 16, 
                  border: `1px solid ${border}`, 
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', 
                  textDecoration: 'none', 
                  transition: 'all 0.2s ease-in-out' 
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.borderColor = brand; 
                  e.currentTarget.style.background = isDark ? 'rgba(232,123,53,0.04)' : 'rgba(232,123,53,0.02)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${brand}15`;
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.borderColor = border; 
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Icon Container */}
                <div style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: '50%', 
                  border: `1px solid ${isDark ? 'rgba(232,123,53,0.2)' : 'rgba(232,123,53,0.4)'}`,
                  background: isDark ? 'rgba(232,123,53,0.04)' : '#fff',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Phone style={{ width: 18, height: 18, color: brand }} />
                </div>
                
                {/* Title & Phone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: text, fontSize: 14, fontWeight: 700 }}>Call Us</span>
                  <span style={{ color: subText, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>+94 70 203 2323</span>
                </div>
 
                {/* Divider Line */}
                <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, width: '100%', margin: '4px 0' }} />
 
                {/* Status/Time Pill */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 99,
                  border: `1px solid ${isDark ? 'var(--brand-color-light)' : 'rgba(232,123,53,0.3)'}`,
                  background: isDark ? 'rgba(232,123,53,0.04)' : 'rgba(232,123,53,0.02)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: brand
                }}>
                  <Clock style={{ width: 12, height: 12, color: brand }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Mon – Fri | 9:00 AM – 6:00 PM</span>
                </div>
              </a>
 
              {/* WhatsApp Box */}
              <a href="https://wa.me/message/GSCYIITXTDGXO1" target="_blank" rel="noopener noreferrer"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: 12,
                  padding: '20px 12px', 
                  borderRadius: 16, 
                  border: `1px solid ${border}`, 
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', 
                  textDecoration: 'none', 
                  transition: 'all 0.2s ease-in-out' 
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.borderColor = brand; 
                  e.currentTarget.style.background = isDark ? 'rgba(232,123,53,0.04)' : 'rgba(232,123,53,0.02)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${brand}15`;
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.borderColor = border; 
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Icon Container */}
                <div style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: '50%', 
                  border: `1px solid ${isDark ? 'rgba(232,123,53,0.2)' : 'rgba(232,123,53,0.4)'}`,
                  background: isDark ? 'rgba(232,123,53,0.04)' : '#fff',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: brand }}>
                    <path d="M12.031 2c-5.51 0-9.99 4.48-9.99 9.99 0 2.062.626 3.979 1.698 5.568l-1.116 4.093 4.205-1.103c1.517.927 3.308 1.465 5.203 1.465 5.51 0 9.99-4.48 9.99-9.99S17.541 2 12.031 2zm0 1.662c4.595 0 8.328 3.733 8.328 8.328S16.626 20.318 12.031 20.318c-1.83 0-3.528-.592-4.912-1.597l-.353-.255-2.434.638.653-2.395-.286-.399c-1.144-1.593-1.821-3.535-1.821-5.637.001-4.595 3.734-8.328 8.329-8.328zm-3.328 3.864c-.144 0-.361.054-.541.252-.18.198-.685.67-.685 1.632 0 .963.702 1.892.8 2.025.099.135 1.352 2.158 3.298 2.977.463.195.825.312 1.107.402.465.147.888.126 1.222.076.372-.056 1.145-.468 1.306-.921.161-.453.161-.842.113-.923-.048-.081-.18-.129-.379-.228-.198-.099-1.145-.565-1.321-.629-.177-.064-.306-.096-.437.099-.13.195-.504.629-.617.755-.113.127-.225.142-.424.043-.198-.099-.838-.309-1.597-.986-.591-.527-.989-1.18-.105-1.328.099-.165.198-.243.297-.342.099-.099.13-.165.198-.297.066-.132.033-.249-.016-.348-.049-.099-.437-1.053-.598-1.442-.157-.38-.33-.328-.453-.334l-.387-.008z" />
                  </svg>
                </div>
                
                {/* Title & WhatsApp Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: text, fontSize: 14, fontWeight: 700 }}>WhatsApp</span>
                  <span style={{ color: subText, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>Chat Now (Sri Lanka)</span>
                </div>
 
                {/* Divider Line */}
                <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, width: '100%', margin: '4px 0' }} />
 
                {/* Status/Time Pill */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 99,
                  border: `1px solid ${isDark ? 'var(--brand-color-light)' : 'rgba(232,123,53,0.3)'}`,
                  background: isDark ? 'rgba(232,123,53,0.04)' : 'rgba(232,123,53,0.02)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: brand
                }}>
                  <Clock style={{ width: 12, height: 12, color: brand }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Mon – Fri | 9:00 AM – 6:00 PM</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 6: About + Contact + Quick Links + Rate Us ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* About Our Company */}
        <div
          onMouseEnter={() => setAboutHovered(true)}
          onMouseLeave={() => setAboutHovered(false)}
          style={{
            ...getCardStyle(aboutHovered),
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building style={{ width: 16, height: 16, color: brand }} />
            </div>
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>About Our Company</span>
          </div>
          <p style={{ color: subText, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            Nextiom is a trusted provider of domain registration, web hosting, email solutions, and digital services.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Reliable Infrastructure', '24/7 Customer Support', 'Secure & Scalable Solutions'].map((point, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 style={{ width: 11, height: 11, color: brand }} />
                </div>
                <span style={{ color: text, fontSize: 11, fontWeight: 500 }}>{point}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate('about_company')}
            style={{ marginTop: 'auto', padding: '9px 18px', borderRadius: 10, background: 'transparent', color: brand, border: `1.5px solid ${brand}`, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = brandLight; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Learn More About Us
          </button>
        </div>

        {/* Contact Information */}
        <div
          onMouseEnter={() => setContactHovered(true)}
          onMouseLeave={() => setContactHovered(false)}
          style={{
            ...getCardStyle(contactHovered),
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone style={{ width: 16, height: 16, color: brand }} />
            </div>
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Contact Information</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {[
              { Icon: Phone, primary: '+94 70 203 2323', secondary: 'Mon – Fri (9:00 AM – 6:00 PM)' },
              { Icon: Mail, primary: 'info@nextiom.com', secondary: 'We reply within 24 hours' },
              { Icon: MapPin, primary: 'Niwandama, Ja Ela – 11350', secondary: 'Sri Lanka' },
              { Icon: Globe, primary: 'https://nextiom.com', secondary: 'Official website', href: 'https://nextiom.com' },
            ].map(({ Icon, primary, secondary, href }, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: panel2 }}>
                <Icon style={{ width: 13, height: 13, color: brand, marginTop: 2, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  {href
                    ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: text, fontSize: 11, fontWeight: 600, textDecoration: 'underline', display: 'block' }}>{primary}</a>
                    : <p style={{ color: text, fontSize: 11, fontWeight: 600, margin: 0 }}>{primary}</p>
                  }
                  <p style={{ color: subText, fontSize: 10, margin: 0 }}>{secondary}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('about_contact')} style={{ padding: '9px 18px', borderRadius: 10, background: 'transparent', color: brand, border: `1.5px solid ${brand}`, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = brandLight; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            View All Contact Options
          </button>
        </div>

        {/* Quick Links */}
        <div
          onMouseEnter={() => setQuickHovered(true)}
          onMouseLeave={() => setQuickHovered(false)}
          style={{
            ...getCardStyle(quickHovered),
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers style={{ width: 16, height: 16, color: brand }} />
            </div>
            <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>Quick Links</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {[
              { label: 'My Hosting', dest: 'hosting_my', Icon: Server },
              { label: 'My Domains', dest: 'domains_my', Icon: Globe },
              { label: 'My Emails', dest: 'emails_my', Icon: Mail },
              { label: 'My Invoices', dest: 'invoices', Icon: CreditCard },
              { label: 'Knowledgebase', dest: 'knowledgebase', Icon: BookOpen },
            ].map((link, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate(link.dest)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 11, cursor: 'pointer', transition: 'all 0.15s', border: `1px solid transparent` }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = panel2; e.currentTarget.style.borderColor = border; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <link.Icon style={{ width: 14, height: 14, color: brand }} />
                  <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{link.label}</span>
                </div>
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
