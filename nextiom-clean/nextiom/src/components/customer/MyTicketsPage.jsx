import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Send, RefreshCw, MessageSquare, ChevronRight, Clock, CheckCircle, X, Edit3, Link2 } from 'lucide-react';
import { getTicketsByCustomer, getTicketMessages, addTicketMessage, addNotification, editTicketMessage } from '@/lib/storage';
import LinkPreviewCard from '@/components/shared/LinkPreviewCard';
import { extractUrls } from '@/lib/linkPreview';
import { useToast } from '@/components/ui/use-toast';

const PRIORITY_CFG = {
  low:    { label: 'Low',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  normal: { label: 'Normal', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  high:   { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function hasAdminReply(ticket) {
  return (ticket.ticket_messages || []).filter(m => !m.is_deleted).some(m => m.sender_role === 'admin');
}

export default function MyTicketsPage({ user, isDark, c, onNavigate }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });
  const chatEndRef = useRef(null);
  const replyRef = useRef(null);
  const { toast } = useToast();

  const customerId = user?.id;

  useEffect(() => { if (customerId) load(); }, [customerId]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const onChange = (e) => setIsMobile(e.matches);
    onChange(media);
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  async function load() {
    setLoading(true);
    try { setTickets(await getTicketsByCustomer(customerId)); }
    catch { toast({ title: 'Failed to load tickets', variant: 'destructive' }); }
    finally { setLoading(false); }
  }

  async function openTicket(ticket) {
    setSelected(ticket);
    setMsgLoading(true);
    setMessages([]);
    try {
      const msgs = await getTicketMessages(ticket.id);
      setMessages(msgs);
    } catch {}
    finally { setMsgLoading(false); }
  }

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const msg = await addTicketMessage(selected.id, 'customer', reply.trim());
      setMessages(m => [...m, msg]);
      setReply('');
      await addNotification({
        customer_id: null,
        type: 'ticket',
        title: 'Customer ticket reply',
        message: `${user.name || user.email} replied to ticket: ${selected.subject}`,
      });
      setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, updated_at: new Date().toISOString(), ticket_messages: [...(t.ticket_messages || []), msg] } : t));
    } catch { toast({ title: 'Failed to send message', variant: 'destructive' }); }
    finally { setSending(false); }
  }

  async function handleEditMessage(msg) {
    setEditingMsgId(msg.id);
    setEditText(msg.message);
  }

  async function handleSaveEdit() {
    if (!editText.trim() || !editingMsgId) return;
    try {
      const updated = await editTicketMessage(editingMsgId, editText.trim());
      setMessages(m => m.map(msg => msg.id === editingMsgId ? updated : msg));
      setEditingMsgId(null);
      setEditText('');
      toast({ title: 'Message edited' });
    } catch {
      toast({ title: 'Failed to edit message', variant: 'destructive' });
    }
  }

  function handleInsertLink() {
    if (!linkUrl.trim() || !linkText.trim()) return;
    const insertion = `\n\n[${linkText.trim()}](${linkUrl.trim()})`;
    const textarea = replyRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = reply.slice(0, start);
      const after = reply.slice(end);
      setReply(before + insertion + after);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
      }, 0);
    } else {
      setReply(r => r + (r ? '\n' : '') + insertion);
    }
    setLinkUrl('');
    setLinkText('');
    setShowLinkDialog(false);
  }

  function renderMessageText(text, isOnBrand) {
    const parts = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIdx = 0;
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(<span key={`t${lastIdx}`} style={{ wordBreak: 'break-word' }}>{text.slice(lastIdx, match.index)}</span>);
      }
      parts.push(
        <a key={`l${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer"
           style={{ color: isOnBrand ? '#b3d9ff' : '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}>
          {match[1]}
        </a>
      );
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      parts.push(<span key={`t${lastIdx}`} style={{ wordBreak: 'break-word' }}>{text.slice(lastIdx)}</span>);
    }
    return parts.length > 0 ? parts : text;
  }

  const inp = {
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const cardS = {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.25)' : '0 2px 16px rgba(0,0,0,0.06)',
  };

  const showList = !isMobile || !selected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>My Tickets</h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 4 }}>Track and communicate with our support team</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 9, cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={() => onNavigate && onNavigate('support_create')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: c.brand, color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            <Ticket size={13} /> New Ticket
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 76, borderRadius: 12, background: c.hover }} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ ...cardS, padding: 60, textAlign: 'center' }}>
          <MessageSquare size={40} style={{ margin: '0 auto 14px', opacity: 0.2, display: 'block', color: c.text }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: c.text, marginBottom: 6 }}>No tickets yet</p>
          <p style={{ fontSize: 13, color: c.subText, marginBottom: 22 }}>Create your first support ticket to get help from our team.</p>
          <button onClick={() => onNavigate && onNavigate('support_create')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: c.brand, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            <Ticket size={14} /> Create Ticket
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (selected ? '340px 1fr' : '1fr'), gap: 16, alignItems: 'start' }}>
          {/* Ticket list */}
          <div style={{ ...cardS, display: showList ? 'block' : 'none' }}>
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 8, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <Ticket size={14} style={{ color: c.brand }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>All Tickets</span>
              <span style={{ fontSize: 11, color: c.subText, background: c.hover, borderRadius: 10, padding: '1px 7px' }}>{tickets.length}</span>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: isMobile ? 'none' : (selected ? 'calc(100vh - 260px)' : 'auto') }}>
              {tickets.map(ticket => {
                const adminReplied = hasAdminReply(ticket);
                const isOpen = ticket.status === 'open';
                const isActive = selected?.id === ticket.id;
                const pCfg = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.normal;
                const visibleMsgs = (ticket.ticket_messages || []).filter(m => !m.is_deleted);
                const lastMsg = visibleMsgs.slice(-1)[0];

                return (
                  <div
                    key={ticket.id}
                    onClick={() => openTicket(ticket)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: `1px solid ${c.border}`,
                      cursor: 'pointer',
                      background: isActive
                        ? (isDark ? 'rgba(232,123,53,0.10)' : 'rgba(232,123,53,0.07)')
                        : (adminReplied && !isActive)
                          ? (isDark ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.03)')
                          : 'transparent',
                      borderLeft: isActive ? `3px solid ${c.brand}` : `3px solid ${adminReplied && isOpen ? '#22c55e' : 'transparent'}`,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = c.hover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? (isDark ? 'rgba(232,123,53,0.10)' : 'rgba(232,123,53,0.07)') : adminReplied ? (isDark ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.03)') : 'transparent'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: adminReplied ? 600 : 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ticket.subject}</span>
                      <span style={{ fontSize: 10, color: c.subText, flexShrink: 0, marginLeft: 8 }}>{fmtTime(ticket.updated_at)}</span>
                    </div>
                    {lastMsg && (
                      <p style={{ fontSize: 11, color: c.subText, margin: '0 0 7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastMsg.sender_role === 'admin' ? '↩ Admin: ' : 'You: '}{lastMsg.message}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: isOpen ? c.brand : c.subText, background: isOpen ? `rgba(232,123,53,0.12)` : c.hover, padding: '1px 7px', borderRadius: 10 }}>
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: pCfg.color, background: pCfg.bg, padding: '1px 7px', borderRadius: 10 }}>{pCfg.label}</span>
                      {adminReplied && isOpen && (
                        <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <CheckCircle size={10} /> Admin replied
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat panel */}
          {selected && (
            <div style={{ ...cardS, display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : 'calc(100vh - 240px)', minHeight: 400 }}>
              {/* Header */}
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 12, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', flexShrink: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.subject}</div>
                  <div style={{ fontSize: 11, color: c.subText }}>
                    <span style={{ fontWeight: 600, color: selected.status === 'open' ? c.brand : c.subText }}>{selected.status === 'open' ? 'Open' : 'Closed'}</span>
                    {' · '}
                    {(PRIORITY_CFG[selected.priority] || PRIORITY_CFG.normal).label} priority
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, background: isDark ? '#15161A' : '#f8f8f7' }}>
                {msgLoading ? (
                  <div style={{ textAlign: 'center', color: c.subText, fontSize: 13, paddingTop: 40 }}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: c.subText, fontSize: 13, paddingTop: 40 }}>No messages yet.</div>
                ) : messages.map(msg => {
                  const isMe = msg.sender_role === 'customer';
                  const isEditing = editingMsgId === msg.id;
                  const isEdited = !!msg.edited_at;
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '72%', minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: c.subText, marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>
                          {isMe ? 'You' : 'Support Team'} · {fmtTime(msg.created_at)}
                        </div>
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isMe ? c.brand : c.card,
                          color: isMe ? '#fff' : c.text,
                          fontSize: 13,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          border: isMe ? 'none' : `1px solid ${c.border}`,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                          position: 'relative',
                          overflow: 'hidden',
                          minWidth: 0,
                        }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 6, flexDirection: 'column', minWidth: 0 }}>
                              <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                rows={Math.max(5, editText.split('\n').length)}
                                style={{ padding: '10px 12px', border: `1px solid ${isMe ? 'rgba(255,255,255,0.25)' : c.border}`, borderRadius: 8, background: isMe ? 'rgba(255,255,255,0.08)' : c.inputBg || '#f9f9f9', color: isMe ? '#fff' : c.text, fontSize: 13, lineHeight: 1.6, resize: 'vertical', width: '100%', minWidth: 0, minHeight: 100, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                              />
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button onClick={() => { setEditingMsgId(null); setEditText(''); }} style={{ padding: '5px 12px', border: `1px solid ${isMe ? 'rgba(255,255,255,0.3)' : c.border}`, borderRadius: 6, background: 'transparent', color: isMe ? 'rgba(255,255,255,0.8)' : c.subText, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Cancel</button>
                                <button onClick={handleSaveEdit} disabled={!editText.trim()} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: isMe ? 'rgba(255,255,255,0.9)' : c.brand, color: isMe ? c.brand : '#fff', cursor: editText.trim() ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', opacity: editText.trim() ? 1 : 0.5 }}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ minWidth: 0 }}>{renderMessageText(msg.message, isMe)}</div>
                          )}
                        </div>
                        {!isEditing && extractUrls(msg.message).length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            {extractUrls(msg.message).map(u => (
                              <LinkPreviewCard key={u} url={u} isOnBrand={isMe} c={c} />
                            ))}
                          </div>
                        )}
                        {(isEdited || isMe) && !isEditing && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: 3, flexWrap: 'wrap' }}>
                            {isEdited && (
                              <span style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.5)' : c.subText, fontStyle: 'italic' }}>Edited</span>
                            )}
                            {isMe && (
                              <button onClick={() => handleEditMessage(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4, borderRadius: 6 }} title="Edit message">
                                <Edit3 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Reply input */}
              <div style={{ padding: '12px 18px', borderTop: `1px solid ${c.border}`, background: c.card, flexShrink: 0 }}>
                {selected.status === 'closed' ? (
                  <div style={{ padding: '10px 14px', background: c.hover, borderRadius: 8, fontSize: 12, color: c.subText, textAlign: 'center' }}>
                    This ticket is closed. Contact support to reopen.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, display: 'flex', gap: 0, alignItems: 'flex-end', minWidth: 200 }}>
                        <textarea
                          ref={replyRef}
                          value={reply}
                          onChange={e => setReply(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                          rows={Math.max(2, reply.split('\n').length)}
                          style={{ ...inp, flex: 1, padding: '10px 12px', border: `1.5px solid ${c.border}`, borderRadius: '10px 0 0 10px', borderRight: 'none', background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13, resize: 'vertical', width: '100%', minWidth: 0, maxHeight: 400, overflowY: 'auto' }}
                        />
                        <button
                          onClick={() => { setShowLinkDialog(true); setLinkUrl(''); setLinkText(''); }}
                          title="Insert link"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 10px', border: `1.5px solid ${c.border}`, borderRadius: '0 10px 10px 0', background: isDark ? '#22252C' : '#f5f5f5', color: c.subText, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flexShrink: 0 }}
                        >
                          <Link2 size={14} />
                        </button>
                      </div>
                      <button
                        onClick={handleSend}
                        disabled={sending || !reply.trim()}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: c.brand, color: '#fff', border: 'none', borderRadius: 10, cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: sending || !reply.trim() ? 0.6 : 1, fontFamily: 'inherit', flexShrink: 0 }}
                      >
                        <Send size={14} /> Send
                      </button>
                    </div>
                    {showLinkDialog && (
                      <div style={{ marginTop: 8, padding: 10, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" style={{ ...inp, padding: '8px 10px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                        <input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Display text" style={{ ...inp, padding: '8px 10px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowLinkDialog(false)} style={{ padding: '6px 12px', border: `1px solid ${c.border}`, borderRadius: 6, background: 'transparent', color: c.subText, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Cancel</button>
                          <button onClick={handleInsertLink} disabled={!linkUrl.trim() || !linkText.trim()} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: c.brand, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Insert</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
