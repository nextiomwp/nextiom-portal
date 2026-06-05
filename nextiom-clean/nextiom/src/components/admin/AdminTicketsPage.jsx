import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Send, X, CheckCircle, Clock, User, MessageSquare, ChevronRight, RefreshCw, AlertCircle, Trash2, Edit3, Link2, Clipboard, Bold, Italic, Underline, TextQuote, Code2 } from 'lucide-react';
import { getAllTickets, getTicketMessages, addTicketMessage, closeTicket, reopenTicket, deleteTicket, addNotification, editTicketMessage, deleteTicketMessage } from '@/lib/storage';
import LinkPreviewCard from '@/components/shared/LinkPreviewCard';
import { extractUrls } from '@/lib/linkPreview';
import { useAuth } from '@/contexts/SupabaseAuthContext';
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminTicketsPage({ c, isDark, isMobile = false }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const chatEndRef = useRef(null);
  const replyRef = useRef(null);
  const selRef = useRef({ start: 0, end: 0 });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setTickets(await getAllTickets()); }
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
    if (!chatEndRef.current) return;
    const timer = setTimeout(() => {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setShowLinkModal(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  async function handleSend() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const msg = await addTicketMessage(selected.id, 'admin', reply.trim());
      setMessages(m => [...m, msg]);
      setReply('');
      if (replyRef.current) { replyRef.current.style.height = ''; }
      // notify customer
      await addNotification({
        customer_id: selected.customer_id,
        type: 'ticket_reply',
        title: 'Support reply received',
        message: `Admin replied to your ticket: ${selected.subject}`,
      });
      // update local ticket list
      setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, updated_at: new Date().toISOString(), ticket_messages: [...(t.ticket_messages || []), msg] } : t));
    } catch { toast({ title: 'Failed to send reply', variant: 'destructive' }); }
    finally { setSending(false); }
  }

  async function handleClose() {
    if (!selected) return;
    try {
      await closeTicket(selected.id);
      const updated = { ...selected, status: 'closed' };
      setSelected(updated);
      setTickets(ts => ts.map(t => t.id === selected.id ? updated : t));
      addNotification({ customer_id: null, type: 'ticket_closed', title: `Ticket Closed — ${selected.subject}`, message: `Admin closed support ticket: "${selected.subject}".` }).catch(() => {});
      toast({ title: 'Ticket closed' });
    } catch { toast({ title: 'Failed to close ticket', variant: 'destructive' }); }
  }

  async function handleReopen() {
    if (!selected) return;
    try {
      await reopenTicket(selected.id);
      const updated = { ...selected, status: 'open' };
      setSelected(updated);
      setTickets(ts => ts.map(t => t.id === selected.id ? updated : t));
      await addNotification({
        customer_id: selected.customer_id,
        type: 'ticket_reply',
        title: 'Support ticket reopened',
        message: `Your ticket "${selected.subject}" has been reopened by admin.`,
      });
      toast({ title: 'Ticket reopened' });
    } catch { toast({ title: 'Failed to reopen ticket', variant: 'destructive' }); }
  }

  async function handleDeleteTicket() {
    if (!selected || selected.status !== 'closed') return;
    if (!window.confirm(`Permanently delete ticket "${selected.subject}" and all its messages?`)) return;
    try {
      await deleteTicket(selected.id);
      addNotification({ customer_id: null, type: 'delete', title: `Ticket Deleted — ${selected.subject}`, message: `Admin permanently deleted closed ticket "${selected.subject}" from ${selected.customers?.name || 'a customer'}.` }).catch(() => {});
      setTickets(ts => ts.filter(t => t.id !== selected.id));
      setSelected(null);
      toast({ title: 'Ticket deleted' });
    } catch { toast({ title: 'Failed to delete ticket', variant: 'destructive' }); }
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

  async function handleDeleteMessage(msgId) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteTicketMessage(msgId);
      setMessages(m => m.filter(msg => msg.id !== msgId));
      toast({ title: 'Message deleted' });
    } catch {
      toast({ title: 'Failed to delete message', variant: 'destructive' });
    }
  }

  function handleInsertLink() {
    if (!linkUrl.trim() || !linkText.trim()) return;
    const insertion = `[${linkText.trim()}](${linkUrl.trim()})`;
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
    setShowLinkModal(false);
  }

  async function handlePasteFromClipboard() {
    try {
      const perm = await navigator.permissions.query({ name: 'clipboard-read' });
      if (perm.state === 'denied') {
        const ta = replyRef.current;
        if (ta) ta.focus();
        toast({ title: 'Clipboard access blocked', description: 'Press Ctrl+V (Cmd+V) to paste, or type manually', variant: 'default' });
        return;
      }
    } catch {}
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const textarea = replyRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const before = reply.slice(0, start);
          const after = reply.slice(end);
          setReply(before + text + after);
          setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
          }, 0);
        } else {
          setReply(r => r + text);
        }
      }
    } catch {
      const ta = replyRef.current;
      if (ta) ta.focus();
      toast({ title: 'Clipboard access blocked', description: 'Press Ctrl+V (Cmd+V) to paste, or type manually', variant: 'default' });
    }
  }

  function applyFormat(type) {
    const textarea = replyRef.current;
    if (!textarea) return;
    const { start: selStart, end: selEnd } = selRef.current;
    const selected = reply.slice(selStart, selEnd);
    const before = reply.slice(0, selStart);
    const after = reply.slice(selEnd);
    let insertion, cursorOffset;
    switch (type) {
      case 'bold':
        if (selected) { insertion = `**${selected}**`; cursorOffset = selStart + insertion.length; }
        else { insertion = '**bold text**'; cursorOffset = selStart + 2; }
        break;
      case 'italic':
        if (selected) { insertion = `*${selected}*`; cursorOffset = selStart + insertion.length; }
        else { insertion = '*italic text*'; cursorOffset = selStart + 1; }
        break;
      case 'underline':
        if (selected) { insertion = `<u>${selected}</u>`; cursorOffset = selStart + insertion.length; }
        else { insertion = '<u>underlined text</u>'; cursorOffset = selStart + 3; }
        break;
      case 'quote':
        if (selected) { insertion = selected.split('\n').map(l => `> ${l}`).join('\n'); cursorOffset = selStart + insertion.length; }
        else { insertion = '> quote'; cursorOffset = selStart + insertion.length; }
        break;
      case 'code':
        if (selected) {
          if (selected.includes('\n')) { insertion = '```\n' + selected + '\n```'; cursorOffset = selStart + insertion.length - 4; }
          else { insertion = '`' + selected + '`'; cursorOffset = selStart + insertion.length; }
        } else { insertion = '`code`'; cursorOffset = selStart + 1; }
        break;
      default: return;
    }
    setReply(before + insertion + after);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = cursorOffset;
    }, 0);
  }

  function renderInline(text, isOnBrand) {
    const parts = [];
    const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|<u>(.+?)<\/u>|\[(.+?)\]\((.+?)\)/g;
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(<span key={`t${lastIdx}`} style={{ wordBreak: 'break-word' }}>{text.slice(lastIdx, match.index)}</span>);
      }
      if (match[1]) {
        parts.push(<strong key={`b${match.index}`} style={{ fontWeight: 700 }}><em style={{ fontStyle: 'italic' }}>{renderInline(match[1], isOnBrand)}</em></strong>);
      } else if (match[2]) {
        parts.push(<strong key={`b${match.index}`} style={{ fontWeight: 700 }}>{renderInline(match[2], isOnBrand)}</strong>);
      } else if (match[3]) {
        parts.push(<em key={`i${match.index}`} style={{ fontStyle: 'italic' }}>{renderInline(match[3], isOnBrand)}</em>);
      } else if (match[4]) {
        parts.push(<code key={`c${match.index}`} style={{ background: isOnBrand ? 'rgba(255,255,255,0.12)' : c.hover, padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: "'Fira Code', monospace" }}>{match[4]}</code>);
      } else if (match[5]) {
        parts.push(<u key={`u${match.index}`} style={{ textDecoration: 'underline' }}>{renderInline(match[5], isOnBrand)}</u>);
      } else if (match[6]) {
        parts.push(
          <a key={`l${match.index}`} href={match[7]} target="_blank" rel="noopener noreferrer"
             style={{ color: isOnBrand ? '#b3d9ff' : '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}>
            {renderInline(match[6], isOnBrand)}
          </a>
        );
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < text.length) {
      parts.push(<span key={`t${lastIdx}`} style={{ wordBreak: 'break-word' }}>{text.slice(lastIdx)}</span>);
    }
    return parts.length > 0 ? parts : text;
  }

  function renderMessageText(text, isOnBrand) {
    if (!text) return text;
    const lines = text.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('> ')) {
        out.push(
          <div key={`q${i}`} style={{ borderLeft: `3px solid ${isOnBrand ? 'rgba(255,255,255,0.35)' : c.brand}`, paddingLeft: 10, margin: '4px 0', color: isOnBrand ? 'rgba(255,255,255,0.8)' : c.subText, fontStyle: 'italic' }}>
            {renderInline(trimmed.slice(2), isOnBrand)}
          </div>
        );
      } else if (trimmed.startsWith('- ')) {
        out.push(
          <div key={`ul${i}`} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: '2px 0' }}>
            <span style={{ flexShrink: 0, color: isOnBrand ? 'rgba(255,255,255,0.7)' : c.subText }}>•</span>
            <span>{renderInline(trimmed.slice(2), isOnBrand)}</span>
          </div>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        const num = trimmed.match(/^(\d+)\.\s(.*)/);
        out.push(
          <div key={`ol${i}`} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: '2px 0' }}>
            <span style={{ flexShrink: 0, color: c.subText, fontSize: 12, minWidth: 18, textAlign: 'right' }}>{num[1]}.</span>
            <span>{renderInline(num[2], isOnBrand)}</span>
          </div>
        );
      } else {
        if (line === '') {
          out.push(<div key={`l${i}`} style={i > 0 ? { marginTop: 4 } : undefined}><br/></div>);
        } else {
          const inline = renderInline(line, isOnBrand);
          out.push(<div key={`l${i}`} style={i > 0 ? { marginTop: 4 } : undefined}>{inline}</div>);
        }
      }
    }
    return out;
  }

  function isUnread(ticket) {
    return !(ticket.ticket_messages || []).filter(m => !m.is_deleted).some(m => m.sender_role === 'admin');
  }

  const inp = { outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  function saveSel() {
    const ta = replyRef.current;
    if (ta) selRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
  }

  const tbBtn = (Icon, title, onClick) => (
    <button
      key={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      onMouseEnter={e => { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.text; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.subText; }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, border: 'none', borderRadius: 6,
        background: 'transparent', color: c.subText,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.12s',
      }}
    >
      <Icon size={15} />
    </button>
  );

  const tbd = <div style={{ width: 1, height: 18, background: c.border, margin: '0 4px' }} />;

  const showList = !isMobile || !selected;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(360px, 26vw) minmax(0, 1fr)', gap: 0, width: '100%', height: isMobile ? 'auto' : 'calc(100vh - 180px)', minHeight: 500, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* Inbox list */}
      <div style={{ borderRight: isMobile ? 'none' : `1px solid ${c.border}`, display: showList ? 'flex' : 'none', flexDirection: 'column', background: c.card, minHeight: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={15} style={{ color: c.brand }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>Support Tickets</span>
            <span style={{ fontSize: 11, color: c.subText, background: c.hover, borderRadius: 10, padding: '1px 7px' }}>{tickets.length}</span>
          </div>
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}>
            <RefreshCw size={13} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 72, margin: '8px 12px', borderRadius: 8, background: c.hover }} />
            ))
          ) : tickets.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: c.subText, fontSize: 13 }}>
              <MessageSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.3, display: 'block' }} />
              No tickets yet
            </div>
          ) : tickets.map(ticket => {
            const unread = isUnread(ticket);
            const isOpen = ticket.status === 'open';
            const isActive = selected?.id === ticket.id;
            const pCfg = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.normal;
            return (
              <div
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                style={{
                  padding: '12px 14px',
                  borderBottom: `1px solid ${c.border}`,
                  cursor: 'pointer',
                  background: isActive ? (isDark ? 'rgba(232,123,53,0.10)' : 'rgba(232,123,53,0.07)') : unread ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent',
                  borderLeft: isActive ? `3px solid ${c.brand}` : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = c.hover; }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? (isDark ? 'rgba(232,123,53,0.10)' : 'rgba(232,123,53,0.07)') : 'transparent'; }}
              >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: unread ? 700 : 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</span>
                  <span style={{ fontSize: 10, color: c.subText, flexShrink: 0, marginLeft: 6 }}>{fmtTime(ticket.updated_at)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <User size={10} style={{ color: c.subText }} />
                  <span style={{ fontSize: 11, color: c.subText }}>{ticket.customers?.name || 'Unknown'}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isOpen ? c.brand : c.subText, background: isOpen ? `rgba(232,123,53,0.12)` : c.hover, padding: '1px 7px', borderRadius: 10 }}>
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: pCfg.color, background: pCfg.bg, padding: '1px 7px', borderRadius: 10 }}>{pCfg.label}</span>
                  {unread && isOpen && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.brand, flexShrink: 0 }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      {selected ? (
        <div style={{ display: 'flex', flexDirection: 'column', background: isDark ? '#15161A' : '#f8f8f7', minHeight: 0, gridColumn: isMobile ? '1' : 'auto' }}>
          {/* Chat header */}
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 12, background: c.card }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.subject}</div>
              <div style={{ fontSize: 11, color: c.subText }}>
                {selected.customers?.name} · {selected.customers?.email}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {selected.status === 'open' ? (
                <button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                  <CheckCircle size={13} /> Close Ticket
                </button>
              ) : (
                <>
                  <button onClick={handleDeleteTicket} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1px solid #ef4444`, background: 'transparent', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                    <Trash2 size={13} /> Delete
                  </button>
                  <button onClick={handleReopen} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1px solid ${c.brand}`, background: 'transparent', color: c.brand, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                    <RefreshCw size={13} /> Reopen Ticket
                  </button>
                </>
              )}
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgLoading ? (
              <div style={{ textAlign: 'center', color: c.subText, fontSize: 13, paddingTop: 40 }}>Loading messages…</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: c.subText, fontSize: 13, paddingTop: 40 }}>No messages yet.</div>
            ) : messages.map(msg => {
              const isAdmin = msg.sender_role === 'admin';
              const isEditing = editingMsgId === msg.id;
              const isEdited = !!msg.edited_at;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: 'min(860px, 82%)', minWidth: 0, ...(isEditing ? { width: '100%' } : {}) }}>
                    <div style={{ fontSize: 10, color: c.subText, marginBottom: 3, textAlign: isAdmin ? 'right' : 'left' }}>
                      {isAdmin ? 'You (Admin)' : (selected.customers?.name || 'Customer')} · {fmtTime(msg.created_at)}
                    </div>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isAdmin ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isAdmin ? '#1E1E24' : c.card,
                      color: isAdmin ? '#e8e8e8' : c.text,
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      border: isAdmin ? `1px solid ${c.brand}` : `1px solid ${c.border}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      position: 'relative',
                      minWidth: 0,
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, flexDirection: 'column', minWidth: 0 }}>
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={Math.max(5, editText.split('\n').length)}
                            style={{ padding: '10px 12px', border: `1px solid ${isAdmin ? 'rgba(255,255,255,0.25)' : c.border}`, borderRadius: 8, background: isAdmin ? 'rgba(255,255,255,0.08)' : c.inputBg || '#f9f9f9', color: isAdmin ? '#fff' : c.text, fontSize: 13, lineHeight: 1.6, resize: 'vertical', width: '100%', minWidth: 0, minHeight: 100, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                          />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button onClick={() => { setEditingMsgId(null); setEditText(''); }} style={{ padding: '5px 12px', border: `1px solid ${isAdmin ? 'rgba(255,255,255,0.3)' : c.border}`, borderRadius: 6, background: 'transparent', color: isAdmin ? 'rgba(255,255,255,0.8)' : c.subText, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Cancel</button>
                            <button onClick={handleSaveEdit} disabled={!editText.trim()} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: isAdmin ? 'rgba(255,255,255,0.9)' : c.brand, color: isAdmin ? c.brand : '#fff', cursor: editText.trim() ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', opacity: editText.trim() ? 1 : 0.5 }}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ minWidth: 0 }}>{renderMessageText(msg.message, isAdmin)}</div>
                      )}
                    </div>
                    {!isEditing && extractUrls(msg.message).length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {extractUrls(msg.message).map(u => (
                          <LinkPreviewCard key={u} url={u} isOnBrand={isAdmin} c={c} />
                        ))}
                      </div>
                    )}
                    {(isEdited || isAdmin) && !isEditing && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: isAdmin ? 'flex-end' : 'flex-start', marginTop: 3, flexWrap: 'wrap' }}>
                        {isEdited && (
                          <span style={{ fontSize: 10, color: isAdmin ? 'rgba(255,255,255,0.5)' : c.subText, fontStyle: 'italic' }}>Edited</span>
                        )}
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button onClick={() => handleEditMessage(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4, borderRadius: 6 }} title="Edit message">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeleteMessage(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef444490', display: 'flex', padding: 4, borderRadius: 6 }} title="Delete message">
                              <Trash2 size={14} />
                            </button>
                          </div>
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
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${c.border}`, background: c.card }}>
            {selected.status === 'closed' ? (
              <div style={{ padding: '10px 14px', background: c.hover, borderRadius: 8, fontSize: 12, color: c.subText, textAlign: 'center' }}>
                This ticket is closed. Click <strong>Reopen Ticket</strong> above to resume the conversation.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px',
                    border: `1.5px solid ${c.border}`, borderBottom: 'none',
                    borderRadius: '10px 10px 0 0',
                    background: isDark ? '#22252C' : '#f5f5f5',
                    flexWrap: 'wrap',
                  }}>
                    {tbBtn(Bold, 'Bold', () => applyFormat('bold'))}
                    {tbBtn(Italic, 'Italic', () => applyFormat('italic'))}
                    {tbBtn(Underline, 'Underline', () => applyFormat('underline'))}
                    {tbd}
                    {tbBtn(TextQuote, 'Quote', () => applyFormat('quote'))}
                    {tbBtn(Code2, 'Code', () => applyFormat('code'))}
                    {tbd}
                    {tbBtn(Link2, 'Insert Link', () => {
                      const sel = selRef.current;
                      if (sel.start !== sel.end) {
                        setLinkText(reply.slice(sel.start, sel.end));
                      }
                      setShowLinkModal(true);
                    })}
                    {tbBtn(Clipboard, 'Paste from Clipboard', handlePasteFromClipboard)}
                  </div>
                  <div style={{ display: 'flex', border: `1.5px solid ${c.border}`, borderRadius: '0 0 10px 10px', borderTop: 'none', background: isDark ? '#22252C' : '#f5f5f5' }}>
                    <textarea
                      ref={replyRef}
                      value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        onMouseUp={saveSel} onKeyUp={saveSel}
                      placeholder="Type a reply… (Enter to send)"
                      rows={Math.min(Math.max(3, reply.split('\n').length), 20)}
                      style={{ ...inp, flex: 1, padding: '10px 12px', border: 'none', background: 'transparent', color: c.text, fontSize: 13, resize: 'vertical', minWidth: 0, maxHeight: 500, overflowY: 'auto', outline: 'none' }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                  style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: sending || !reply.trim() ? 0.6 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  <Send size={14} /> Submit
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: c.subText, background: isDark ? '#15161A' : '#f8f8f7' }}>
          <Ticket size={40} style={{ opacity: 0.2 }} />
          <p style={{ fontSize: 13 }}>Select a ticket to view the conversation</p>
        </div>
      )}

      {showLinkModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 24 }}
          onClick={() => setShowLinkModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 16px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Insert Link</span>
              <button onClick={() => setShowLinkModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4, borderRadius: 6 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.subText, marginBottom: 4 }}>URL</label>
                <input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoFocus
                  style={{ ...inp, width: '100%', padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.subText, marginBottom: 4 }}>Display Text</label>
                <input
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  placeholder="Click here to visit"
                  style={{ ...inp, width: '100%', padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13, boxSizing: 'border-box' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleInsertLink(); }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <button onClick={() => setShowLinkModal(false)} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.subText, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleInsertLink} disabled={!linkUrl.trim() || !linkText.trim()} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: c.brand, color: '#fff', cursor: !linkUrl.trim() || !linkText.trim() ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', opacity: !linkUrl.trim() || !linkText.trim() ? 0.6 : 1 }}>Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
