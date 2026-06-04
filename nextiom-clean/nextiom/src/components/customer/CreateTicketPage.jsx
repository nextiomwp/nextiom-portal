import React, { useState } from 'react';
import {
  Send, Ticket, CheckCircle, ChevronRight, AlertCircle, LockKeyhole, Globe, Mail,
  ArrowLeftRight, CreditCard, BriefcaseBusiness, Package, Paintbrush, Puzzle,
  Phone, Headphones, ReceiptText, CircleX, Info,
} from 'lucide-react';
import { createTicket, addTicketMessage, addNotification, assertPortalActionsAllowed } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const QUICK_ACTION_ROWS = [
  [
    { label: 'Hosting', icon: AlertCircle, color: '#facc15', width: 82 },
    { label: 'WordPress', monogram: 'W', color: '#3b82f6', width: 96 },
    { label: 'SSL', icon: LockKeyhole, color: '#facc15', width: 72 },
    { label: 'Domain', icon: Globe, color: '#3b82f6', width: 82 },
    { label: 'Email', icon: Mail, color: '#c026d3', width: 76 },
    { label: 'Migration', icon: ArrowLeftRight, color: '#3b82f6', width: 94 },
    { label: 'Payment Gateway', icon: CreditCard, color: '#22c55e', width: 132 },
    { label: 'Business Registration', icon: BriefcaseBusiness, color: '#f59e0b', width: 164 },
  ],
  [
    { label: 'Products', icon: Package, color: '#c026d3', width: 122 },
    { label: 'Theme', icon: Paintbrush, color: '#14b8a6', width: 114 },
    { label: 'Plugin', icon: Puzzle, color: '#3b82f6', width: 112 },
    { label: 'Virtual Number', icon: Phone, color: '#22c55e', width: 150 },
    { label: 'Technical Support', icon: Headphones, color: '#14b8a6', width: 168 },
  ],
  [
    { label: 'Service Request', icon: Headphones, color: '#f97316', width: 158 },
    { label: 'Refund Request', icon: ReceiptText, color: '#f43f5e', width: 158 },
    { label: 'Cancelations', icon: CircleX, color: '#ef4444', width: 146 },
    { label: 'Other / General', icon: Info, color: '#facc15', width: 160 },
  ],
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
        .ticket-quick-action-row {
          display: flex;
          justify-content: flex-start;
          gap: 6px;
        }
        .ticket-quick-action-button {
          min-width: 0;
          border-radius: 8px;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
        }
        .ticket-quick-action-button:hover {
          transform: translateY(-1px);
        }
        .ticket-quick-action-button.top {
          min-height: 82px;
          padding: 10px 5px 9px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }
        .ticket-quick-action-button.middle,
        .ticket-quick-action-button.bottom {
          min-height: 62px;
          padding: 10px 11px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
        }
        .ticket-quick-action-button.middle {
          flex: 0 0 auto;
        }
        .ticket-quick-action-button.bottom {
          flex: 0 0 auto;
        }
        .ticket-quick-action-label {
          color: inherit;
          font-size: 11.5px;
          font-weight: 750;
          line-height: 1.18;
          text-align: center;
          overflow-wrap: normal;
          white-space: nowrap;
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
        @media (max-width: 760px) {
          .ticket-quick-actions {
            gap: 12px;
          }
          .ticket-quick-action-row {
            flex-wrap: wrap;
            gap: 10px;
          }
          .ticket-quick-action-button.top,
          .ticket-quick-action-button.middle,
          .ticket-quick-action-button.bottom {
            flex: 1 1 calc(50% - 10px);
            max-width: none;
            min-height: 92px;
            padding: 16px 14px;
            flex-direction: row;
            gap: 12px;
          }
          .ticket-quick-action-label {
            font-size: 13.5px;
            text-align: left;
            white-space: normal;
          }
        }
        @media (max-width: 460px) {
          .ticket-quick-action-button.top,
          .ticket-quick-action-button.middle,
          .ticket-quick-action-button.bottom {
            flex-basis: 100%;
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
          <div className="ticket-quick-actions">
            {QUICK_ACTION_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="ticket-quick-action-row">
                {row.map(action => {
                  const Icon = action.icon;
                  const actionSubject = buildActionTemplate(action.label).subject;
                  const active = subject === actionSubject;

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => applyAction(action)}
                      className={`ticket-quick-action-button ${rowIndex === 0 ? 'top' : rowIndex === 1 ? 'middle' : 'bottom'}`}
                      style={{
                        flexBasis: action.width,
                        border: `1.5px solid ${active ? action.color : c.borderStrong || c.border}`,
                        background: active
                          ? (isDark ? `${action.color}1f` : `${action.color}12`)
                          : (isDark ? 'rgba(255,255,255,0.015)' : c.panel2),
                        color: c.text,
                        boxShadow: active ? `0 0 0 1px ${action.color}22` : 'none',
                      }}
                      aria-pressed={active}
                    >
                      <span style={{ width: rowIndex === 0 ? 26 : 24, height: rowIndex === 0 ? 26 : 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {Icon ? (
                          <Icon size={rowIndex === 0 ? 24 : 22} strokeWidth={2.1} style={{ color: action.color }} />
                        ) : (
                          <span
                            style={{
                              width: rowIndex === 0 ? 24 : 22,
                              height: rowIndex === 0 ? 24 : 22,
                              border: `2px solid ${action.color}`,
                              borderRadius: '50%',
                              color: action.color,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: rowIndex === 0 ? 16 : 14,
                              fontWeight: 800,
                              lineHeight: 1,
                              fontFamily: 'Georgia, serif',
                            }}
                          >
                            {action.monogram}
                          </span>
                        )}
                      </span>
                      <span className="ticket-quick-action-label">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
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

          <div style={{ padding: '12px 14px', background: isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.12)'}` }}>
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
