import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, Loader2, Server, Cloud, Database, Cpu,
  Globe, Shield, Headphones, Zap, HardDrive, Wifi,
  Monitor, ArrowRight, Star, Sparkles, Lock, RefreshCw,
  ChevronDown, AlertCircle, MessageSquare, Phone
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { resolveCustomerId, assertPortalActionsAllowed } from '@/lib/storage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

// ── Fallback plans if DB is empty ──────────────────────────────────────────────
const DEFAULT_PLANS = [
  {
    id: 'd1', hosting_type: 'Shared Hosting', hosting_type_key: 'SHARED',
    plan_name: 'Basic', storage: '10GB', bandwidth: '100GB', websites: '1',
    price_monthly: 2.99, price_yearly: 2.39, is_popular: false, is_active: true,
    features: ['Free SSL Certificate', '24/7 Support', '99.9% Uptime'],
  },
  {
    id: 'd2', hosting_type: 'Shared Hosting', hosting_type_key: 'SHARED',
    plan_name: 'Standard', storage: '50GB', bandwidth: '500GB', websites: '5',
    price_monthly: 5.99, price_yearly: 4.79, is_popular: true, is_active: true,
    features: ['Free SSL Certificate', '24/7 Support', '99.9% Uptime', 'Daily Backups'],
  },
  {
    id: 'd3', hosting_type: 'Shared Hosting', hosting_type_key: 'SHARED',
    plan_name: 'Premium', storage: 'Unlimited', bandwidth: 'Unlimited', websites: 'Unlimited',
    price_monthly: 10.99, price_yearly: 8.79, is_popular: false, is_active: true,
    features: ['Free SSL Certificate', '24/7 Priority Support', '99.99% Uptime', 'Daily Backups', 'Free Domain'],
  },
  {
    id: 'd4', hosting_type: 'VPS Hosting', hosting_type_key: 'VPS',
    plan_name: 'VPS Starter', storage: '50GB NVMe', bandwidth: '2TB', websites: 'Unlimited',
    price_monthly: 15.99, price_yearly: 12.79, is_popular: false, is_active: true,
    features: ['Root Access', 'Free SSL', '24/7 Support', '99.9% Uptime'],
  },
  {
    id: 'd5', hosting_type: 'VPS Hosting', hosting_type_key: 'VPS',
    plan_name: 'VPS Pro', storage: '100GB NVMe', bandwidth: '5TB', websites: 'Unlimited',
    price_monthly: 29.99, price_yearly: 23.99, is_popular: true, is_active: true,
    features: ['Root Access', 'Free SSL', '24/7 Priority Support', '99.99% Uptime', 'Managed Backups'],
  },
  {
    id: 'd6', hosting_type: 'Dedicated Server', hosting_type_key: 'DEDICATED',
    plan_name: 'Standard', storage: 'Custom', bandwidth: 'Custom', websites: 'Unlimited',
    price_monthly: null, price_yearly: null, is_popular: false, is_active: true,
    features: ['Full Control', 'Dedicated Resources', '24/7 Support', 'Custom Configuration'],
  },
  {
    id: 'd7', hosting_type: 'Cloud Hosting', hosting_type_key: 'CLOUD',
    plan_name: 'Cloud Basic', storage: '12GB', bandwidth: '11TB', websites: 'Unlimited',
    price_monthly: 8.99, price_yearly: 7.19, is_popular: false, is_active: true,
    features: ['Auto-Scaling', 'Free SSL', '24/7 Support', '99.99% Uptime'],
  },
];

// ── Hosting type icons & descriptions ──────────────────────────────────────────
const TYPE_META = {
  'Shared Hosting':   { Icon: Globe,    gradient: 'linear-gradient(135deg,#E87B35,#c4611e)', desc: 'Affordable and easy for beginners' },
  'Cloud Hosting':    { Icon: Cloud,    gradient: 'linear-gradient(135deg,#E87B35,#c4611e)', desc: 'Scalable and powerful cloud infrastructure' },
  'VPS Hosting':      { Icon: Database, gradient: 'linear-gradient(135deg,#E87B35,#c4611e)', desc: 'Dedicated power with VPS flexibility' },
  'Dedicated Server': { Icon: Cpu,      gradient: 'linear-gradient(135deg,#E87B35,#c4611e)', desc: 'Full control with dedicated resources' },
};

