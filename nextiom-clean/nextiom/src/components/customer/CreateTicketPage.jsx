import React, { useState } from 'react';
import { Send, Ticket, CheckCircle, ChevronRight, Lightbulb } from 'lucide-react';
import { createTicket, addTicketMessage, addNotification, assertPortalActionsAllowed } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const SUGGESTIONS = [
  {
    label: 'Hosting Down',
    subject: 'My hosting / website is down',
    message: 'My website is currently not loading or accessible. The issue started around [time]. Please investigate and restore service as soon as possible.\n\nAffected domain/URL: \nError message (if any): ',
  },
  {
    label: 'cPanel Credentials',
    subject: 'Request for cPanel login credentials',
    message: 'I need my cPanel login credentials for the following hosting package:\n\nDomain: \nHosting plan: \n\nPlease send the credentials to my registered email or provide them securely.',
  },
  {
    label: 'Domain Transfer',
    subject: 'Domain transfer request',
    message: 'I would like to initiate a transfer for the following domain:\n\nDomain name: \nTransfer to (registrar): \nAdditional notes: ',
  },
  {
    label: 'DNS Change',
    subject: 'DNS record update request',
    message: 'I need to update the DNS records for my domain. Please make the following changes:\n\nDomain: \nRecord type (A / CNAME / MX / TXT): \nName: \nValue/Points to: \nTTL (if applicable): ',
  },
  {
    label: 'SSL Issue',
    subject: 'SSL certificate issue on my domain',
    message: 'My website is showing an SSL/HTTPS error. Details:\n\nDomain: \nBrowser error message: \nWhen did it start: \n\nPlease check and renew/fix the SSL certificate.',
  },
  {
    label: 'Billing Query',
    subject: 'Billing / invoice query',
    message: 'I have a question regarding a charge or invoice on my account:\n\nInvoice/reference number (if available): \nAmount in question: \nQuestion or concern: ',
  },
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

  const applySuggestion = (s) => {
    setSubject(s.subject);
    setMessage(s.message);
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
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Create Support Ticket</h1>
        <p style={{ fontSize: 13, color: c.subText, marginTop: 4 }}>Describe your issue and our team will get back to you</p>
      </div>

      {/* Suggestion chips */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Lightbulb size={13} style={{ color: c.brand }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Quick Suggestions
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s.label}
              type="button"
              onClick={() => applySuggestion(s)}
              style={{
                padding: '6px 13px',
                border: `1.5px solid ${subject === s.subject ? c.brand : c.border}`,
                borderRadius: 20,
                background: subject === s.subject
                  ? (isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.08)')
                  : 'transparent',
                color: subject === s.subject ? c.brand : c.subText,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={cardS}>
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
  );
}
