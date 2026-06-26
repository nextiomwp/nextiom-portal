import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Send, X, CheckCircle, Clock, User, MessageSquare, ChevronRight, RefreshCw, AlertCircle, Trash2, Edit3, Link2, Clipboard, Bold, Italic, Underline, TextQuote, Code2, Image, ExternalLink, HelpCircle } from 'lucide-react';
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
  const savedRangeRef = useRef(null);
  const editRef = useRef(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    quote: false,
    code: false
  });

  const [showScreenshotHelper, setShowScreenshotHelper] = useState(false);
  const [screenshotInput, setScreenshotInput] = useState('');
  const [screenshots, setScreenshots] = useState([]);
  const [activePreviewUrl, setActivePreviewUrl] = useState(null);

  const isAdmin = true;

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setReply('');
    if (replyRef.current) {
      replyRef.current.innerHTML = '';
    }
    setActiveFormats({
      bold: false,
      italic: false,
      underline: false,
      quote: false,
      code: false
    });
    setScreenshots([]);
    setScreenshotInput('');
    setShowScreenshotHelper(false);
  }, [selected?.id, editingMsgId]);

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
    const textToSend = reply.trim();
    if ((!textToSend && screenshots.length === 0) || !selected) return;
    setSending(true);
    try {
      let messageContent = textToSend;
      if (screenshots.length > 0) {
        messageContent += '\n\n--- SCREENSHOTS ---\n' + screenshots.map(url => `[Screenshot](${url})`).join('\n');
      }
      const msg = await addTicketMessage(selected.id, 'admin', messageContent.trim());
      setMessages(m => [...m, msg]);
      setReply('');
      setScreenshots([]);
      setShowScreenshotHelper(false);
      if (replyRef.current) { replyRef.current.innerHTML = ''; }
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

  function handleAddScreenshot() {
    if (!screenshotInput.trim()) return;
    const url = screenshotInput.trim();
    try {
      new URL(url);
    } catch (e) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid absolute URL.', variant: 'destructive' });
      return;
    }
    setScreenshots(prev => [...prev, url]);
    setScreenshotInput('');
  }

  function handleRemoveScreenshot(indexToRemove) {
    setScreenshots(prev => prev.filter((_, idx) => idx !== indexToRemove));
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
    } catch (e) {
      console.error('Edit message error:', e);
      toast({ title: 'Failed to edit message', description: e.message, variant: 'destructive' });
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
        const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
        if (urlRegex.test(text.trim())) {
          const url = text.trim();
          let href = url;
          if (url.toLowerCase().startsWith('www.')) {
            href = 'https://' + url;
          }
          const a = document.createElement('a');
          a.href = href;
          a.textContent = url;
          a.target = '_blank';
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(a);
            const suffixNode = document.createTextNode('\u200B');
            a.parentNode.insertBefore(suffixNode, a.nextSibling);
            const newRange = document.createRange();
            newRange.setStart(suffixNode, 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else if (replyRef.current) {
            replyRef.current.appendChild(a);
          }
          const md = htmlToMarkdown(replyRef.current);
          setReply(md);
        } else {
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
          let innerMd = htmlToMarkdown(child);
          if (innerMd.endsWith('\n')) {
            innerMd = innerMd.slice(0, -1);
          }
          if (markdown && !markdown.endsWith('\n')) {
            markdown += '\n';
          }
          markdown += innerMd + '\n';
          continue;
        }
        
        const innerContent = htmlToMarkdown(child);
        if (innerContent.replace(/\u200B/g, '').trim()) {
          markdown += prefix + innerContent + suffix;
        } else {
          markdown += innerContent;
        }
      }
    }
    
    return markdown;
  }

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
    if (urlRegex.test(text.trim())) {
      const url = text.trim();
      let href = url;
      if (url.toLowerCase().startsWith('www.')) {
        href = 'https://' + url;
      }
      const a = document.createElement('a');
      a.href = href;
      a.textContent = url;
      a.target = '_blank';
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(a);
        const suffixNode = document.createTextNode('\u200B');
        a.parentNode.insertBefore(suffixNode, a.nextSibling);
        const newRange = document.createRange();
        newRange.setStart(suffixNode, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        e.currentTarget.appendChild(a);
      }
    } else {
      document.execCommand('insertText', false, text);
    }
    const target = e.currentTarget;
    const md = htmlToMarkdown(target);
    if (target === replyRef.current) {
      setReply(md);
    } else {
      setEditText(md);
    }
  };

  const handleSelectionChange = (e) => {
    const editor = e.currentTarget;
    const selection = window.getSelection();
    if (selection.rangeCount) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        let node = range.commonAncestorContainer;
        if (node.nodeType === 3) {
          node = node.parentNode;
        }
        
        const formats = {
          bold: !!(node && (node.closest('strong') || node.closest('b') || (node.style && node.style.fontWeight === 'bold'))),
          italic: !!(node && (node.closest('em') || node.closest('i') || (node.style && node.style.fontStyle === 'italic'))),
          underline: !!(node && (node.closest('u') || (node.style && node.style.textDecoration === 'underline'))),
          quote: !!(node && node.closest('blockquote')),
          code: !!(node && (node.closest('code') || node.closest('pre'))),
        };
        setActiveFormats(formats);
      }
    }
  };

  const handleKeyDown = (e, isEdit = false) => {
    const editor = isEdit ? editRef.current : replyRef.current;
    if (!editor) return;

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const selection = window.getSelection();
      if (selection.rangeCount && selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          const formats = activeFormats;
          
          let node = range.commonAncestorContainer;
          if (node.nodeType === 3) {
            node = node.parentNode;
          }
          
          const hasBold = node && (node.closest('strong') || node.closest('b') || (node.style && node.style.fontWeight === 'bold'));
          const hasItalic = node && (node.closest('em') || node.closest('i') || (node.style && node.style.fontStyle === 'italic'));
          const hasUnderline = node && (node.closest('u') || (node.style && node.style.textDecoration === 'underline'));
          const hasQuote = node && node.closest('blockquote');
          const hasCode = node && (node.closest('code') || node.closest('pre'));
          
          const matchesBold = !!formats.bold === !!hasBold;
          const matchesItalic = !!formats.italic === !!hasItalic;
          const matchesUnderline = !!formats.underline === !!hasUnderline;
          const matchesQuote = !!formats.quote === !!hasQuote;
          const matchesCode = !!formats.code === !!hasCode;
          
          if (matchesBold && matchesItalic && matchesUnderline && matchesQuote && matchesCode) {
            e.preventDefault();
            let textNode = range.startContainer;
            let offset = range.startOffset;
            
            if (textNode.nodeType !== 3) {
              textNode = document.createTextNode(e.key);
              range.insertNode(textNode);
              offset = 1;
            } else {
              const val = textNode.nodeValue;
              if (val === '\u200B') {
                textNode.nodeValue = e.key;
                offset = 1;
              } else {
                textNode.nodeValue = val.slice(0, offset) + e.key + val.slice(offset);
                offset += 1;
              }
            }
            
            const newRange = document.createRange();
            newRange.setStart(textNode, offset);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            const md = htmlToMarkdown(editor);
            if (isEdit) setEditText(md);
            else setReply(md);
            return;
          }
          
          e.preventDefault();
          range.deleteContents();
          
          let topElement = null;
          let currentElement = null;
          
          if (formats.bold) {
            const el = document.createElement('strong');
            if (!topElement) topElement = el;
            else currentElement.appendChild(el);
            currentElement = el;
          }
          if (formats.italic) {
            const el = document.createElement('em');
            if (!topElement) topElement = el;
            else currentElement.appendChild(el);
            currentElement = el;
          }
          if (formats.underline) {
            const el = document.createElement('u');
            if (!topElement) topElement = el;
            else currentElement.appendChild(el);
            currentElement = el;
          }
          if (formats.quote) {
            const el = document.createElement('blockquote');
            if (!topElement) topElement = el;
            else currentElement.appendChild(el);
            currentElement = el;
          }
          if (formats.code) {
            const el = document.createElement('code');
            if (!topElement) topElement = el;
            else currentElement.appendChild(el);
            currentElement = el;
          }
          
          const textNode = document.createTextNode(e.key);
          
          let insertParent = null;
          let insertSibling = null;
          
          const formatsToExit = [];
          if (hasBold && !formats.bold) formatsToExit.push('bold');
          if (hasItalic && !formats.italic) formatsToExit.push('italic');
          if (hasUnderline && !formats.underline) formatsToExit.push('underline');
          if (hasQuote && !formats.quote) formatsToExit.push('quote');
          if (hasCode && !formats.code) formatsToExit.push('code');
          
          if (formatsToExit.length > 0) {
            let ancestor = range.startContainer;
            if (ancestor.nodeType === 3) ancestor = ancestor.parentNode;
            
            let exitNode = null;
            while (ancestor && ancestor !== editor) {
              const tag = ancestor.tagName?.toLowerCase();
              const isB = tag === 'strong' || tag === 'b';
              const isI = tag === 'em' || tag === 'i';
              const isU = tag === 'u';
              const isQ = tag === 'blockquote';
              const isC = tag === 'code';
              
              if (
                (isB && formatsToExit.includes('bold')) ||
                (isI && formatsToExit.includes('italic')) ||
                (isU && formatsToExit.includes('underline')) ||
                (isQ && formatsToExit.includes('quote')) ||
                (isC && formatsToExit.includes('code'))
              ) {
                exitNode = ancestor;
              }
              ancestor = ancestor.parentNode;
            }
            
            if (exitNode) {
              insertParent = exitNode.parentNode;
              insertSibling = exitNode.nextSibling;
            }
          }
          
          if (currentElement) {
            currentElement.appendChild(textNode);
          }
          
          const nodeToInsert = topElement || textNode;
          if (insertParent) {
            if (insertSibling) {
              insertParent.insertBefore(nodeToInsert, insertSibling);
            } else {
              insertParent.appendChild(nodeToInsert);
            }
          } else {
            range.insertNode(nodeToInsert);
          }
          
          const newRange = document.createRange();
          newRange.setStart(textNode, 1);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          const md = htmlToMarkdown(editor);
          if (isEdit) setEditText(md);
          else setReply(md);
        }
      }
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
      if (type === 'bold' || type === 'italic' || type === 'underline') {
        document.execCommand(type, false, null);
      } else {
        let node = range.commonAncestorContainer;
        if (node.nodeType === 3) node = node.parentNode;
        
        const existingNode = type === 'quote' ? node.closest('blockquote') : node.closest('code');
        if (existingNode) {
          const parent = existingNode.parentNode;
          while (existingNode.firstChild) {
            parent.insertBefore(existingNode.firstChild, existingNode);
          }
          existingNode.remove();
        } else {
          const selectedText = range.toString();
          let element;
          if (type === 'quote') {
            element = document.createElement('blockquote');
            element.textContent = selectedText;
          } else if (type === 'code') {
            if (selectedText.includes('\n')) {
              element = document.createElement('pre');
              const code = document.createElement('code');
              code.textContent = selectedText;
              element.appendChild(code);
            } else {
              element = document.createElement('code');
              element.textContent = selectedText;
            }
          }
          
          if (element) {
            range.deleteContents();
            range.insertNode(element);
            
            const newRange = document.createRange();
            newRange.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
      
      const dummyEvent = { currentTarget: editor };
      handleSelectionChange(dummyEvent);
    } else {
      setActiveFormats(prev => {
        const next = { ...prev, [type]: !prev[type] };
        
        if (type === 'bold' || type === 'italic' || type === 'underline') {
          document.execCommand(type, false, null);
        }
        
        return next;
      });
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
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/&lt;u&gt;/g, '<u>').replace(/&lt;\/u&gt;/g, '</u>');
    html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    return html;
  }

  function markdownToHtml(markdown) {
    if (!markdown) return '';
    const lines = markdown.split('\n');
    const items = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('> ')) {
        const innerHtml = inlineMarkdownToHtml(trimmed.slice(2));
        items.push({ type: 'block', html: `<blockquote>${innerHtml}</blockquote>` });
      } else if (trimmed.startsWith('```')) {
        let codeContent = '';
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeContent += (codeContent ? '\n' : '') + lines[j];
          j++;
        }
        items.push({ type: 'block', html: `<pre><code>${escapeHtml(codeContent)}</code></pre>` });
        i = j;
      } else {
        const innerHtml = inlineMarkdownToHtml(line);
        items.push({ type: 'text', html: innerHtml });
      }
    }
    
    let html = '';
    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      const next = items[i + 1];
      
      html += current.html;
      
      if (current.type === 'text') {
        if (current.html === '') {
          html += '<br>';
        } else if (next && next.type === 'text') {
          html += '<br>';
        }
      }
    }
    return html;
  }

  function linkifyText(text, isOnBrand, key) {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    if (parts.length === 1) {
      return text;
    }
    return parts.map((part, index) => {
      if (part.match(/^https?:\/\//i) || part.match(/^www\./i)) {
        let href = part;
        let cleanText = part;
        let trailing = '';
        const trailingMatch = part.match(/([.,!?;:]+)$/);
        if (trailingMatch) {
          trailing = trailingMatch[1];
          cleanText = part.slice(0, -trailing.length);
          href = cleanText;
        }
        if (cleanText.endsWith(')')) {
          const openCount = (cleanText.match(/\(/g) || []).length;
          const closeCount = (cleanText.match(/\)/g) || []).length;
          if (closeCount > openCount) {
            trailing = ')' + trailing;
            cleanText = cleanText.slice(0, -1);
            href = cleanText;
          }
        }
        if (href.toLowerCase().startsWith('www.')) {
          href = 'https://' + href;
        }
        return (
          <React.Fragment key={`${key}-link-${index}`}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: isOnBrand ? '#b3d9ff' : '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}
            >
              {cleanText}
            </a>
            {trailing}
          </React.Fragment>
        );
      }
      return part;
    });
  }

  function renderDomNode(node, isOnBrand, key = 'r', inLink = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (inLink) {
        return node.nodeValue;
      }
      return linkifyText(node.nodeValue, isOnBrand, key);
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes).map((child, index) => 
        renderDomNode(child, isOnBrand, `${key}-${index}`, inLink || tagName === 'a')
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
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
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
    
    let bodyText = text;
    let screenshotUrls = [];
    
    if (text.includes('--- SCREENSHOTS ---')) {
      const parts = text.split('--- SCREENSHOTS ---');
      bodyText = parts[0].trim();
      const screenshotSection = parts[1] || '';
      const matches = screenshotSection.match(/\[Screenshot\]\((https?:\/\/[^\s)]+)\)/g) || [];
      screenshotUrls = matches.map(m => {
        const urlMatch = m.match(/\((https?:\/\/[^\s)]+)\)/);
        return urlMatch ? urlMatch[1] : null;
      }).filter(Boolean);
    }
    
    const lines = bodyText.split('\n');
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
    
    return (
      <>
        <div>{out}</div>
        {screenshotUrls.length > 0 && (
          <div style={{ marginTop: 12, borderTop: `1.5px solid ${isOnBrand ? 'rgba(255,255,255,0.15)' : c.border}`, paddingTop: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isOnBrand ? 'rgba(255,255,255,0.7)' : c.subText, display: 'block', marginBottom: 6 }}>
              Attached Screenshots ({screenshotUrls.length})
            </span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {screenshotUrls.map((url, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => setActivePreviewUrl(url)}
                  style={{
                    position: 'relative',
                    width: 140,
                    height: 90,
                    borderRadius: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: `1px solid ${isOnBrand ? 'rgba(255,255,255,0.2)' : c.border}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    background: '#000'
                  }}
                  title="Click to view full image"
                >
                  <img
                    src={url}
                    alt="attachment"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/140x90/222/fff?text=Invalid+Image';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0)',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  function isUnread(ticket) {
    return !(ticket.ticket_messages || []).filter(m => !m.is_deleted).some(m => m.sender_role === 'admin');
  }

  const inp = { outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };



  const tbBtn = (Icon, title, onClick, active = false) => (
    <button
      key={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      onMouseEnter={e => { e.currentTarget.style.background = active ? (isAdmin ? 'rgba(255,255,255,0.25)' : c.brand) : c.hover; e.currentTarget.style.color = active ? '#fff' : c.text; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? (isAdmin ? 'rgba(255,255,255,0.2)' : c.brand) : 'transparent'; e.currentTarget.style.color = active ? '#fff' : c.subText; }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, border: 'none', borderRadius: 6,
        background: active ? (isAdmin ? 'rgba(255,255,255,0.2)' : c.brand) : 'transparent',
        color: active ? '#fff' : c.subText,
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px',
                            border: `1.5px solid ${isAdmin ? 'rgba(255,255,255,0.25)' : c.border}`, borderBottom: 'none',
                            borderRadius: '8px 8px 0 0',
                            background: isAdmin ? 'rgba(255,255,255,0.05)' : (isDark ? '#22252C' : '#f5f5f5'),
                            flexWrap: 'wrap',
                          }}>
                            {tbBtn(Bold, 'Bold', () => applyFormat('bold', true), activeFormats.bold)}
                            {tbBtn(Italic, 'Italic', () => applyFormat('italic', true), activeFormats.italic)}
                            {tbBtn(Underline, 'Underline', () => applyFormat('underline', true), activeFormats.underline)}
                            {tbd}
                            {tbBtn(TextQuote, 'Quote', () => applyFormat('quote', true), activeFormats.quote)}
                            {tbBtn(Code2, 'Code', () => applyFormat('code', true), activeFormats.code)}
                          </div>
                          <div style={{
                            display: 'flex',
                            border: `1.5px solid ${isAdmin ? 'rgba(255,255,255,0.25)' : c.border}`,
                            borderRadius: '0 0 8px 8px',
                            borderTop: 'none',
                            background: isAdmin ? 'rgba(255,255,255,0.08)' : (c.inputBg || (isDark ? '#1F222A' : '#ffffff')),
                            color: isAdmin ? '#fff' : c.text,
                            minHeight: 100,
                            outline: 'none',
                          }}>
                            <div
                              ref={editRef}
                              contentEditable
                              onInput={e => setEditText(htmlToMarkdown(e.currentTarget))}
                              onPaste={handlePaste}
                              onKeyDown={e => handleKeyDown(e, true)}
                              onKeyUp={handleSelectionChange}
                              onMouseUp={handleSelectionChange}
                              onFocus={handleSelectionChange}
                              className="editor-placeholder"
                              placeholder="Edit message…"
                              dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.message) }}
                              style={{
                                ...inp,
                                flex: 1,
                                padding: '10px 12px',
                                border: 'none',
                                background: 'transparent',
                                color: isAdmin ? '#fff' : c.text,
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
                    {tbBtn(Bold, 'Bold', () => applyFormat('bold'), activeFormats.bold)}
                    {tbBtn(Italic, 'Italic', () => applyFormat('italic'), activeFormats.italic)}
                    {tbBtn(Underline, 'Underline', () => applyFormat('underline'), activeFormats.underline)}
                    {tbd}
                    {tbBtn(TextQuote, 'Quote', () => applyFormat('quote'), activeFormats.quote)}
                    {tbBtn(Code2, 'Code', () => applyFormat('code'), activeFormats.code)}
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
                    {tbBtn(Image, 'Add Screenshots', () => setShowScreenshotHelper(!showScreenshotHelper), showScreenshotHelper)}
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
                      onKeyDown={e => handleKeyDown(e, false)}
                      onKeyUp={handleSelectionChange}
                      onMouseUp={handleSelectionChange}
                      onFocus={handleSelectionChange}
                      className="editor-placeholder"
                      placeholder="Type a reply…"
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
                  {showScreenshotHelper && (
                      <div style={{
                        marginTop: 8,
                        padding: 16,
                        border: `1.5px solid ${c.border}`,
                        borderRadius: 10,
                        background: isDark ? '#1C1E24' : '#fafafa',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Add Screenshots (via image links)</span>
                            <span title="Paste direct image URLs (ending with jpg, png, etc.) from image hosts like Imgur or Snipboard." style={{ cursor: 'help', color: c.subText, display: 'flex', alignItems: 'center' }}>
                              <HelpCircle size={14} />
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: c.subText, marginTop: -4 }}>
                          Paste image links from any image hosting service. Supported formats: JPG, PNG, WEBP, GIF
                        </span>
                        
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${c.border}`, borderRadius: 8, padding: '6px 10px', background: isDark ? '#22252C' : '#fff' }}>
                            <Link2 size={14} style={{ color: c.subText }} />
                            <input
                              type="text"
                              placeholder="Paste image link here..."
                              value={screenshotInput}
                              onChange={e => setScreenshotInput(e.target.value)}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                color: c.text,
                                fontSize: 12
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddScreenshot();
                                }
                              }}
                            />
                          </div>
                          <button
                            onClick={handleAddScreenshot}
                            style={{
                              padding: '6px 14px',
                              background: c.brand,
                              color: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            Add Link
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: c.subText }}>Recommended image hosting services</span>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <a
                              href="https://imgur.com/upload"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 12px',
                                border: `1px solid ${c.border}`,
                                borderRadius: 8,
                                background: isDark ? 'rgba(255,255,255,0.03)' : '#f9f9f9',
                                color: c.text,
                                fontSize: 12,
                                textDecoration: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ width: 14, height: 14, borderRadius: 3, background: '#1bb76e', marginRight: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 'bold' }}>I</div>
                              <span>Imgur</span>
                              <ExternalLink size={12} style={{ marginLeft: 6, color: c.subText }} />
                            </a>
                            <a
                              href="https://snipboard.io"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 12px',
                                border: `1px solid ${c.border}`,
                                borderRadius: 8,
                                background: isDark ? 'rgba(255,255,255,0.03)' : '#f9f9f9',
                                color: c.text,
                                fontSize: 12,
                                textDecoration: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ width: 14, height: 14, borderRadius: 3, background: '#8A3FFC', marginRight: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 'bold' }}>S</div>
                              <span>Snipboard.io</span>
                              <ExternalLink size={12} style={{ marginLeft: 6, color: c.subText }} />
                            </a>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.subText, marginTop: 2 }}>
                          <span style={{ color: c.brand }}>💡</span>
                          <span>Tip: Upload your screenshots to Imgur or Snipboard and paste the image link above.</span>
                        </div>

                        {screenshots.length > 0 && (
                          <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12, marginTop: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: c.text, display: 'block', marginBottom: 8 }}>
                              Added Images ({screenshots.length})
                            </span>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              {screenshots.map((url, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      position: 'relative',
                                      width: 120,
                                      height: 80,
                                      borderRadius: 8,
                                      border: `1.5px solid ${c.border}`,
                                      overflow: 'hidden',
                                      background: '#000',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => setActivePreviewUrl(url)}
                                  >
                                    <img
                                      src={url}
                                      alt={`screenshot-${idx}`}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                      }}
                                      onError={(e) => {
                                        e.currentTarget.src = 'https://placehold.co/120x80/222/fff?text=Invalid+Image';
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveScreenshot(idx);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        background: 'rgba(0,0,0,0.6)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: 20,
                                        height: 20,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                      }}
                                      title="Remove screenshot"
                                    >
                                      <X size={12} />
                                    </button>
                                    <div style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      background: 'rgba(0,0,0,0.5)',
                                      color: '#fff',
                                      fontSize: 10,
                                      padding: '2px 0',
                                      textAlign: 'center'
                                    }}>
                                      <span>Click to view</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || (!reply.trim() && screenshots.length === 0)}
                  style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: sending || (!reply.trim() && screenshots.length === 0) ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: sending || (!reply.trim() && screenshots.length === 0) ? 0.6 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
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

      {activePreviewUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: 24 }}
          onClick={() => setActivePreviewUrl(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, width: '90%', maxWidth: 800, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Screenshot Preview</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={activePreviewUrl}
                  download="screenshot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: c.brand, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
                >
                  Download
                </a>
                <button onClick={() => setActivePreviewUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4, borderRadius: 6 }}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#090a0f', maxHeight: '70vh', overflow: 'auto' }}>
              <img
                src={activePreviewUrl}
                alt="Full Preview"
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