const getTypeMeta = (type) =>
  TYPE_META[type] || { Icon: Server, gradient: 'linear-gradient(135deg,#E87B35,#c4611e)', desc: 'Hosting solution' };

// ── Step Progress Bar ──────────────────────────────────────────────────────────
const STEPS = ['Hosting Type', 'Choose Plan', 'Configuration'];

function StepProgress({ currentStep, theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, position: 'relative' }}>
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isUpcoming = stepNum > currentStep;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, transition: 'all 0.3s',
                background: isCompleted ? '#22c55e' : isActive ? theme.brand : theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                border: isUpcoming ? (theme.isDark ? '2px solid rgba(255,255,255,0.12)' : '2px solid rgba(0,0,0,0.08)') : isActive ? `2px solid ${theme.brand}` : '2px solid #22c55e',
                color: isCompleted || isActive ? '#fff' : theme.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)',
                boxShadow: isActive ? `0 0 16px ${theme.brand}80` : isCompleted ? '0 0 12px rgba(34,197,94,0.3)' : 'none',
              }}>
                {isCompleted ? <CheckCircle size={16} /> : stepNum}
              </div>
              <span style={{
                marginTop: 6, fontSize: 11, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
                color: isCompleted ? '#22c55e' : isActive ? theme.brand : theme.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)',
                transition: 'all 0.3s',
              }}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, background: isCompleted ? 'linear-gradient(90deg,#22c55e,#22c55e)' : theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                transition: 'background 0.4s', marginBottom: 22, maxWidth: 80,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Hosting Type Card ──────────────────────────────────────────────────────────
