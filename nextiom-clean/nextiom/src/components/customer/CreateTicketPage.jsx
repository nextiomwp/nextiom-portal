import React, { useState } from 'react';
import {
  Send, Ticket, CheckCircle, ChevronRight, AlertCircle, LockKeyhole, Globe, Mail,
  ArrowLeftRight, CreditCard, BriefcaseBusiness, Package, Paintbrush, Puzzle,
  Phone, Headphones, ReceiptText, CircleX, Info, Wrench, Monitor, Smartphone,
  Server, Database, ShieldAlert, Code, Share2, UserX, ShieldCheck, BadgeCheck, Trash2,
  TrendingUp, Search, BarChart3, Gauge, MessageSquare,
} from 'lucide-react';
import { createTicket, addTicketMessage, addNotification, assertPortalActionsAllowed } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const QUICK_ACTION_CATEGORIES = [
  {
    id: 'hosting',
    title: 'Hosting & Servers',
    desc: 'Server, hosting, SSL & migration',
    icon: Server,
    color: '#FFA95C',
    actions: [
      { label: 'Hosting', icon: Server },
      { label: 'VPS', icon: Database },
      { label: 'SSL', icon: LockKeyhole },
      { label: 'Migration', icon: ArrowLeftRight },
    ]
  },
  {
    id: 'website',
    title: 'Website & WordPress',
    desc: 'Website, WordPress & related tools',
    icon: Monitor,
    color: '#FFB27F',
    actions: [
      { label: 'Website', icon: Monitor },
      { label: 'WordPress', monogram: 'W' },
      { label: 'Plugin', icon: Puzzle },
      { label: 'Theme', icon: Paintbrush },
    ]
  },
  {
    id: 'domains',
    title: 'Domains & Email',
    desc: 'Domain, email & communication',
    icon: Globe,
    color: '#FFC067',
    actions: [
      { label: 'Domain', icon: Globe },
      { label: 'Email', icon: Mail },
      { label: 'DNS Issues', icon: ShieldAlert },
    ]
  },
  {
    id: 'seo_analytics',
    title: 'SEO & Analytics',
    desc: 'SEO, analytics & performance',
    icon: TrendingUp,
    color: '#E2725B',
    actions: [
      { label: 'SEO Support', icon: Search },
      { label: 'Analytics Setup', icon: BarChart3 },
      { label: 'Search Console', monogram: 'G' },
      { label: 'Site Speed', icon: Gauge },
    ]
  },
  {
    id: 'social_media',
    title: 'Social Media Support',
    desc: 'Social media account & platform support',
    icon: MessageSquare,
    color: '#FF7F50',
    actions: [
      { label: 'Fake Account Removal', icon: UserX },
      { label: 'Hacked Account Recovery', icon: ShieldCheck },
      { label: 'Account Verification', icon: BadgeCheck },
      { label: 'Content Removal', icon: Trash2 },
    ]
  },
  {
    id: 'business',
    title: 'Business Services',
    desc: 'Business & professional services',
    icon: BriefcaseBusiness,
    color: '#FFB343',
    actions: [
      { label: 'Business Registration', icon: BriefcaseBusiness },
      { label: 'Payment Gateway', icon: CreditCard },
      { label: 'Virtual Number', icon: Phone },
    ]
  },
  {
    id: 'billing',
    title: 'Billing & Requests',
    desc: 'Billing, requests & account related',
    icon: ReceiptText,
    color: '#8E5103',
    actions: [
      { label: 'Service Request', icon: Wrench },
      { label: 'Refund Request', icon: ReceiptText },
      { label: 'Cancellation', icon: CircleX },
      { label: 'General Inquiry', icon: Info },
    ]
  },
  {
    id: 'development',
    title: 'Development & Apps',
    desc: 'Apps, development & technical help',
    icon: Code,
    color: '#FFA500',
    actions: [
      { label: 'App', icon: Smartphone },
      { label: 'Custom Development', icon: Code },
    ]
  },
  {
    id: 'tech_support',
    title: 'Technical Support',
    desc: 'General technical issues & troubleshooting',
    icon: Headphones,
    color: '#E87B35',
    isSpecial: true,
    gridSpan: 'span 6',
  }
];

