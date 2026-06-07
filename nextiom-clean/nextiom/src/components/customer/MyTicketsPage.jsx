import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Send, RefreshCw, MessageSquare, CheckCircle, X, Edit3, Link2, Clipboard, Bold, Italic, Underline, TextQuote, Code2 } from 'lucide-react';
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
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });
  const chatEndRef = useRef(null);
  const replyRef = useRef(null);
  const savedRangeRef = useRef(null);
  const editRef = useRef(null);
  const { toast } = useToast();

  const customerId = user?.id;

  useEffect(() => { if (customerId) load(); }, [customerId]);

  useEffect(() => {
    setReply('');
    if (replyRef.current) {
      replyRef.current.innerHTML = '';
    }
  }, [selected?.id]);

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
      const msg = await addTicketMessage(selected.id, 'customer', reply.trim());
      setMessages(m => [...m, msg]);
      setReply('');
      if (replyRef.current) { replyRef.current.innerHTML = ''; }
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
    } catch (e) {
      console.error('Edit message error:', e);
      toast({ title: 'Failed to edit message', description: e.message, variant: 'destructive' });
    }
  }

  function handleInsertLink() {
    if (!linkUrl.trim() || !linkText.trim()) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (savedRangeRef.current) {
      selection.addRange(savedRangeRef.current);
    }

    const a = document.createElement('a');
    a.href = linkUrl.trim();
    a.textContent = linkText.trim();
    a.target = '_blank';

    if (savedRangeRef.current) {
      savedRangeRef.current.deleteContents();
      savedRangeRef.current.insertNode(a);
      
      const suffixNode = document.createTextNode('\u200B');
      a.parentNode.insertBefore(suffixNode, a.nextSibling);
      
      const range = document.createRange();
      range.setStart(suffixNode, 1);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (replyRef.current) {
      replyRef.current.appendChild(a);
    }

    const md = htmlToMarkdown(replyRef.current);
    setReply(md);
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
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          
          const lines = text.split('\n');
          const fragment = document.createDocumentFragment();
          lines.forEach((line, index) => {
            if (index > 0) fragment.appendChild(document.createElement('br'));
            fragment.appendChild(document.createTextNode(line));
          });
          
          range.insertNode(fragment);
          const md = htmlToMarkdown(replyRef.current);
          setReply(md);
        } else if (replyRef.current) {
          replyRef.current.appendChild(document.createTextNode(text));
          const md = htmlToMarkdown(replyRef.current);
          setReply(md);
        }
      }
    } catch {
      const ta = replyRef.current;
      if (ta) ta.focus();
      toast({ title: 'Clipboard access blocked', description: 'Press Ctrl+V (Cmd+V) to paste, or type manually', variant: 'default' });
    }
  }

  function htmlToMarkdown(node) {
    if (!node) return '';
    let markdown = '';
    
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      
      if (child.nodeType === 3) {
        markdown += child.nodeValue.replace(/\u200B/g, '');
      } else if (child.nodeType === 1) {
        const tagName = child.tagName.toLowerCase();
        
        let prefix = '';
        let suffix = '';
        
        if (tagName === 'strong' || tagName === 'b' || (child.style && child.style.fontWeight === 'bold')) {
          prefix = '**';
          suffix = '**';
        } else if (tagName === 'em' || tagName === 'i' || (child.style && child.style.fontStyle === 'italic')) {
          prefix = '*';
          suffix = '*';
        } else if (tagName === 'u' || (child.style && child.style.textDecoration === 'underline')) {
          prefix = '<u>';
          suffix = '</u>';
        } else if (tagName === 'code') {
          const isCodeBlock = child.parentNode && child.parentNode.tagName.toLowerCase() === 'pre';
          if (isCodeBlock) {
            markdown += htmlToMarkdown(child);
            continue;
          } else {
            prefix = '`';
            suffix = '`';
          }
        } else if (tagName === 'pre') {
          prefix = '```\n';
          suffix = '\n```';
        } else if (tagName === 'a') {
          const href = child.getAttribute('href') || '';
          prefix = '[';
          suffix = `](${href})`;
        } else if (tagName === 'blockquote') {
          const innerMd = htmlToMarkdown(child).trim();
          markdown += innerMd.split('\n').map(line => `> ${line}`).join('\n') + '\n';
          continue;
        } else if (tagName === 'br') {
          markdown += '\n';
          continue;
        } else if (tagName === 'div' || tagName === 'p') {
          const innerMd = htmlToMarkdown(child);
          if (innerMd) {
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            markdown += innerMd + '\n';
          } else {
            markdown += '\n';
          }
          continue;
        }
        
        markdown += prefix + htmlToMarkdown(child) + suffix;
      }
    }
    
    return markdown;
  }

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    const target = e.currentTarget;
    const md = htmlToMarkdown(target);
    if (target === replyRef.current) {
      setReply(md);
    } else {
      setEditText(md);
    }
  };

  function applyFormat(type, isEdit = false) {
    const editor = isEdit ? editRef.current : replyRef.current;
    if (!editor) return;
    
    const selection = window.getSelection();
    let range;
    if (selection.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      range = selection.getRangeAt(0);
    } else {
      editor.focus();
      const newRange = document.createRange();
      newRange.selectNodeContents(editor);
      newRange.collapse(false); // go to the end
      selection.removeAllRanges();
      selection.addRange(newRange);
      range = newRange;
    }
    const hasSelection = !range.collapsed;
    
    if (hasSelection) {
      const selectedText = range.toString();
      let element;
      if (type === 'bold') {
        element = document.createElement('strong');
      } else if (type === 'italic') {
        element = document.createElement('em');
      } else if (type === 'underline') {
        element = document.createElement('u');
      } else if (type === 'quote') {
        element = document.createElement('blockquote');
      } else if (type === 'code') {
        if (selectedText.includes('\n')) {
          element = document.createElement('pre');
          const code = document.createElement('code');
          code.textContent = selectedText;
          element.appendChild(code);
        } else {
          element = document.createElement('code');
        }
      }
      
      if (element) {
        if (type === 'code' && selectedText.includes('\n')) {
          range.deleteContents();
          range.insertNode(element);
          
          const newRange = document.createRange();
          newRange.setStartAfter(element);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else if (type === 'quote') {
          element.textContent = selectedText;
          range.deleteContents();
          range.insertNode(element);
          
          const newRange = document.createRange();
          newRange.setStartAfter(element);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Inline formats: bold, italic, underline, inline code
          element.appendChild(range.extractContents());
          range.insertNode(element);
          
          const suffixNode = document.createTextNode('\u200B');
          element.parentNode.insertBefore(suffixNode, element.nextSibling);
          
          const newRange = document.createRange();
          newRange.setStart(suffixNode, 1);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      let element;
      if (type === 'bold') {
        element = document.createElement('strong');
        element.textContent = 'bold text';
      } else if (type === 'italic') {
        element = document.createElement('em');
        element.textContent = 'italic text';
      } else if (type === 'underline') {
        element = document.createElement('u');
        element.textContent = 'underlined text';
      } else if (type === 'quote') {
        element = document.createElement('blockquote');
        element.textContent = 'quote';
      } else if (type === 'code') {
        element = document.createElement('code');
        element.textContent = 'code';
      }
      
      if (element) {
        range.insertNode(element);
        
        if (type === 'quote') {
          const newRange = document.createRange();
          newRange.selectNodeContents(element);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          const suffixNode = document.createTextNode('\u200B');
          element.parentNode.insertBefore(suffixNode, element.nextSibling);
          
          const newRange = document.createRange();
          newRange.selectNodeContents(element);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
    
    const md = htmlToMarkdown(editor);
    if (isEdit) {
      setEditText(md);
    } else {
      setReply(md);
    }
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function inlineMarkdownToHtml(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
    html = html.replace(/\*\*\*([^\*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
    html = html.replace(/&lt;u&gt;([\s\S]+?)&lt;\/u&gt;/g, '<u>$1</u>');
    html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    return html;
  }

  function markdownToHtml(markdown) {
    if (!markdown) return '';
    const lines = markdown.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('> ')) {
        const innerHtml = inlineMarkdownToHtml(trimmed.slice(2));
        processedLines.push(`<blockquote>${innerHtml}</blockquote>`);
      } else if (trimmed.startsWith('```')) {
        let codeContent = '';
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeContent += (codeContent ? '\n' : '') + lines[j];
          j++;
        }
        processedLines.push(`<pre><code>${escapeHtml(codeContent)}</code></pre>`);
        i = j;
      } else {
        const innerHtml = inlineMarkdownToHtml(line);
        processedLines.push(innerHtml || '<br>');
      }
    }
    
    return processedLines.join('\n');
  }

  function renderDomNode(node, isOnBrand, key = 'r') {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes).map((child, index) => 
        renderDomNode(child, isOnBrand, `${key}-${index}`)
      );
      
      switch (tagName) {
        case 'strong':
        case 'b':
          return <strong key={key} style={{ fontWeight: 700 }}>{children}</strong>;
        case 'em':
        case 'i':
          return <em key={key} style={{ fontStyle: 'italic' }}>{children}</em>;
        case 'u':
          return <u key={key} style={{ textDecoration: 'underline' }}>{children}</u>;
        case 'code':
          return (
            <code key={key} style={{ 
              background: isOnBrand ? 'rgba(255,255,255,0.12)' : c.hover, 
              padding: '1px 5px', 
              borderRadius: 4, 
              fontSize: 12, 
              fontFamily: "'Fira Code', monospace" 
            }}>
              {children}
            </code>
          );
        case 'blockquote':
          return (
            <blockquote key={key} style={{ 
              borderLeft: `3px solid ${isOnBrand ? 'rgba(255,255,255,0.35)' : c.brand}`, 
              paddingLeft: 10, 
              margin: '4px 0', 
              color: isOnBrand ? 'rgba(255,255,255,0.8)' : c.subText, 
              fontStyle: 'italic' 
            }}>
              {children}
            </blockquote>
          );
        case 'a':
          const href = node.getAttribute('href') || '';
          const safeHref = href.trim().toLowerCase().startsWith('javascript:') ? '#' : href;
          return (
            <a 
              key={key} 
              href={safeHref} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: isOnBrand ? '#b3d9ff' : '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}
            >
              {children}
            </a>
          );
        case 'span':
        case 'div':
        default:
          return <span key={key}>{children}</span>;
      }
    }
    return null;
  }

  function renderInline(text, isOnBrand) {
    if (!text) return '';
    let html = text;
    // Normalize markdown inline syntax to HTML tags
    html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
    html = html.replace(/\*\*\*([^\*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>');

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<span>${html}</span>`, 'text/html');
      const root = doc.body.firstChild || doc.body;
      return renderDomNode(root, isOnBrand);
    } catch (e) {
      console.error(e);
      return text;
    }
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

  const inp = {
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };



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
                  const isEdited = !!msg.edited_at && msg.sender_role === 'customer';
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '72%', minWidth: 0, ...(isEditing ? { width: '100%' } : {}) }}>
                        <div style={{ fontSize: 10, color: c.subText, marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>
                          {isMe ? 'You' : 'Support Team'} · {fmtTime(msg.created_at)}
                        </div>
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isMe ? '#1E1E24' : c.card,
                          color: isMe ? '#e8e8e8' : c.text,
                          fontSize: 13,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          border: isMe ? `1px solid ${c.brand}` : `1px solid ${c.border}`,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                          position: 'relative',
                          minWidth: 0,
                        }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px',
                                border: `1.5px solid ${isMe ? 'rgba(255,255,255,0.25)' : c.border}`, borderBottom: 'none',
                                borderRadius: '8px 8px 0 0',
                                background: isMe ? 'rgba(255,255,255,0.05)' : (isDark ? '#22252C' : '#f5f5f5'),
                                flexWrap: 'wrap',
                              }}>
                                {tbBtn(Bold, 'Bold', () => applyFormat('bold', true))}
                                {tbBtn(Italic, 'Italic', () => applyFormat('italic', true))}
                                {tbBtn(Underline, 'Underline', () => applyFormat('underline', true))}
                                {tbd}
                                {tbBtn(TextQuote, 'Quote', () => applyFormat('quote', true))}
                                {tbBtn(Code2, 'Code', () => applyFormat('code', true))}
                              </div>
                              <div style={{
                                display: 'flex',
                                border: `1.5px solid ${isMe ? 'rgba(255,255,255,0.25)' : c.border}`,
                                borderRadius: '0 0 8px 8px',
                                borderTop: 'none',
                                background: isMe ? 'rgba(255,255,255,0.08)' : (c.inputBg || (isDark ? '#1F222A' : '#ffffff')),
                                color: isMe ? '#fff' : c.text,
                                minHeight: 100,
                                outline: 'none',
                              }}>
                                <div
                                  ref={editRef}
                                  contentEditable
                                  onInput={e => setEditText(htmlToMarkdown(e.currentTarget))}
                                  onPaste={handlePaste}
                                  className="editor-placeholder"
                                  placeholder="Edit message…"
                                  dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.message) }}
                                  style={{
                                    ...inp,
                                    flex: 1,
                                    padding: '10px 12px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: isMe ? '#fff' : c.text,
                                    fontSize: 13,
                                    minWidth: 0,
                                    minHeight: 80,
                                    maxHeight: 300,
                                    overflowY: 'auto',
                                    outline: 'none',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 }}>
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
                            {isMe && selected.status !== 'closed' && (
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
                          const selection = window.getSelection();
                          if (selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
                            savedRangeRef.current = selection.getRangeAt(0);
                            setLinkText(selection.toString());
                          } else {
                            savedRangeRef.current = null;
                            setLinkText('');
                          }
                          setShowLinkModal(true);
                        })}
                        {tbBtn(Clipboard, 'Paste from Clipboard', handlePasteFromClipboard)}
                      </div>
                      <div style={{ display: 'flex', border: `1.5px solid ${c.border}`, borderRadius: '0 0 10px 10px', borderTop: 'none', background: isDark ? '#22252C' : '#f5f5f5' }}>
                        <style>{`
                          .editor-placeholder:empty:before {
                            content: attr(placeholder);
                            color: ${isDark ? '#6B7280' : '#9CA3AF'};
                            pointer-events: none;
                            display: block;
                          }
                          .editor-placeholder blockquote {
                            border-left: 3px solid ${c.brand};
                            padding-left: 8px;
                            margin: 4px 0;
                            font-style: italic;
                            color: ${isDark ? '#a0a0a0' : '#666'};
                          }
                          .editor-placeholder code {
                            background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                            padding: 1px 4px;
                            border-radius: 3px;
                            font-family: monospace;
                            font-size: 0.9em;
                          }
                          .editor-placeholder pre {
                            background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                            padding: 6px 10px;
                            border-radius: 4px;
                            margin: 4px 0;
                            white-space: pre-wrap;
                            word-break: break-all;
                          }
                        `}</style>
                        <div
                          ref={replyRef}
                          contentEditable
                          onInput={e => setReply(htmlToMarkdown(e.currentTarget))}
                          onPaste={handlePaste}
                          className="editor-placeholder"
                          placeholder="Type a message…"
                          style={{
                            ...inp,
                            flex: 1,
                            padding: '10px 12px',
                            border: 'none',
                            background: 'transparent',
                            color: c.text,
                            fontSize: 13,
                            minWidth: 0,
                            minHeight: 80,
                            maxHeight: 500,
                            overflowY: 'auto',
                            outline: 'none',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
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
          )}
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