function HostingTypeCard({ type, isSelected, onClick, theme }) {
  const { Icon, gradient, desc } = getTypeMeta(type);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', padding: '20px 16px', borderRadius: 16, cursor: 'pointer',
        border: `2px solid ${isSelected ? theme.brand : hovered ? 'rgba(232,123,53,0.4)' : theme.border}`,
        background: isSelected
          ? 'linear-gradient(135deg,rgba(232,123,53,0.18),rgba(232,123,53,0.06))'
          : hovered
            ? theme.hover
            : theme.isDark ? 'rgba(255,255,255,0.02)' : theme.card,
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: isSelected ? `0 0 24px ${theme.brand}40, inset 0 0 0 1px ${theme.brand}25` : 'none',
        transform: hovered && !isSelected ? 'translateY(-1px)' : 'none',
        textAlign: 'center',
      }}
    >
      {isSelected && (
        <div style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: theme.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={13} color="#fff" />
        </div>
      )}
      <div style={{
        width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
        background: isSelected ? gradient : theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        transition: 'background 0.25s',
        boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
      }}>
        <Icon size={22} color={isSelected ? '#fff' : theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'} />
      </div>
      <p style={{ color: isSelected ? theme.brand : theme.text, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{type}</p>
      <p style={{ color: theme.subText, fontSize: 11, lineHeight: 1.4 }}>{desc}</p>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, isSelected, billingPeriod, onClick, theme }) {
  const [hovered, setHovered] = useState(false);
  let price = plan.price_monthly;
  if (billingPeriod === 'Yearly') {
    const discount = plan.discount_yearly || 0;
    price = plan.price_monthly * (1 - discount / 100);
  } else if (billingPeriod === '2 Years') {
    const discount = plan.discount_2years || 0;
    price = plan.price_monthly * (1 - discount / 100);
  }
  const hasPrice = price !== null && price !== undefined;
  const isPopular = plan.is_popular;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', padding: '20px 18px', borderRadius: 16, cursor: 'pointer',
        border: `2px solid ${isSelected ? theme.brand : isPopular ? 'rgba(232,123,53,0.3)' : hovered ? 'rgba(232,123,53,0.3)' : theme.border}`,
        background: isSelected
          ? 'linear-gradient(160deg,rgba(232,123,53,0.18),rgba(232,123,53,0.05))'
          : isPopular
            ? (theme.isDark ? 'linear-gradient(160deg,rgba(232,123,53,0.08),rgba(255,255,255,0.02))' : 'linear-gradient(160deg,rgba(232,123,53,0.08),rgba(255,255,255,0.95))')
            : hovered
              ? theme.hover
              : theme.isDark ? 'rgba(255,255,255,0.02)' : theme.card,
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: isSelected ? `0 0 28px ${theme.brand}48` : isPopular ? `0 0 16px ${theme.brand}20` : 'none',
        transform: hovered && !isSelected ? 'translateY(-2px)' : 'none',
      }}
    >
      {isPopular && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: `linear-gradient(90deg,${theme.brand},#f59e0b)`, color: '#fff', borderRadius: 20,
          padding: '3px 12px', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
          whiteSpace: 'nowrap', boxShadow: `0 4px 12px ${theme.brand}60`,
        }}>
          <Star size={9} fill="#fff" /> MOST POPULAR
        </div>
      )}
      {isSelected && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <CheckCircle size={18} color={theme.brand} />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <p style={{ color: isSelected ? theme.brand : theme.text, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
          {plan.plan_name}
        </p>
        {hasPrice ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: isSelected ? theme.brand : theme.text, lineHeight: 1 }}>
              ${price.toFixed(2)}
            </span>
            <span style={{ fontSize: 12, color: theme.subText, fontWeight: 500 }}>/mo</span>
          </div>
        ) : (
          <div style={{ color: theme.subText, fontSize: 13, fontStyle: 'italic' }}>Custom Pricing</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, borderTop: `1px solid ${theme.border}`, paddingTop: 14 }}>
        {plan.storage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HardDrive size={12} color={theme.brand} />
            <span style={{ fontSize: 12, color: theme.subText }}>{plan.storage} Storage</span>
          </div>
        )}
        {plan.bandwidth && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={12} color={theme.brand} />
            <span style={{ fontSize: 12, color: theme.subText }}>{plan.bandwidth} Bandwidth</span>
          </div>
        )}
        {plan.websites && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Monitor size={12} color={theme.brand} />
            <span style={{ fontSize: 12, color: theme.subText }}>{plan.websites} Website{plan.websites !== '1' ? 's' : ''}</span>
          </div>
        )}
        {(plan.features || []).slice(0, 3).map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={12} color="#22c55e" />
            <span style={{ fontSize: 12, color: theme.subText }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Toggle Switch ──────────────────────────────────────────────────────────────
function ToggleSwitch({ value, onChange, theme }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        position: 'relative', display: 'inline-flex', height: 26, width: 48,
        alignItems: 'center', borderRadius: 13, flexShrink: 0, cursor: 'pointer',
        background: value ? `linear-gradient(90deg,${theme.brand},#f59e0b)` : theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        border: 'none', transition: 'background 0.25s', outline: 'none',
        boxShadow: value ? `0 0 12px ${theme.brand}60` : 'none',
      }}
    >
      <span style={{
        display: 'inline-block', height: 20, width: 20, borderRadius: 10, background: '#fff',
        transform: value ? 'translateX(25px)' : 'translateX(3px)',
        transition: 'transform 0.25s', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

// ── Order Summary Panel ────────────────────────────────────────────────────────
function OrderSummaryPanel({ hostingType, selectedPlan, billingPeriod, autoRenew, domainName, notes, onSubmit, loading, theme, onNavigate }) {
  const brand = theme.brand;
  const plan = selectedPlan;
  let price = plan?.price_monthly;
  let currentDiscount = 0;
  if (billingPeriod === 'Yearly') {
    currentDiscount = plan?.discount_yearly || 0;
    price = plan?.price_monthly * (1 - currentDiscount / 100);
  } else if (billingPeriod === '2 Years') {
    currentDiscount = plan?.discount_2years || 0;
    price = plan?.price_monthly * (1 - currentDiscount / 100);
  }
  const hasPrice = price !== null && price !== undefined;
  const yearlyDiscount = currentDiscount > 0 ? String(currentDiscount) : null;
  const renewalPercentage = plan?.renewal_percentage || 0;
  const renewalPrice = hasPrice ? price * (1 + renewalPercentage / 100) : null;
  const canSubmit = !loading && domainName?.trim() && plan;

  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.2)'}`,
      borderRadius: 20, padding: '24px 20px',
      boxShadow: theme.isDark ? '0 8px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.04)' : '0 8px 30px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: theme.isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Server size={15} color={brand} />
        </div>
        <span style={{ color: theme.text, fontWeight: 700, fontSize: 15 }}>Order Summary</span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Hosting Type', value: hostingType },
          { label: 'Plan', value: plan?.plan_name },
          { label: 'Billing Period', value: billingPeriod },
          { label: 'Domain', value: domainName || '—' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ color: theme.subText, fontSize: 12 }}>{row.label}</span>
            <span style={{ color: theme.text, fontWeight: 600, fontSize: 12, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{row.value || '—'}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ marginBottom: 20, padding: '14px', background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 12, border: `1px solid ${theme.border}` }}>
        {[
          { icon: Shield, label: 'Free SSL Certificate' },
          { icon: Headphones, label: '24/7 Support' },
          { icon: Zap, label: '99.9% Uptime Guarantee' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon size={12} color={brand} />
            <span style={{ color: theme.subText, fontSize: 12 }}>{label}</span>
          </div>
        ))}
        {autoRenew && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={12} color="#22c55e" />
            <span style={{ color: theme.subText, fontSize: 12 }}>Auto Renewal Enabled</span>
          </div>
        )}
      </div>

      {/* Pricing */}
      {hasPrice ? (
        <div style={{ marginBottom: 20, padding: '16px', background: theme.isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)', borderRadius: 14, border: `1px solid ${theme.isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.2)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ color: theme.subText, fontSize: 12 }}>Total Due Today</span>
            {yearlyDiscount && <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>SAVE {yearlyDiscount}%</span>}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: brand, lineHeight: 1.1 }}>
            ${price.toFixed(2)}
            <span style={{ fontSize: 14, fontWeight: 500, color: theme.subText }}>/mo</span>
          </div>
          {billingPeriod !== 'Monthly' && plan.price_monthly && (
            <p style={{ color: theme.subTextMuted, fontSize: 11, textDecoration: 'line-through', marginTop: 2 }}>
              ${plan.price_monthly.toFixed(2)}/mo regular price
            </p>
          )}
          {autoRenew && renewalPrice !== null && (
            <div style={{ borderTop: `1px dashed ${theme.border}`, marginTop: 12, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: theme.subText, fontSize: 12 }}>Renewal Price</span>
              <span style={{ color: theme.text, fontSize: 13, fontWeight: 700 }}>
                ${renewalPrice.toFixed(2)}/mo {renewalPercentage > 0 ? `(+${renewalPercentage}%)` : ''}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 20, padding: '16px', background: theme.isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)', borderRadius: 14, border: `1px solid ${theme.isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.2)'}`, textAlign: 'center' }}>
          <p style={{ color: brand, fontWeight: 700, fontSize: 14 }}>Custom Pricing</p>
          <p style={{ color: theme.subText, fontSize: 11, marginTop: 4 }}>Admin will contact you with a quote</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: canSubmit
            ? `linear-gradient(90deg,${brand},#f59e0b)`
            : theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          color: canSubmit ? '#fff' : theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
          fontWeight: 700, fontSize: 14, cursor: canSubmit ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          boxShadow: canSubmit ? `0 4px 20px ${brand}40` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onMouseEnter={e => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {loading ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Loader2 size={16} className="animate-spin" /> Processing…
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Lock size={14} /> Submit Order
          </span>
        )}
      </button>
      {!domainName?.trim() && (
        <p style={{ color: theme.subTextMuted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
          Enter a domain name to continue
        </p>
      )}

      {/* Help Section */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
        <p style={{ color: theme.text, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Need Help?</p>
        <p style={{ color: theme.subText, fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
          Our support team is here to help you 24/7.
        </p>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('support_create')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, color: brand, fontSize: 12, fontWeight: 600,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none'
          }}
        >
          <Headphones size={13} /> Chat with Support
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
function NewHostingOrderPage({ onSuccess, user, isDark = true, c = {}, onNavigate }) {
  const [allPlans, setAllPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  const [hostingType, setHostingType] = useState(null);
  const [selectedPlanObj, setSelectedPlanObj] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('Yearly');
  const [domainOption, setDomainOption] = useState('new');
  const [domainName, setDomainName] = useState('');
  const [domainExt, setDomainExt] = useState('.com');
  const [notes, setNotes] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const mainRef = useRef(null);

  const theme = {
    bg: c?.bg || (isDark ? '#15161A' : '#f8f8f7'),
    card: c?.card || (isDark ? '#1C1E24' : '#fff'),
    panel: c?.panel2 || (isDark ? '#22252C' : '#f5f5f5'),
    border: c?.border || (isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)'),
    borderStrong: c?.borderStrong || (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'),
    hover: c?.hover || (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
    text: c?.text || (isDark ? '#fff' : '#1a1a1a'),
    subText: c?.subText || (isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.5)'),
    subTextMuted: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.35)',
    brand: c?.brand || '#E87B35',
    isDark
  };

  const brand = theme.brand;

  // ── Load Plans ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('hosting_plans')
          .select('*')
          .eq('is_active', true)
          .order('hosting_type')
          .order('plan_name');
        const plans = (!error && data && data.length > 0) ? data : DEFAULT_PLANS;
        setAllPlans(plans);
        const firstType = plans[0]?.hosting_type || null;
        setHostingType(firstType);
        const firstPlan = plans.find(p => p.hosting_type === firstType) || null;
        setSelectedPlanObj(firstPlan);
      } catch {
        setAllPlans(DEFAULT_PLANS);
        setHostingType('Shared Hosting');
        setSelectedPlanObj(DEFAULT_PLANS[0]);
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  const hostingTypes = [...new Set(allPlans.map(p => p.hosting_type))];
  const currentPlans = allPlans.filter(p => p.hosting_type === hostingType);

  const handleTypeSelect = (type) => {
    setHostingType(type);
    const first = allPlans.find(p => p.hosting_type === type);
    setSelectedPlanObj(first || null);
    setCurrentStep(2);
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlanObj(plan);
    setTimeout(() => setCurrentStep(3), 200);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      await assertPortalActionsAllowed();
      const customerId = await resolveCustomerId({
        customerId: user?.id,
        userId: authUser?.id,
        email: authUser?.email,
      });
      if (!customerId) throw new Error('Customer profile not found');

      const fullDomain = domainName.trim() + (domainOption === 'new' ? domainExt : '');
      const planLabel = `${hostingType} - ${selectedPlanObj?.plan_name || ''}`;
      
      let calculatedPrice = selectedPlanObj?.price_monthly;
      if (calculatedPrice != null) {
        if (billingPeriod === 'Yearly') {
          const discount = selectedPlanObj.discount_yearly || 0;
          calculatedPrice = selectedPlanObj.price_monthly * (1 - discount / 100);
        } else if (billingPeriod === '2 Years') {
          const discount = selectedPlanObj.discount_2years || 0;
          calculatedPrice = selectedPlanObj.price_monthly * (1 - discount / 100);
        }
      }
      
      const renewalPercentage = selectedPlanObj?.renewal_percentage || 0;
      const renewalPrice = calculatedPrice != null ? calculatedPrice * (1 + renewalPercentage / 100) : null;

      const priceInfo = calculatedPrice != null
        ? ` | Price: $${calculatedPrice.toFixed(2)}/mo`
        : '';
      const requestSummary = `${planLabel} | Billing: ${billingPeriod}${priceInfo} | Domain: ${fullDomain} | Notes: ${notes || 'None'}`;

      const { data: inserted, error: hostingError } = await supabase
        .from('hosting_requests')
        .insert([{
          customer_id: customerId,
          package_type: requestSummary,
          status: 'pending',
          auto_renew: autoRenew,
          created_at: new Date().toISOString(),
          price: calculatedPrice,
          currency: 'USD',
          billing_period: billingPeriod,
          domain: fullDomain,
          notes: notes || null,
          hosting_type: hostingType,
          plan_name: selectedPlanObj?.plan_name || null,
          renewal_percentage: renewalPercentage,
          next_renewal_price: autoRenew && renewalPrice ? renewalPrice : null,
        }])
        .select();

      if (hostingError) throw new Error(hostingError?.message || 'Failed to create hosting request');
      if (!inserted || inserted.length === 0) throw new Error('Request may have been blocked by RLS');

      await supabase.from('notifications').insert([{
        type: 'hosting_request',
        title: 'New Hosting Request',
        message: `Hosting requested: ${planLabel} (${billingPeriod}) for domain: ${fullDomain}`,
        customer_id: customerId,
        is_read: false,
        created_at: new Date().toISOString(),
      }]);

      setSubmitted(true);
      setCurrentStep(4);
      toast({ title: '🎉 Order Submitted!', description: 'Admin has been notified of your hosting order.' });
    } catch (err) {
      toast({ title: 'Error', description: err?.message || 'Failed to submit order.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Loading State ───────────────────────────────────────────────────────────
  if (loadingPlans) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: theme.isDark ? 'rgba(232,123,53,0.12)' : 'rgba(232,123,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={28} color={brand} className="animate-spin" />
        </div>
        <p style={{ color: theme.subText, fontSize: 13 }}>Loading hosting plans…</p>
      </div>
    );
  }

  // ── Success State ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: theme.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${theme.isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.2)'}` }}>
            <CheckCircle size={40} color="#22c55e" />
          </div>
          <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '1px solid rgba(34,197,94,0.12)', animation: 'ping 2s infinite' }} />
        </div>
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
          borderRadius: 12, padding: '6px 16px', fontSize: 12, fontWeight: 700,
          color: '#22c55e', marginBottom: 16, display: 'inline-block',
        }}>
          ORDER CONFIRMED
        </div>
        <h2 style={{ color: theme.text, fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Order Placed Successfully!</h2>
        <p style={{ color: theme.subText, fontSize: 14, maxWidth: 420, lineHeight: 1.7, marginBottom: 32 }}>
          Your order for <strong style={{ color: theme.text }}>{hostingType} – {selectedPlanObj?.plan_name}</strong> has been received.
          Our team will review and contact you shortly to finalize the setup.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={onSuccess}
            style={{
              padding: '12px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14,
              background: `linear-gradient(90deg,${theme.brand},#f59e0b)`, color: '#fff',
              border: 'none', cursor: 'pointer', boxShadow: `0 4px 20px ${theme.brand}40`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Server size={15} /> View My Hosting
          </button>
        </div>
      </div>
    );
  }

  // ── Section styling ─────────────────────────────────────────────────────────
  const sectionCard = {
    background: theme.isDark 
      ? 'linear-gradient(160deg,rgba(28,30,36,0.9),rgba(22,24,30,0.95))' 
      : 'linear-gradient(160deg,rgba(255,255,255,0.95),rgba(248,248,247,0.98))',
    border: `1px solid ${theme.border}`,
    borderRadius: 20, padding: '24px',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    boxShadow: theme.isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 4px 20px rgba(0,0,0,0.05)',
  };

  const inputStyle = {
    width: '100%', padding: '13px 16px', fontSize: 14,
    border: `1.5px solid ${theme.border}`, borderRadius: 12,
    background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
    color: theme.text, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 700, color: theme.subText,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.7,
  };

  const DOMAIN_EXTS = ['.com', '.net', '.org', '.io', '.co', '.lk'];

  return (
    <div ref={mainRef} style={{ maxWidth: 1140, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: theme.isDark ? 'linear-gradient(135deg,rgba(232,123,53,0.2),rgba(232,123,53,0.08))' : 'linear-gradient(135deg,rgba(232,123,53,0.1),rgba(232,123,53,0.04))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${theme.isDark ? 'rgba(232,123,53,0.2)' : 'rgba(232,123,53,0.15)'}`,
          }}>
            <Server size={18} color={brand} />
          </div>
          <div>
            <h1 style={{ color: theme.text, fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>Order New Hosting</h1>
            <p style={{ color: theme.subText, fontSize: 13, marginTop: 2 }}>
              Choose the <span style={{ color: brand, fontWeight: 600 }}>perfect hosting plan</span> for your needs.
            </p>
          </div>
        </div>
      </div>

      {/* Step Progress */}
      <StepProgress currentStep={currentStep} theme={theme} />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (steps 1–3) */}
        <div className="lg:col-span-2 lg:max-h-[calc(100vh-230px)] lg:overflow-y-auto lg:pr-2 no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 20, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          {/* ── STEP 1: Hosting Type ── */}
          <div style={sectionCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: currentStep >= 1 ? 'rgba(232,123,53,0.15)' : theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: currentStep >= 1 ? '1px solid rgba(232,123,53,0.3)' : 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: currentStep >= 1 ? brand : theme.subTextMuted }}>1</span>
              </div>
              <div>
                <p style={{ color: theme.text, fontWeight: 700, fontSize: 15 }}>Select Hosting Type</p>
                <p style={{ color: theme.subText, fontSize: 12 }}>Choose the type of hosting that works best for you.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {hostingTypes.map(type => (
                <HostingTypeCard
                  key={type}
                  type={type}
                  isSelected={hostingType === type}
                  onClick={() => handleTypeSelect(type)}
                  theme={theme}
                />
              ))}
            </div>
          </div>

          {/* ── STEP 2: Choose Plan ── */}
          <div style={{
            ...sectionCard,
            opacity: currentStep >= 2 ? 1 : 0.5,
            transition: 'opacity 0.3s',
            pointerEvents: currentStep >= 2 ? 'auto' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: currentStep >= 2 ? 'rgba(232,123,53,0.15)' : theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: currentStep >= 2 ? '1px solid rgba(232,123,53,0.3)' : 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: currentStep >= 2 ? brand : theme.subTextMuted }}>2</span>
              </div>
              <div>
                <p style={{ color: theme.text, fontWeight: 700, fontSize: 15 }}>Choose Your Plan</p>
                <p style={{ color: theme.subText, fontSize: 12 }}>Select a plan that fits your requirements.</p>
              </div>
              {/* Billing Period Toggle
              <div style={{ marginLeft: 'auto', display: 'flex', background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 3, border: `1px solid ${theme.border}` }}>
                {['Monthly', 'Yearly'].map(period => (
                  <button
                    key={period}
                    onClick={() => setBillingPeriod(period)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: billingPeriod === period ? brand : 'transparent',
                      color: billingPeriod === period ? '#fff' : theme.subText,
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    {period}
                    {period === 'Yearly' && <span style={{ marginLeft: 4, fontSize: 9, background: 'rgba(34,197,94,0.2)', color: '#22c55e', padding: '1px 5px', borderRadius: 4 }}>-20%</span>}
                  </button>
                ))}
              </div> */}
            </div>
            {currentPlans.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: theme.subTextMuted, fontSize: 13 }}>
                No plans available for this hosting type.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentPlans.map(plan => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isSelected={selectedPlanObj?.id === plan.id}
                    billingPeriod={billingPeriod}
                    onClick={() => handlePlanSelect(plan)}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── STEP 3: Configuration ── */}
          <div style={{
            ...sectionCard,
            opacity: currentStep >= 3 ? 1 : 0.5,
            transition: 'opacity 0.3s',
            pointerEvents: currentStep >= 3 ? 'auto' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: currentStep >= 3 ? 'rgba(232,123,53,0.15)' : theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: currentStep >= 3 ? '1px solid rgba(232,123,53,0.3)' : 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: currentStep >= 3 ? brand : theme.subTextMuted }}>3</span>
              </div>
              <div>
                <p style={{ color: theme.text, fontWeight: 700, fontSize: 15 }}>Configuration</p>
                <p style={{ color: theme.subText, fontSize: 12 }}>Customize your hosting settings.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Billing Period select */}
              <div>
                <label style={labelStyle}>Billing Period</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={billingPeriod}
                    onChange={e => setBillingPeriod(e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      paddingRight: 40,
                      cursor: 'pointer',
                      background: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.card,
                    }}
                    onFocus={e => e.target.style.borderColor = brand}
                    onBlur={e => e.target.style.borderColor = theme.border}
                  >
                    <option value="Monthly" style={{ background: theme.card, color: theme.text }}>Monthly</option>
                    <option value="Yearly" style={{ background: theme.card, color: theme.text }}>
                      Yearly {selectedPlanObj?.discount_yearly ? `— ${selectedPlanObj.discount_yearly}% Off` : '— Best Value'}
                    </option>
                    <option value="2 Years" style={{ background: theme.card, color: theme.text }}>
                      2 Years {selectedPlanObj?.discount_2years ? `— ${selectedPlanObj.discount_2years}% Off` : ''}
                    </option>
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: theme.subText, pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Auto Renewal Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', padding: '16px 18px', background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 14, border: `1px solid ${theme.border}` }}>
                <div>
                  <p style={{ color: theme.text, fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Enable Auto Renewal</p>
                  <p style={{ color: theme.subText, fontSize: 12 }}>Automatically renew to avoid service interruption.</p>
                </div>
                <ToggleSwitch value={autoRenew} onChange={setAutoRenew} theme={theme} />
              </div>

              {/* Domain Name */}
              <div>
                <label style={labelStyle}>Domain Name</label>
                {/* Domain option tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[
                    { key: 'new', label: 'New Domain', icon: Sparkles },
                    { key: 'existing', label: 'Existing Domain', icon: Globe },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDomainOption(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: domainOption === key ? 'rgba(232,123,53,0.15)' : theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        color: domainOption === key ? brand : theme.subText,
                        border: `1.5px solid ${domainOption === key ? 'rgba(232,123,53,0.4)' : theme.border}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                </div>
                {/* Domain Input + Extension */}
                <div style={{ display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${theme.border}`, background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                  <input
                    type="text"
                    value={domainName}
                    onChange={e => setDomainName(e.target.value.replace(/\s/g, '').toLowerCase())}
                    style={{ flex: 1, padding: '13px 16px', fontSize: 14, border: 'none', background: 'transparent', color: theme.text, outline: 'none', fontFamily: 'inherit' }}
                    placeholder={domainOption === 'new' ? 'yourdomain' : 'yourdomain.com'}
                    onFocus={e => e.currentTarget.closest('div').style.borderColor = brand}
                    onBlur={e => e.currentTarget.closest('div').style.borderColor = theme.border}
                  />
                  {domainOption === 'new' && (
                    <div style={{ position: 'relative', borderLeft: `1px solid ${theme.border}` }}>
                      <select
                        value={domainExt}
                        onChange={e => setDomainExt(e.target.value)}
                        style={{
                          height: '100%',
                          padding: '0 32px 0 12px',
                          fontSize: 13,
                          fontWeight: 700,
                          border: 'none',
                          background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: theme.brand,
                          outline: 'none',
                          cursor: 'pointer',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          fontFamily: 'inherit'
                        }}
                      >
                        {DOMAIN_EXTS.map(ext => (
                          <option key={ext} value={ext} style={{ background: theme.card, color: theme.text }}>
                            {ext}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: brand, pointerEvents: 'none' }} />
                    </div>
                  )}
                </div>
                {domainOption === 'new' && domainName && (
                  <p style={{ color: theme.subTextMuted, fontSize: 12, marginTop: 6 }}>
                    Your domain will be: <span style={{ color: brand, fontWeight: 600 }}>{domainName}{domainExt}</span>
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes <span style={{ color: theme.subTextMuted, textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(Optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ ...inputStyle, height: 90, resize: 'vertical', lineHeight: 1.6 }}
                  placeholder="Any specific requirements, preferred server location, or additional notes…"
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = theme.border}
                />
              </div>
            </div>
          </div>

          {/* Mobile Submit (visible only on mobile) */}
          <div className="lg:hidden" style={{ marginTop: 4 }}>
            <button
              onClick={handleSubmit}
              disabled={loading || !domainName.trim() || !selectedPlanObj}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
                background: loading || !domainName.trim() || !selectedPlanObj ? 'rgba(255,255,255,0.08)' : `linear-gradient(90deg,${theme.brand},#f59e0b)`,
                color: loading || !domainName.trim() || !selectedPlanObj ? 'rgba(255,255,255,0.3)' : '#fff',
                fontWeight: 700, fontSize: 15, cursor: loading || !domainName.trim() || !selectedPlanObj ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: !loading && domainName.trim() && selectedPlanObj ? `0 4px 20px ${theme.brand}40` : 'none',
              }}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Loader2 size={16} className="animate-spin" /> Processing…
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Lock size={15} /> Submit Order
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Right Column: Sticky Order Summary ── */}
        <div className="hidden lg:block">
          <div style={{ position: 'sticky', top: 24 }}>
            <OrderSummaryPanel
              hostingType={hostingType}
              selectedPlan={selectedPlanObj}
              billingPeriod={billingPeriod}
              autoRenew={autoRenew}
              domainName={domainName.trim() ? (domainOption === 'new' ? domainName + domainExt : domainName) : ''}
              notes={notes}
              onSubmit={handleSubmit}
              loading={loading}
              theme={theme}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewHostingOrderPage;