export default function CreateTicketPage({ user, isDark, c, onNavigate }) {
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const inp = {
    width: '100%',
    padding: '10px 13px',
    border: `1.5px solid ${c.border}`,
    borderRadius: 10,
    background: isDark ? '#22252C' : '#f5f5f5',
    color: c.text,
    fontSize: 13.5,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  const labelS = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: c.subText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  };

  const cardS = {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.25)' : '0 2px 16px rgba(0,0,0,0.06)',
  };

  const buildActionTemplate = (label) => ({
    subject: `${label} support request`,
    message: `I need help with ${label}.\n\nPlease include details below:`,
  });

  const applyAction = (action) => {
    const template = buildActionTemplate(action.label);
    setSubject(template.subject);
    setMessage(template.message);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    try {
      await assertPortalActionsAllowed();
      if (!subject.trim() || !message.trim()) {
        toast({ title: 'Required', description: 'Please fill in all fields.', variant: 'destructive' });
        return;
      }
      const ticket = await createTicket(user.id, subject.trim(), priority);
      await addTicketMessage(ticket.id, 'customer', message.trim());
      await addNotification({
        customer_id: null,
        type: 'ticket',
        title: 'New support ticket',
        message: `${user.name || user.email} opened a ticket: ${subject.trim()}`,
      });
      setDone(true);
    } catch (err) {
      toast({ title: 'Failed to submit ticket', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ ...cardS, padding: 40, textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} style={{ color: '#22c55e' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: c.text, marginBottom: 8 }}>Ticket Submitted!</h2>
          <p style={{ fontSize: 13, color: c.subText, marginBottom: 28, lineHeight: 1.6 }}>
            Your support ticket has been received. Our team will respond as soon as possible. You'll see a notification when we reply.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => { setDone(false); setSubject(''); setMessage(''); setPriority('normal'); }}
              style={{ padding: '10px 20px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
            >
              New Ticket
            </button>
            <button
              onClick={() => onNavigate && onNavigate('support_tickets')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: c.brand, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
            >
              View My Tickets <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto' }}>
      <style>{`
        .ticket-quick-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ticket-create-layout {
          display: flex;
          align-items: flex-start;
          gap: 20px;
        }
        .ticket-actions-card {
          flex: 1 1 auto;
          min-width: 0;
        }
        .ticket-form-card {
          flex: 0 0 430px;
          max-width: 430px;
        }
        .ticket-special-card:hover {
          transform: translateY(-1px);
        }
        .ticket-categories-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }
        .ticket-category-card {
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.015);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ticket-category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }
        .ticket-category-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ticket-category-icon-wrapper {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ticket-category-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ticket-category-title {
          font-size: 13.5px;
          font-weight: 750;
          line-height: 1.2;
        }
        .ticket-category-desc {
          font-size: 11px;
          opacity: 0.65;
          line-height: 1.1;
        }
        .ticket-category-chevron {
          opacity: 0.4;
          transition: opacity 0.15s;
        }
        .ticket-category-card:hover .ticket-category-chevron {
          opacity: 0.8;
        }
        .ticket-category-actions-grid {
          display: grid;
          gap: 10px;
          padding: 14px;
        }
        .actions-grid-4col {
          grid-template-columns: repeat(4, 1fr);
        }
        .actions-grid-3col {
          grid-template-columns: repeat(3, 1fr);
        }
        .actions-grid-2col {
          grid-template-columns: repeat(2, 1fr);
        }
        .actions-grid-1col {
          grid-template-columns: repeat(1, 1fr);
        }
        @media (max-width: 1300px) {
          .actions-grid-4col {
            grid-template-columns: repeat(2, 1fr);
          }
          .actions-grid-3col {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .ticket-category-action-button {
          min-width: 0;
          min-height: 82px;
          padding: 12px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 10px;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }
        .ticket-category-action-button:hover {
          transform: translateY(-1px);
        }
        .ticket-category-action-label {
          font-size: 12px;
          font-weight: 750;
          line-height: 1.25;
          text-align: center;
          overflow-wrap: break-word;
          white-space: normal;
        }
        @media (max-width: 1220px) {
          .ticket-create-layout {
            flex-direction: column;
          }
          .ticket-actions-card,
          .ticket-form-card {
            width: 100%;
            max-width: none;
            flex-basis: auto;
          }
        }
        @media (max-width: 900px) {
          .ticket-categories-grid {
            grid-template-columns: 1fr;
          }
          .ticket-category-card, .ticket-special-card {
            grid-column: span 1 !important;
          }
        }
        @media (max-width: 760px) {
          .ticket-category-actions-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px;
          }
          .ticket-category-action-button {
            min-height: 72px;
            padding: 12px 14px;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            gap: 12px;
          }
          .ticket-category-action-label {
            font-size: 12.5px;
            text-align: left;
          }
        }
      `}</style>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Create Ticket</h1>
        <p style={{ fontSize: 13, color: c.subText, marginTop: 4 }}>Describe your issue and our team will get back to you</p>
      </div>

      <div className="ticket-create-layout">
        <div className="ticket-actions-card" style={{ ...cardS, padding: 18 }}>
          <div style={{ borderBottom: `1px solid ${c.border}`, paddingBottom: 14, marginBottom: 18 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Quick Actions
            </span>
          </div>
          <div className="ticket-categories-grid">
            {QUICK_ACTION_CATEGORIES.map((cat, index) => {
              const HeaderIcon = cat.icon;
              const hasActiveAction = !cat.isSpecial && cat.actions.some(action => {
                const actionSubject = buildActionTemplate(action.label).subject;
                return subject === actionSubject;
              });

              if (cat.isSpecial) {
                const active = subject === 'Technical Support support request';
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => applyAction({ label: 'Technical Support' })}
                    className="ticket-category-card ticket-special-card"
                    style={{
                      gridColumn: cat.gridSpan || 'span 3',
                      border: `1px solid ${active ? cat.color : (isDark ? `${cat.color}25` : `${cat.color}1c`)}`,
                      boxShadow: active ? `0 0 14px ${cat.color}1a` : 'none',
                      background: c.card,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      minHeight: 110,
                      cursor: 'pointer',
                      textAlign: 'center',
                      gap: 8,
                      transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                    }}
                  >
                    <Headphones size={36} style={{ color: cat.color }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: cat.color }}>Technical Support</span>
                    </div>
                  </button>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="ticket-category-card"
                  style={{
                    gridColumn: cat.gridSpan || 'span 3',
                    border: cat.noOutlineAndInnerColor
                      ? '1px solid transparent'
                      : `1px solid ${hasActiveAction ? cat.color : (isDark ? `${cat.color}25` : `${cat.color}1c`)}`,
                    boxShadow: cat.noOutlineAndInnerColor
                      ? 'none'
                      : (hasActiveAction ? `0 0 14px ${cat.color}1a` : 'none'),
                    background: cat.noOutlineAndInnerColor ? 'transparent' : c.card,
                  }}
                >
                  <div
                    className="ticket-category-header"
                    style={{
                      borderBottom: cat.noOutlineAndInnerColor
                        ? '1px solid transparent'
                        : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      background: cat.noOutlineAndInnerColor
                        ? 'transparent'
                        : (isDark
                          ? `linear-gradient(135deg, ${cat.color}15, transparent)`
                          : `linear-gradient(135deg, ${cat.color}08, transparent)`),
                    }}
                  >
                    <div className="ticket-category-header-left">
                      <div
                        className="ticket-category-icon-wrapper"
                        style={{
                          background: `${cat.color}1a`,
                        }}
                      >
                        <HeaderIcon size={20} style={{ color: cat.color }} />
                      </div>
                      <div className="ticket-category-info">
                        <span className="ticket-category-title" style={{ color: c.text }}>{cat.title}</span>
                        <span className="ticket-category-desc" style={{ color: c.subText }}>{cat.desc}</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="ticket-category-chevron" style={{ color: c.subText }} />
                  </div>

                  <div
                    className={`ticket-category-actions-grid ${
                      cat.id === 'billing' ? 'actions-grid-2col' :
                      cat.id === 'development' ? 'actions-grid-1col' :
                      cat.actions.length === 4 ? 'actions-grid-4col' :
                      cat.actions.length === 3 ? 'actions-grid-3col' :
                      'actions-grid-2col'
                    }`}
                  >
                    {cat.actions.map(action => {
                      const Icon = action.icon;
                      const actionSubject = buildActionTemplate(action.label).subject;
                      const active = subject === actionSubject;

                      return (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => applyAction(action)}
                          className="ticket-category-action-button"
                          style={{
                            border: cat.noOutlineAndInnerColor
                              ? '1.5px solid transparent'
                              : `1.5px solid ${active ? cat.color : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)')}`,
                            background: cat.noOutlineAndInnerColor
                              ? (active ? (isDark ? `${cat.color}12` : `${cat.color}08`) : 'transparent')
                              : (active
                                ? (isDark ? `${cat.color}1f` : `${cat.color}12`)
                                : (isDark ? 'rgba(255, 255, 255, 0.015)' : c.panel2)),
                            color: active ? cat.color : c.text,
                          }}
                        >
                          <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 4 }}>
                            {action.image ? (
                              <img src={action.image} alt={action.label} style={{ width: 22, height: 22, objectFit: 'contain' }} />
                            ) : Icon ? (
                              <Icon size={22} strokeWidth={2} style={{ color: active ? cat.color : (isDark ? `${cat.color}cc` : cat.color) }} />
                            ) : (
                              <span
                                style={{
                                  width: 22,
                                  height: 22,
                                  border: `2.5px solid ${active ? cat.color : (isDark ? `${cat.color}cc` : cat.color)}`,
                                  borderRadius: '50%',
                                  color: active ? cat.color : (isDark ? `${cat.color}cc` : cat.color),
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  fontWeight: 900,
                                  lineHeight: 1,
                                  fontFamily: 'Georgia, serif',
                                }}
                              >
                                {action.monogram}
                              </span>
                            )}
                          </span>
                          <span className="ticket-category-action-label" style={{ color: active ? cat.color : c.text }}>
                            {action.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      <div className="ticket-form-card" style={cardS}>
        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: c.brand }} />
          <Ticket size={15} style={{ color: c.brand }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>New Ticket</span>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelS}>Subject</label>
            <input
              style={inp}
              placeholder="Briefly describe your issue"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              onFocus={e => e.target.style.borderColor = c.brand}
              onBlur={e => e.target.style.borderColor = c.border}
            />
          </div>

          <div>
            <label style={labelS}>Priority</label>
            <select
              style={{ ...inp, appearance: 'none', cursor: 'pointer' }}
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              <option value="low">Low — General inquiry</option>
              <option value="normal">Normal — Something not working</option>
              <option value="high">High — Urgent / Service down</option>
            </select>
          </div>

          <div>
            <label style={labelS}>Message</label>
            <textarea
              style={{ ...inp, minHeight: 160, resize: 'vertical', lineHeight: 1.6 }}
              placeholder="Describe your issue in detail. Include any error messages or steps to reproduce."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              onFocus={e => e.target.style.borderColor = c.brand}
              onBlur={e => e.target.style.borderColor = c.border}
            />
          </div>

          <div style={{ padding: '12px 14px', background: isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)', borderRadius: 10, border: `1px solid ${isDark ? 'var(--brand-color-light)' : 'rgba(232,123,53,0.12)'}` }}>
            <p style={{ fontSize: 12, color: c.subText, margin: 0, lineHeight: 1.5 }}>
              Your ticket will be sent to our support team. You will receive notifications when we respond. Please do not share passwords in your ticket.
            </p>
          </div>

          <button
            type="submit"
            disabled={sending}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, border: 'none', background: c.brand, color: '#fff', fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            <Send size={15} /> {sending ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
