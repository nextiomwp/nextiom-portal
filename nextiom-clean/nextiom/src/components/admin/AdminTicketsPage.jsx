import React, { useState, useEffect, useRef } from 'react';
import { 
  Ticket, Send, X, CheckCircle, Clock, User, MessageSquare, ChevronLeft, ChevronRight, 
  RefreshCw, AlertCircle, Trash2, Edit3, Link2, Clipboard, Bold, Italic, Underline, 
  TextQuote, Code2, Image, ExternalLink, HelpCircle, ArrowLeftRight, Phone, Building, 
  Globe, Calendar, Lock, ShieldAlert, DollarSign, Activity, FileText, CheckCircle2, 
  Award, Server, Mail, Plus, Menu, MoreVertical, Play, Shield, Search, SlidersHorizontal, ListFilter, Key, Loader2
} from 'lucide-react';
import { 
  getAllTickets, getTicketMessages, addTicketMessage, closeTicket, reopenTicket, 
  deleteTicket, addNotification, editTicketMessage, deleteTicketMessage, assignTicket, 
  transferTicket, getCustomers, createTicket 
} from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';
import CustomerProfileAdminView from '@/components/admin/CustomerProfileAdminView';
import LinkPreviewCard from '@/components/shared/LinkPreviewCard';
import { extractUrls } from '@/lib/linkPreview';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const PRIORITY_CFG = {
  low:    { label: 'Low',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  normal: { label: 'Normal', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  high:   { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const AVATAR_COLORS = ['var(--brand-color)', '#e85d5d', '#378ADD', '#639922', '#BA7517', '#8b5cf6'];
const avatarColor = str => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

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

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return 'C';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getDerivedStatus(t) {
  if (t.status === 'closed') return 'closed';
  const msgs = t.ticket_messages || [];
  if (msgs.length > 0) {
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.sender_role === 'customer') {
      return 'waiting_reply';
    } else if (lastMsg.sender_role === 'admin') {
      return 'in_progress';
    }
  }
  return 'open';
}

function getTicketCategory(ticket) {
  if (!ticket) return 'Technical Support';
  if (ticket.department && ticket.department !== 'Technical Support') {
    return ticket.department;
  }
  const subject = (ticket.subject || '').toLowerCase();
  const mapping = [
    { cat: 'Hosting & Servers', keywords: ['hosting', 'vps', 'ssl', 'migration'] },
    { cat: 'Website & WordPress', keywords: ['website', 'wordpress', 'plugin', 'theme'] },
    { cat: 'Domains & Email', keywords: ['domain', 'email', 'dns issues'] },
    { cat: 'SEO & Analytics', keywords: ['seo support', 'analytics setup', 'search console', 'site speed'] },
    { cat: 'Social Media Support', keywords: ['fake account removal', 'hacked account recovery', 'account verification', 'content removal'] },
    { cat: 'Business Services', keywords: ['business registration', 'payment gateway', 'virtual number'] },
    { cat: 'Billing & Requests', keywords: ['service request', 'refund request', 'cancellation', 'general inquiry'] },
    { cat: 'Development & Apps', keywords: ['app', 'custom development'] },
  ];
  for (const item of mapping) {
    for (const kw of item.keywords) {
      if (subject.includes(kw)) {
        return item.cat;
      }
    }
  }
  return ticket.department || 'Technical Support';
}

const getProductIcon = (type) => {
  switch (String(type).toLowerCase()) {
    case 'hosting':
      return Server;
    case 'domain':
      return Globe;
    case 'email':
      return Mail;
    case 'license':
      return Key;
    default:
      return Award;
  }
};

export default function AdminTicketsPage({ c, isDark, isMobile = false, initialTicketId = null }) {
  // Data States
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  
  // Conversation panel states
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [editorTab, setEditorTab] = useState('reply'); // 'reply' or 'note'
  const [sending, setSending] = useState(false);
  
  // Customer products and stats states
  const [customerProducts, setCustomerProducts] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customerJobs, setCustomerJobs] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'high_priority', 'waiting_reply', 'assigned_me', 'unassigned'
  const [ticketFilter, setTicketFilter] = useState('all');
  const [ticketSort, setTicketSort] = useState('last_updated');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Responsive layout state
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [mobileView, setMobileView] = useState('customers'); // 'customers', 'details', 'chat'

  // Modals state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activePreviewUrl, setActivePreviewUrl] = useState(null);
  
  // Modal Fields
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDept, setNewTicketDept] = useState('Technical Support');
  const [newTicketPriority, setNewTicketPriority] = useState('normal');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketAssignee, setNewTicketAssignee] = useState('Admin');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const [noteType, setNoteType] = useState('Private');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const [customTransfer, setCustomTransfer] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  
  // Rich Text Editor Refs & states
  const chatEndRef = useRef(null);
  const replyRef = useRef(null);
  const savedRangeRef = useRef(null);
  const editRef = useRef(null);
  const selectedRef = useRef(null);
  
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  
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

  const { user } = useAuth();
  const { toast } = useToast();

  const isAdmin = true;

  // Track selected ticket ref for realtime updates
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Track window resizing for columns
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = width < 1280 && width >= 768;
  const isMobileView = width < 768;

  // Initial load
  useEffect(() => {
    load();
    
    // Realtime changes
    const ticketsChannel = supabase
      .channel('admin_tickets_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        load(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages' }, async (payload) => {
        if (selectedRef.current && payload.new && payload.new.ticket_id === selectedRef.current.id) {
          try {
            const msgs = await getTicketMessages(selectedRef.current.id);
            setMessages(msgs);
          } catch (e) {
            console.error(e);
          }
        }
        load(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
    };
  }, []);

  useEffect(() => {
    if (tickets.length > 0) {
      const targetId = initialTicketId || sessionStorage.getItem('admin_auto_select_ticket_id');
      if (targetId) {
        const tkt = tickets.find(t => t.id === targetId);
        if (tkt) {
          setSelectedCustomerId(tkt.customer_id);
          openTicket(tkt);
        }
        if (!initialTicketId) {
          sessionStorage.removeItem('admin_auto_select_ticket_id');
        }
      }
    }
  }, [tickets, initialTicketId]);

  // Sync draft states when selecting tickets
  useEffect(() => {
    setReply('');
    if (replyRef.current) {
      replyRef.current.innerHTML = '';
    }
    setActiveFormats({
      bold: false, italic: false, underline: false, quote: false, code: false
    });
    setScreenshots([]);
    setScreenshotInput('');
    setShowScreenshotHelper(false);
  }, [selected?.id, editingMsgId]);

  // Reset pagination on search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const [allTkts, allCusts] = await Promise.all([
        getAllTickets(),
        getCustomers()
      ]);
      setTickets(allTkts);
      setCustomers(allCusts);

      // Restore selections
      if (selectedRef.current) {
        const updatedSelected = allTkts.find(t => t.id === selectedRef.current.id);
        if (updatedSelected) {
          setSelected(updatedSelected);
        }
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to load dashboard data', variant: 'destructive' });
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  // Fetch sub-data for selected customer
  async function loadCustomerProducts(customerId) {
    setProductsLoading(true);
    try {
      const [lics, hostings, domains, emails] = await Promise.all([
        supabase.from('licenses').select('*').eq('customer_id', customerId),
        supabase.from('hosting_requests').select('*').eq('customer_id', customerId),
        supabase.from('domains').select('*').eq('customer_id', customerId),
        supabase.from('email_requests').select('*').eq('customer_id', customerId)
      ]);
      
      const items = [];
      if (lics.data) {
        lics.data.forEach(l => {
          items.push({ id: `lic-${l.id}`, name: l.name || 'License Key', type: 'License', status: l.status || 'Active', expiry: l.expiry_date });
        });
      }
      if (hostings.data) {
        hostings.data.forEach(h => {
          items.push({ id: `host-${h.id}`, name: `${h.plan_name || 'Hosting'} - ${h.domain}`, type: 'Hosting', status: h.status || 'Active', expiry: h.expiry_date });
        });
      }
      if (domains.data) {
        domains.data.forEach(d => {
          items.push({ id: `dom-${d.id}`, name: d.domain_name || 'Domain Name', type: 'Domain', status: d.status || 'Active', expiry: d.expiry_date });
        });
      }
      if (emails.data) {
        emails.data.forEach(e => {
          items.push({ id: `email-${e.id}`, name: e.email || 'Email Account', type: 'Email', status: e.status || 'Active', expiry: e.expiry_date });
        });
      }
      setCustomerProducts(items);
    } catch (err) {
      console.error('Error fetching customer products:', err);
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadCustomerTimelineData(customerId, customerEmail) {
    try {
      const [invs, jbs] = await Promise.all([
        supabase.from('invoices').select('*').eq('client_email', customerEmail),
        supabase.from('jobs').select('*').eq('customer_id', customerId)
      ]);
      if (invs.data) setCustomerInvoices(invs.data);
      if (jbs.data) setCustomerJobs(jbs.data);
    } catch (err) {
      console.error('Error fetching customer timeline data:', err);
    }
  }

  // Load ticket conversation
  async function openTicket(ticket) {
    setSelected(ticket);
    setMsgLoading(true);
    setMessages([]);
    try {
      const msgs = await getTicketMessages(ticket.id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setMsgLoading(false);
    }
  }

  // Group tickets by customer
  const customerMap = {};
  customers.forEach(c => {
    customerMap[c.id] = { ...c, tickets: [] };
  });

  tickets.forEach(t => {
    if (!t.customer_id) return;
    if (!customerMap[t.customer_id]) {
      customerMap[t.customer_id] = {
        id: t.customer_id,
        name: t.customers?.name || 'Unknown User',
        email: t.customers?.email || 'No Email',
        tickets: [],
        created_at: t.created_at
      };
    }
    customerMap[t.customer_id].tickets.push(t);
  });

  const processedCustomers = Object.values(customerMap)
    .filter(c => c.tickets.length > 0)
    .map(c => {
      const customerTickets = c.tickets;
      const total = customerTickets.length;
      const open = customerTickets.filter(t => t.status === 'open' && getDerivedStatus(t) !== 'in_progress' && getDerivedStatus(t) !== 'waiting_reply').length;
      const inProgress = customerTickets.filter(t => getDerivedStatus(t) === 'in_progress').length;
      const waitingReply = customerTickets.filter(t => getDerivedStatus(t) === 'waiting_reply').length;
      const closed = customerTickets.filter(t => t.status === 'closed').length;

      let lastActivityTime = c.created_at || new Date(0).toISOString();
      customerTickets.forEach(t => {
        if (t.updated_at && t.updated_at > lastActivityTime) lastActivityTime = t.updated_at;
      });

      return {
        ...c,
        totalTickets: total,
        openTickets: open + waitingReply,
        inProgressTickets: inProgress,
        closedTickets: closed,
        lastActivityTime
      };
    });

  // Filters left customer list
  const filteredCustomers = processedCustomers.filter(cust => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = cust.name?.toLowerCase().includes(q);
    const emailMatch = cust.email?.toLowerCase().includes(q);
    const idMatch = String(cust.id || '').toLowerCase().includes(q);
    const companyMatch = (cust.company || '').toLowerCase().includes(q);
    const ticketIdMatch = cust.tickets.some(t => String(t.id || '').toLowerCase().includes(q));
    const searchMatch = !q || nameMatch || emailMatch || idMatch || companyMatch || ticketIdMatch;

    if (!searchMatch) return false;

    if (filterStatus === 'open') {
      return cust.tickets.some(t => t.status === 'open');
    }
    if (filterStatus === 'high_priority') {
      return cust.tickets.some(t => t.status === 'open' && (t.priority === 'high' || t.priority === 'critical'));
    }
    if (filterStatus === 'waiting_reply') {
      return cust.tickets.some(t => t.status === 'open' && getDerivedStatus(t) === 'waiting_reply');
    }
    if (filterStatus === 'assigned_me') {
      const myNames = ['Admin', user?.email, user?.user_metadata?.full_name].filter(Boolean);
      return cust.tickets.some(t => t.status === 'open' && myNames.some(name => String(t.assignee).toLowerCase() === String(name).toLowerCase()));
    }
    if (filterStatus === 'unassigned') {
      return cust.tickets.some(t => t.status === 'open' && !t.assignee);
    }
    return true;
  });

  // Sort customer list (default: Last activity time desc)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    return new Date(b.lastActivityTime) - new Date(a.lastActivityTime);
  });

  // Returning all sorted customers for scrollable list
  const paginatedCustomers = sortedCustomers;

  // Selected customer object
  const selectedCustomer = selectedCustomerId ? (customers.find(c => c.id === selectedCustomerId) || processedCustomers.find(c => c.id === selectedCustomerId)) : null;

  // Selected customer tickets
  const custTickets = selectedCustomerId ? tickets.filter(t => t.customer_id === selectedCustomerId) : [];

  // Filter middle customer tickets
  const filteredCustomerTickets = custTickets.filter(t => {
    if (ticketFilter === 'open') return t.status === 'open';
    if (ticketFilter === 'closed') return t.status === 'closed';
    if (ticketFilter === 'resolved') return t.status === 'closed';
    if (ticketFilter === 'in_progress') return getDerivedStatus(t) === 'in_progress';
    if (ticketFilter === 'waiting_reply') return getDerivedStatus(t) === 'waiting_reply';
    return true;
  }).sort((a, b) => {
    if (ticketSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (ticketSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (ticketSort === 'highest_priority') {
      const w = { high: 3, normal: 2, low: 1 };
      return (w[b.priority] || 2) - (w[a.priority] || 2);
    }
    return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
  });

  // Compile Activity Timeline
  const activityTimeline = compileActivityTimeline(custTickets, customerInvoices, customerJobs, customerProducts);

  function compileActivityTimeline(tkts, invs, jbs, prods) {
    const list = [];
    tkts.forEach(t => {
      const tId = t.id.slice(0, 8).toUpperCase();
      list.push({
        id: `tkt-opened-${t.id}`,
        title: 'Ticket Created',
        description: `#${tId} "${t.subject}"`,
        date: new Date(t.created_at),
        icon: Ticket,
        color: '#f59e0b'
      });
      if (t.status === 'closed') {
        list.push({
          id: `tkt-closed-${t.id}`,
          title: 'Ticket Closed',
          description: `#${tId} "${t.subject}"`,
          date: new Date(t.updated_at || t.created_at),
          icon: CheckCircle2,
          color: '#10b981'
        });
      }
    });
    invs.forEach(inv => {
      list.push({
        id: `inv-created-${inv.id}`,
        title: 'Invoice Created',
        description: `#${inv.invoice_no || 'INV'} - LKR ${inv.total?.toLocaleString()}`,
        date: new Date(inv.created_at || inv.invoice_date),
        icon: FileText,
        color: '#3b82f6'
      });
      if (inv.status === 'paid') {
        list.push({
          id: `inv-paid-${inv.id}`,
          title: 'Invoice Paid',
          description: `#${inv.invoice_no || 'INV'} - LKR ${inv.total?.toLocaleString()}`,
          date: new Date(inv.updated_at || inv.created_at),
          icon: DollarSign,
          color: '#10b981'
        });
      }
    });
    prods.forEach(p => {
      list.push({
        id: `prod-added-${p.id}`,
        title: `${p.type} Active`,
        description: p.name,
        date: new Date(p.expiry ? new Date(p.expiry).getTime() - 15*24*3600*1000 : Date.now()),
        icon: Activity,
        color: '#8b5cf6'
      });
    });
    jbs.forEach(j => {
      const jId = j.id.slice(0, 4).toUpperCase();
      list.push({
        id: `job-created-${j.id}`,
        title: 'Job Created',
        description: `#${jId} "${j.title}"`,
        date: new Date(j.created_date || j.created_at),
        icon: Building,
        color: '#a855f7'
      });
      if (j.status === 'Completed') {
        list.push({
          id: `job-completed-${j.id}`,
          title: 'Job Completed',
          description: `#${jId} "${j.title}"`,
          date: new Date(j.updated_at || j.created_at),
          icon: CheckCircle2,
          color: '#10b981'
        });
      }
    });
    list.sort((a, b) => b.date - a.date);
    return list.slice(0, 8);
  }

  // Handle selecting a customer from left column
  const selectCustomer = (cust) => {
    setSelectedCustomerId(cust.id);
    loadCustomerProducts(cust.id);
    loadCustomerTimelineData(cust.id, cust.email);

    // Auto open latest active ticket, or latest closed
    const cTkts = tickets.filter(t => t.customer_id === cust.id);
    const active = cTkts.filter(t => t.status !== 'closed');
    let target = null;
    if (active.length > 0) {
      target = active.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
    } else if (cTkts.length > 0) {
      target = cTkts.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
    }

    if (target) {
      openTicket(target);
    } else {
      setSelected(null);
    }

    if (isMobileView) {
      setMobileView('chat');
    }
  };

  // Determine online status
  const isOnline = (customer) => {
    const hash = customer.name ? customer.name.charCodeAt(0) + customer.name.charCodeAt(customer.name.length - 1) : 0;
    return hash % 3 === 0;
  };

  // Derived statuses counts for selected customer
  const totalCount = custTickets.length;
  const openCount = custTickets.filter(t => t.status === 'open' && getDerivedStatus(t) !== 'in_progress').length;
  const inProgressCount = custTickets.filter(t => getDerivedStatus(t) === 'in_progress').length;
  const closedCount = custTickets.filter(t => t.status === 'closed').length;

  // Send Reply / Internal Note
  async function handleSend() {
    const textToSend = reply.trim();
    if ((!textToSend && screenshots.length === 0) || !selected) return;
    setSending(true);
    try {
      let messageContent = textToSend;
      if (screenshots.length > 0) {
        messageContent += '\n\n--- SCREENSHOTS ---\n' + screenshots.map(url => `[Screenshot](${url})`).join('\n');
      }

      // If note tab, use role 'note' or 'internal'
      const role = editorTab === 'note' ? 'note' : 'admin';
      const msg = await addTicketMessage(selected.id, role, messageContent.trim(), selected.assignee);
      
      setMessages(m => [...m, msg]);
      setReply('');
      setScreenshots([]);
      setShowScreenshotHelper(false);
      if (replyRef.current) { replyRef.current.innerHTML = ''; }
      
      if (role === 'admin') {
        await addNotification({
          customer_id: selected.customer_id,
          type: 'ticket:' + selected.id,
          title: 'Support reply received',
          message: `Admin replied to your ticket: ${selected.subject}`,
        });
      }
      
      // Update local ticket list
      setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, updated_at: new Date().toISOString(), ticket_messages: [...(t.ticket_messages || []), msg] } : t));
      toast({ title: role === 'note' ? 'Internal note added' : 'Reply sent successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to submit', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  // Create Ticket Submit
  async function handleCreateTicketSubmit(e) {
    if (e) e.preventDefault();
    if (!selectedCustomer) return;
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      toast({ title: 'Required', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    setIsCreatingTicket(true);
    try {
      // 1. Create ticket
      const ticket = await createTicket(selectedCustomer.id, newTicketSubject.trim(), newTicketPriority, 'Technical Support', null, true);

      // 2. Add message under customer identity (sender_role: 'customer')
      await addTicketMessage(ticket.id, 'customer', newTicketMessage.trim());

      // 3. Notify admin that a new support ticket was created
      await addNotification({
        customer_id: null,
        type: 'ticket:' + ticket.id,
        title: 'New support ticket',
        message: `${selectedCustomer.name || selectedCustomer.email} opened a ticket: ${newTicketSubject.trim()}`,
      }).catch(() => {});

      toast({ title: 'Ticket Created', description: `Successfully opened ticket: "${newTicketSubject}"` });
      setShowCreateTicketModal(false);
      setNewTicketSubject('');
      setNewTicketMessage('');
      setNewTicketPriority('normal');
      
      await load();
      openTicket(ticket);
      if (isMobileView) setMobileView('chat');
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to create ticket', variant: 'destructive' });
    } finally {
      setIsCreatingTicket(false);
    }
  }

  // Send Email Submit
  async function handleSendEmailSubmit() {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({ title: 'Fields cannot be empty', variant: 'destructive' });
      return;
    }
    setEmailSending(true);
    try {
      // 1. Invoke send-email Edge Function
      const { data: funcData, error: funcError } = await supabase.functions.invoke('send-email', {
        body: {
          to: selectedCustomer.email,
          subject: emailSubject.trim(),
          body: emailBody.trim()
        }
      });

      if (funcError || (funcData && funcData.error)) {
        throw new Error(funcError?.message || funcData?.error || 'Email service error');
      }

      // Log to email_logs
      try {
        await supabase.from('email_logs').insert([{
          customer_id: selectedCustomer.id,
          sent_at: new Date().toISOString(),
          subject: emailSubject,
          body: emailBody,
          recipient: selectedCustomer.email
        }]);
      } catch (dbErr) {
        console.warn('Could not save email log in DB, simulating...', dbErr);
      }

      setShowSendEmailModal(false);
      setEmailSubject('');
      setEmailBody('');
      toast({ title: 'Email Sent', description: `Successfully sent message to ${selectedCustomer.email}` });
      
      // Update timeline
      loadCustomerTimelineData(selectedCustomer.id, selectedCustomer.email);
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to send email', description: err.message || 'Please check email settings.', variant: 'destructive' });
    } finally {
      setEmailSending(false);
    }
  }

  // Add Internal Note Submit
  async function handleAddNoteSubmit() {
    if (!noteContent.trim()) {
      toast({ title: 'Note content is required', variant: 'destructive' });
      return;
    }
    setNoteSaving(true);
    try {
      const { error } = await supabase.from('customer_notes').insert([{
        customer_id: selectedCustomer.id,
        note_type: noteType,
        note_content: noteContent,
        created_by: user?.user_metadata?.full_name || 'Admin'
      }]);
      if (error) throw error;
      
      setShowAddNoteModal(false);
      setNoteContent('');
      toast({ title: 'Note Added successfully' });
      
      loadCustomerTimelineData(selectedCustomer.id, selectedCustomer.email);
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to save note', variant: 'destructive' });
    } finally {
      setNoteSaving(false);
    }
  }

  // Impersonate
  const handleImpersonate = (cust) => {
    sessionStorage.setItem('impersonated_user', JSON.stringify({
      id: cust.user_id,
      email: cust.email,
      name: cust.name
    }));
    window.open(`/admin/impersonate/${cust.id}`, '_blank');
  };

  // Toggle Restricted status
  async function handleToggleStatus() {
    if (!selectedCustomer) return;
    const newStatus = selectedCustomer.status === 'active' ? 'restricted' : 'active';
    try {
      const { error } = await supabase.from('customers').update({ status: newStatus }).eq('id', selectedCustomer.id);
      if (error) throw error;
      
      toast({ title: `Customer marked as ${newStatus}` });
      await load();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to change status', variant: 'destructive' });
    }
  }

  // Reset Password
  async function handleResetPassword() {
    if (!selectedCustomer) return;
    try {
      await supabase.auth.resetPasswordForEmail(selectedCustomer.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      toast({ title: `Reset email sent to ${selectedCustomer.email}` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to send reset link', variant: 'destructive' });
    }
  }

  // Original helper function setups
  async function handleAssign(assigneeName) {
    if (!selected || !assigneeName.trim()) return;
    try {
      const result = await assignTicket(selected.id, assigneeName.trim());
      const updatedSelected = { ...selected, assignee: result.assignee };
      setSelected(updatedSelected);
      setMessages(msgs => [...msgs, result.systemMessage]);
      setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, assignee: result.assignee, updated_at: new Date().toISOString() } : t));
      
      await addNotification({
        customer_id: selected.customer_id,
        type: 'ticket:' + selected.id,
        title: 'Ticket Assigned',
        message: `Your ticket has been assigned to ${result.assignee}.`,
      });
      toast({ title: 'Ticket assigned successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to assign ticket', variant: 'destructive' });
    }
  }

  async function handleTransfer(assigneeName) {
    if (!selected || !assigneeName.trim()) return;
    try {
      const prevAssignee = selected.assignee || 'Admin';
      const result = await transferTicket(selected.id, assigneeName.trim(), prevAssignee);
      const updatedSelected = { ...selected, assignee: result.assignee };
      setSelected(updatedSelected);
      setMessages(msgs => [...msgs, result.systemMessage]);
      setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, assignee: result.assignee, updated_at: new Date().toISOString() } : t));
      
      await addNotification({
        customer_id: selected.customer_id,
        type: 'ticket:' + selected.id,
        title: 'Ticket Transferred',
        message: `Your ticket has been transferred to ${result.assignee}.`,
      });
      setShowTransferModal(false);
      setCustomTransfer('');
      toast({ title: 'Ticket transferred successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to transfer ticket', variant: 'destructive' });
    }
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
        type: 'ticket:' + selected.id,
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
      console.error(e);
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

  // Formatting helpers
  function handleAddScreenshot() {
    if (!screenshotInput.trim()) return;
    const url = screenshotInput.trim();
    try { new URL(url); } catch (e) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid absolute URL.', variant: 'destructive' });
      return;
    }
    setScreenshots(prev => [...prev, url]);
    setScreenshotInput('');
  }

  function handleRemoveScreenshot(index) {
    setScreenshots(prev => prev.filter((_, idx) => idx !== index));
  }

  function handleInsertLink() {
    if (!linkUrl.trim() || !linkText.trim()) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (savedRangeRef.current) selection.addRange(savedRangeRef.current);

    const a = document.createElement('a');
    a.href = linkUrl.trim();
    a.textContent = linkText.trim();
    a.target = '_blank';

    if (savedRangeRef.current) {
      savedRangeRef.current.deleteContents();
      savedRangeRef.current.insertNode(a);
      const suffix = document.createTextNode('\u200B');
      a.parentNode.insertBefore(suffix, a.nextSibling);
      const range = document.createRange();
      range.setStart(suffix, 1);
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
        if (replyRef.current) replyRef.current.focus();
        toast({ title: 'Clipboard access blocked', description: 'Use Ctrl+V to paste.', variant: 'default' });
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
          let href = url.toLowerCase().startsWith('www.') ? 'https://' + url : url;
          const a = document.createElement('a');
          a.href = href;
          a.textContent = url;
          a.target = '_blank';
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(a);
            const suffix = document.createTextNode('\u200B');
            a.parentNode.insertBefore(suffix, a.nextSibling);
            const newRange = document.createRange();
            newRange.setStart(suffix, 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else if (replyRef.current) {
            replyRef.current.appendChild(a);
          }
          setReply(htmlToMarkdown(replyRef.current));
        } else {
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const lines = text.split('\n');
            const frag = document.createDocumentFragment();
            lines.forEach((line, index) => {
              if (index > 0) frag.appendChild(document.createElement('br'));
              frag.appendChild(document.createTextNode(line));
            });
            range.insertNode(frag);
            setReply(htmlToMarkdown(replyRef.current));
          } else if (replyRef.current) {
            replyRef.current.appendChild(document.createTextNode(text));
            setReply(htmlToMarkdown(replyRef.current));
          }
        }
      }
    } catch {
      if (replyRef.current) replyRef.current.focus();
      toast({ title: 'Clipboard access blocked', description: 'Use Ctrl+V to paste.', variant: 'default' });
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
          prefix = '**'; suffix = '**';
        } else if (tagName === 'em' || tagName === 'i' || (child.style && child.style.fontStyle === 'italic')) {
          prefix = '*'; suffix = '*';
        } else if (tagName === 'u' || (child.style && child.style.textDecoration === 'underline')) {
          prefix = '<u>'; suffix = '</u>';
        } else if (tagName === 'code') {
          const isBlock = child.parentNode && child.parentNode.tagName.toLowerCase() === 'pre';
          if (isBlock) {
            markdown += htmlToMarkdown(child);
            continue;
          } else {
            prefix = '`'; suffix = '`';
          }
        } else if (tagName === 'pre') {
          prefix = '```\n'; suffix = '\n```';
        } else if (tagName === 'a') {
          const href = child.getAttribute('href') || '';
          prefix = '['; suffix = `](${href})`;
        } else if (tagName === 'blockquote') {
          const innerMd = htmlToMarkdown(child).trim();
          markdown += innerMd.split('\n').map(line => `> ${line}`).join('\n') + '\n';
          continue;
        } else if (tagName === 'br') {
          markdown += '\n';
          continue;
        } else if (tagName === 'div' || tagName === 'p') {
          let innerMd = htmlToMarkdown(child);
          if (innerMd.endsWith('\n')) innerMd = innerMd.slice(0, -1);
          if (markdown && !markdown.endsWith('\n')) markdown += '\n';
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
      let href = url.toLowerCase().startsWith('www.') ? 'https://' + url : url;
      const a = document.createElement('a');
      a.href = href;
      a.textContent = url;
      a.target = '_blank';
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(a);
        const suffix = document.createTextNode('\u200B');
        a.parentNode.insertBefore(suffix, a.nextSibling);
        const newRange = document.createRange();
        newRange.setStart(suffix, 1);
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
        if (node.nodeType === 3) node = node.parentNode;
        
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
          if (node.nodeType === 3) node = node.parentNode;
          
          const hasBold = node && (node.closest('strong') || node.closest('b') || (node.style && node.style.fontWeight === 'bold'));
          const hasItalic = node && (node.closest('em') || node.closest('i') || (node.style && node.style.fontStyle === 'italic'));
          const hasUnderline = node && (node.closest('u') || (node.style && node.style.textDecoration === 'underline'));
          const hasQuote = node && node.closest('blockquote');
          const hasCode = node && (node.closest('code') || node.closest('pre'));
          
          if (!!formats.bold === !!hasBold && !!formats.italic === !!hasItalic && !!formats.underline === !!hasUnderline && !!formats.quote === !!hasQuote && !!formats.code === !!hasCode) {
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
            if (!topElement) topElement = el; else currentElement.appendChild(el);
            currentElement = el;
          }
          if (formats.italic) {
            const el = document.createElement('em');
            if (!topElement) topElement = el; else currentElement.appendChild(el);
            currentElement = el;
          }
          if (formats.underline) {
            const el = document.createElement('u');
            if (!topElement) topElement = el; else currentElement.appendChild(el);
            currentElement = el;
          }
          if (formats.quote) {
            const el = document.createElement('blockquote');
            if (!topElement) topElement = el; else currentElement.appendChild(el);
            currentElement = el;
          }
          if (formats.code) {
            const el = document.createElement('code');
            if (!topElement) topElement = el; else currentElement.appendChild(el);
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
              if (
                (tag === 'strong' || tag === 'b' && formatsToExit.includes('bold')) ||
                (tag === 'em' || tag === 'i' && formatsToExit.includes('italic')) ||
                (tag === 'u' && formatsToExit.includes('underline')) ||
                (tag === 'blockquote' && formatsToExit.includes('quote')) ||
                (tag === 'code' && formatsToExit.includes('code'))
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
          
          if (currentElement) currentElement.appendChild(textNode);
          const nodeToInsert = topElement || textNode;
          if (insertParent) {
            if (insertSibling) insertParent.insertBefore(nodeToInsert, insertSibling);
            else insertParent.appendChild(nodeToInsert);
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
      newRange.collapse(false);
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
      handleSelectionChange({ currentTarget: editor });
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
    if (isEdit) setEditText(md);
    else setReply(md);
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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
        items.push({ type: 'block', html: `<blockquote>${inlineMarkdownToHtml(trimmed.slice(2))}</blockquote>` });
      } else if (trimmed.startsWith('```')) {
        let code = '';
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          code += (code ? '\n' : '') + lines[j];
          j++;
        }
        items.push({ type: 'block', html: `<pre><code>${escapeHtml(code)}</code></pre>` });
        i = j;
      } else {
        items.push({ type: 'text', html: inlineMarkdownToHtml(line) });
      }
    }
    
    let html = '';
    for (let i = 0; i < items.length; i++) {
      const curr = items[i];
      const next = items[i + 1];
      html += curr.html;
      if (curr.type === 'text') {
        if (curr.html === '' || next && next.type === 'text') html += '<br>';
      }
    }
    return html;
  }

  function linkifyText(text, isOnBrand, key) {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    if (parts.length === 1) return text;
    return parts.map((part, index) => {
      if (part.match(/^https?:\/\//i) || part.match(/^www\./i)) {
        let href = part;
        let cleanText = part;
        let trailing = '';
        const tm = part.match(/([.,!?;:]+)$/);
        if (tm) {
          trailing = tm[1];
          cleanText = part.slice(0, -trailing.length);
          href = cleanText;
        }
        if (cleanText.endsWith(')')) {
          const openC = (cleanText.match(/\(/g) || []).length;
          const closeC = (cleanText.match(/\)/g) || []).length;
          if (closeC > openC) {
            trailing = ')' + trailing;
            cleanText = cleanText.slice(0, -1);
            href = cleanText;
          }
        }
        if (href.toLowerCase().startsWith('www.')) href = 'https://' + href;
        return (
          <React.Fragment key={`${key}-link-${index}`}>
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: isOnBrand ? '#b3d9ff' : '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}>
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
      if (inLink) return node.nodeValue;
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
            <code key={key} style={{ background: isOnBrand ? 'rgba(255,255,255,0.12)' : c.hover, padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: "'Fira Code', monospace" }}>
              {children}
            </code>
          );
        case 'blockquote':
          return (
            <blockquote key={key} style={{ borderLeft: `3px solid ${isOnBrand ? 'rgba(255,255,255,0.35)' : c.brand}`, paddingLeft: 10, margin: '4px 0', color: isOnBrand ? 'rgba(255,255,255,0.8)' : c.subText, fontStyle: 'italic' }}>
              {children}
            </blockquote>
          );
        case 'a':
          const href = node.getAttribute('href') || '';
          const safeHref = href.trim().toLowerCase().startsWith('javascript:') ? '#' : href;
          return (
            <a key={key} href={safeHref} target="_blank" rel="noopener noreferrer" style={{ color: isOnBrand ? '#b3d9ff' : '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}>
              {children}
            </a>
          );
        default:
          return <span key={key}>{children}</span>;
      }
    }
    return null;
  }

  function renderInline(text, isOnBrand) {
    if (!text) return '';
    let html = text;
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
      const sec = parts[1] || '';
      const matches = sec.match(/\[Screenshot\]\((https?:\/\/[^\s)]+)\)/g) || [];
      screenshotUrls = matches.map(m => {
        const match = m.match(/\((https?:\/\/[^\s)]+)\)/);
        return match ? match[1] : null;
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
        if (line === '') out.push(<div key={`l${i}`}><br/></div>);
        else out.push(<div key={`l${i}`}>{renderInline(line, isOnBrand)}</div>);
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
                    position: 'relative', width: 140, height: 90, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                    border: `1px solid ${isOnBrand ? 'rgba(255,255,255,0.2)' : c.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: '#000'
                  }}
                  title="Click to view full image"
                >
                  <img src={url} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = 'https://placehold.co/140x90/222/fff?text=Invalid+Image'; }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'} />
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
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', borderRadius: 6,
        background: active ? (isAdmin ? 'rgba(255,255,255,0.2)' : c.brand) : 'transparent', color: active ? '#fff' : c.subText, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
      }}
    >
      <Icon size={15} />
    </button>
  );

  const tbd = <div style={{ width: 1, height: 18, background: c.border, margin: '0 4px' }} />;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobileView ? '1fr' : '320px minmax(0, 1fr)',
      gap: 0,
      width: '100%',
      height: '100%',
      flex: 1,
      minWidth: 0,
      minHeight: isMobileView ? 'auto' : 550,
      border: `1px solid ${c.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      boxSizing: 'border-box',
      background: c.bg
    }}>
      {/* ================= COLUMN 1: CUSTOMERS LIST ================= */}
      <div style={{ 
        borderRight: `1px solid ${c.border}`, 
        display: isMobileView ? (mobileView === 'customers' ? 'flex' : 'none') : 'flex', 
        flexDirection: 'column', 
        background: c.card, 
        minHeight: 0 
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={15} style={{ color: c.brand }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>Customers</span>
            <span style={{ fontSize: 11, color: c.subText, background: c.hover, borderRadius: 10, padding: '1px 7px' }}>{processedCustomers.length}</span>
          </div>
          <button onClick={() => load(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}>
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.border}`, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              ...inp,
              width: '100%',
              padding: '8px 12px 8px 30px',
              background: isDark ? 'rgba(255,255,255,0.03)' : '#f5f5f5',
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              color: c.text,
              fontSize: 12
            }}
          />
        </div>

        {/* Filter tags */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: `1px solid ${c.border}`, overflowX: 'auto', flexShrink: 0 }}>
          {[
            { id: 'all', label: 'All', count: processedCustomers.length },
            { id: 'open', label: 'With Open', count: processedCustomers.filter(cu => cu.tickets.some(t => t.status === 'open')).length },
            { id: 'high_priority', label: 'High Priority', count: processedCustomers.filter(cu => cu.tickets.some(t => t.status === 'open' && (t.priority === 'high' || t.priority === 'critical'))).length }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterStatus(btn.id)}
              style={{
                border: 'none',
                background: filterStatus === btn.id ? c.brand : c.hover,
                color: filterStatus === btn.id ? '#fff' : c.subText,
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.12s'
              }}
            >
              <span>{btn.label}</span>
              <span style={{ fontSize: 9, opacity: 0.8, background: filterStatus === btn.id ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: 4 }}>{btn.count}</span>
            </button>
          ))}
        </div>

        {/* Secondary filters dropdown */}
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: c.subText, display: 'flex', alignItems: 'center', gap: 4 }}>
            <SlidersHorizontal size={11} /> Filters
          </span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: c.text,
              fontSize: 11,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">No Filter</option>
            <option value="open">Open Tickets</option>
            <option value="waiting_reply">Waiting Reply</option>
            <option value="assigned_me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {/* Customer Cards List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 86, margin: '8px 12px', borderRadius: 8, background: c.hover }} />
            ))
          ) : paginatedCustomers.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: c.subText, fontSize: 12 }}>
              <User size={30} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              No customers found
            </div>
          ) : paginatedCustomers.map(cust => {
            const isCustomerSelected = selectedCustomerId === cust.id;
            const hasUnreadTicket = cust.tickets.some(t => isUnread(t) && t.status === 'open');
            const hasWaitingReply = cust.tickets.some(t => t.status === 'open' && getDerivedStatus(t) === 'waiting_reply');
            return (
              <div
                key={cust.id}
                onClick={() => selectCustomer(cust)}
                className={hasUnreadTicket ? 'orange-blink-card' : ''}
                style={{
                  padding: '12px 14px',
                  borderBottom: `1px solid ${c.border}`,
                  cursor: 'pointer',
                  background: isCustomerSelected ? (isDark ? 'rgba(232,123,53,0.12)' : 'rgba(232,123,53,0.06)') : 'transparent',
                  borderLeft: isCustomerSelected ? `3px solid ${c.brand}` : '3px solid transparent',
                  transition: 'background 0.1s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isCustomerSelected) e.currentTarget.style.background = c.hover; }}
                onMouseLeave={e => { e.currentTarget.style.background = isCustomerSelected ? (isDark ? 'rgba(232,123,53,0.12)' : 'rgba(232,123,53,0.06)') : 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: avatarColor(cust.name), color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700
                    }}>
                      {getInitials(cust.name)}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: -1, right: -1,
                      width: 9, height: 9, borderRadius: '50%',
                      background: hasWaitingReply ? '#f97316' : '#9ca3af',
                      border: `1.5px solid ${isDark ? '#1C1E24' : '#fff'}`
                    }} title={hasWaitingReply ? "Awaiting Admin Reply" : "No pending replies"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerId(cust.id);
                            loadCustomerProducts(cust.id);
                            loadCustomerTimelineData(cust.id, cust.email);
                            setShowSummaryModal(true);
                          }}
                          title="View Profile Summary"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: c.brand,
                            borderRadius: '4px',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = c.hover; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <User size={13} />
                        </button>
                      </div>
                      <span style={{ fontSize: 9, color: c.subText, flexShrink: 0 }}>{fmtTime(cust.lastActivityTime)}</span>
                    </div>
                    <span style={{ fontSize: 11, color: c.subText, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.email}</span>
                  </div>
                </div>
                {/* Counts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, textAlign: 'center', marginTop: 8, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 6, padding: '4px' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c.text }}>{cust.totalTickets}</div>
                    <div style={{ fontSize: 8, color: c.subText, textTransform: 'uppercase' }}>Total</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      {cust.openTickets}
                      {hasUnreadTicket && <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.brand }} />}
                    </div>
                    <div style={{ fontSize: 8, color: '#f59e0b', textTransform: 'uppercase' }}>Open</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>{cust.inProgressTickets}</div>
                    <div style={{ fontSize: 8, color: '#3b82f6', textTransform: 'uppercase' }}>Progress</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{cust.closedTickets}</div>
                    <div style={{ fontSize: 8, color: '#10b981', textTransform: 'uppercase' }}>Closed</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Customer details column removed from grid - summary is now a popup modal */}

      {/* ================= COLUMN 3: TICKET CONVERSATION PANEL ================= */}
      {selected ? (
        <div style={{ 
          display: isMobileView ? (mobileView === 'chat' ? 'flex' : 'none') : 'flex', 
          flexDirection: 'column', 
          background: isDark ? '#15161A' : '#f8f8f7', 
          minHeight: 0,
          minWidth: 0,
          gridColumn: isMobileView ? '1' : 'auto'
        }}>
          {/* Header */}
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 12, background: c.card }}>
            {isMobileView && (
              <button
                onClick={() => setMobileView('customers')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.brand, display: 'flex', alignItems: 'center', padding: '4px 6px 4px 0' }}
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  #{selected.id.slice(0, 8).toUpperCase()} · {selected.subject}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: c.brand, background: c.brand + '15',
                  padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5
                }}>
                  {getTicketCategory(selected)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: c.subText }}>
                {selected.assignee ? <>Assigned to: <strong style={{ color: c.brand }}>{selected.assignee}</strong></> : 'Unassigned'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {selected.status === 'open' && selected.assignee && (
                <button onClick={() => setShowTransferModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, borderRadius: 6, cursor: 'pointer', fontSize: 11 }} title="Transfer Ticket">
                  <ArrowLeftRight size={12} /> {!isMobileView && 'Transfer'}
                </button>
              )}
              {selected.status === 'open' ? (
                <button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, borderRadius: 6, cursor: 'pointer', fontSize: 11 }} title="Close Ticket">
                  <CheckCircle size={12} /> {!isMobileView && 'Close'}
                </button>
              ) : (
                <>
                  <button onClick={handleDeleteTicket} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', border: `1px solid #ef4444`, background: 'transparent', color: '#ef4444', borderRadius: 6, cursor: 'pointer', fontSize: 11 }} title="Delete Ticket">
                    <Trash2 size={12} /> {!isMobileView && 'Delete'}
                  </button>
                  <button onClick={handleReopen} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', border: `1px solid ${c.brand}`, background: 'transparent', color: c.brand, borderRadius: 6, cursor: 'pointer', fontSize: 11 }} title="Reopen Ticket">
                    <RefreshCw size={12} /> {!isMobileView && 'Reopen'}
                  </button>
                </>
              )}
              
              <div style={{ width: 1, height: 16, background: c.border, margin: '0 4px' }} />
              
              <button 
                onClick={() => {
                  setSelected(null);
                  if (isMobileView) {
                    setMobileView('customers');
                  }
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: c.subText, 
                  display: 'flex', 
                  padding: '4px',
                  borderRadius: 4,
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = c.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Close Conversation View"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages conversation list */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, minWidth: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgLoading ? (
              <div style={{ textAlign: 'center', color: c.subText, fontSize: 12, paddingTop: 40 }}>Loading messages…</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: c.subText, fontSize: 12, paddingTop: 40 }}>No messages yet.</div>
            ) : messages.map((msg, index) => {
              const isSystem = msg.sender_role === 'system';
              const isNote = msg.sender_role === 'note' || msg.sender_role === 'internal';
              
              if (isSystem) {
                const isEditing = editingMsgId === msg.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0', width: '100%' }}>
                    {isEditing ? (
                      <div style={{ width: '100%', maxWidth: 400, background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 12 }}>
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          style={{
                            width: '100%', minHeight: 60, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${c.border}`,
                            background: isDark ? '#22252C' : '#fff', color: c.text, fontSize: 12, outline: 'none', fontFamily: 'inherit', resize: 'vertical'
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                          <button onClick={() => { setEditingMsgId(null); setEditText(''); }} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 6, background: 'transparent', color: c.subText, cursor: 'pointer', fontSize: 11 }}>
                            Cancel
                          </button>
                          <button onClick={handleSaveEdit} disabled={!editText.trim()} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: c.brand, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: c.subText, fontSize: 10, padding: '3px 10px', borderRadius: 10, border: `1px solid ${c.border}`, textAlign: 'center' }}>
                          {msg.message}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (isNote) {
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', margin: '6px 0', width: '100%' }}>
                    <div style={{
                      background: isDark ? '#292116' : '#fffbeb',
                      color: isDark ? '#f6ad55' : '#b7791f',
                      border: `1.5px solid ${isDark ? '#4a361c' : '#fef3c7'}`,
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 12,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 9, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                        <span>🔒 Internal Note</span>
                        <span style={{ fontWeight: 400, opacity: 0.8 }}>by {msg.sender_name || 'Admin'} · {fmtTime(msg.created_at)}</span>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{renderMessageText(msg.message, false)}</div>
                    </div>
                  </div>
                );
              }

              const isSenderAdmin = msg.sender_role === 'admin';
              const isEditing = editingMsgId === msg.id;
              const isEdited = !!msg.edited_at;

              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isSenderAdmin ? 'flex-end' : 'flex-start', flexDirection: 'column', alignItems: isSenderAdmin ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', minWidth: 0, ...(isEditing ? { width: '100%' } : {}) }}>
                    <div style={{ fontSize: 9, color: c.subText, marginBottom: 3, textAlign: isSenderAdmin ? 'right' : 'left' }}>
                      {isSenderAdmin ? `You (${msg.sender_name || 'Admin'})` : (selected.customers?.name || 'Customer')} · {fmtTime(msg.created_at)}
                      {selected.created_by_admin && index === 0 && (
                        <span style={{ color: '#3b82f6', fontWeight: 600, marginLeft: 6 }}>
                          (Opened by Admin)
                        </span>
                      )}
                    </div>
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: isSenderAdmin ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isSenderAdmin ? '#1E1E24' : c.card,
                      color: isSenderAdmin ? '#e8e8e8' : c.text,
                      fontSize: 12,
                      lineHeight: 1.4,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      border: isSenderAdmin ? `1px solid ${c.brand}` : `1px solid ${c.border}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      position: 'relative'
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <textarea
                            ref={editRef}
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            style={{
                              width: '100%', minHeight: 60, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${c.border}`,
                              background: isDark ? '#22252C' : '#fff', color: c.text, fontSize: 12, outline: 'none', fontFamily: 'inherit', resize: 'vertical'
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button onClick={() => { setEditingMsgId(null); setEditText(''); }} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 6, background: 'transparent', color: c.subText, cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                            <button onClick={handleSaveEdit} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: c.brand, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>{renderMessageText(msg.message, isSenderAdmin)}</div>
                          {selected.created_by_admin && index === 0 && (
                            <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6, borderTop: `1px solid ${isSenderAdmin ? 'rgba(255,255,255,0.1)' : c.border}`, paddingTop: 4, fontStyle: 'italic', textAlign: isSenderAdmin ? 'right' : 'left' }}>
                              Ticket opened by Admin
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {!isEditing && extractUrls(msg.message).length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {extractUrls(msg.message).map(u => (
                          <LinkPreviewCard key={u} url={u} isOnBrand={isSenderAdmin} c={c} />
                        ))}
                      </div>
                    )}
                    {(isEdited || isSenderAdmin) && !isEditing && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: isSenderAdmin ? 'flex-end' : 'flex-start', marginTop: 3 }}>
                        {isEdited && (
                          <span style={{ fontSize: 9, color: c.subText, fontStyle: 'italic' }}>Edited</span>
                        )}
                        {isSenderAdmin && (
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button onClick={() => handleEditMessage(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 2 }} title="Edit">
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => handleDeleteMessage(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef444490', display: 'flex', padding: 2 }} title="Delete">
                              <Trash2 size={12} />
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



          {/* Reply Editor & Send Input */}
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${c.border}`, background: c.card }}>
            {selected.status === 'closed' ? (
              <div style={{ padding: '8px 12px', background: c.hover, borderRadius: 8, fontSize: 11, color: c.subText, textAlign: 'center' }}>
                This ticket is closed. Click <strong>Reopen Ticket</strong> to resume.
              </div>
            ) : !selected.assignee ? (
              <div style={{ padding: '16px', background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', borderRadius: 10, border: `1.5px dashed ${c.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>Assign Ticket Before Replying</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['Admin', 'Dev Team', 'Design Team'].map(team => (
                    <button key={team} onClick={() => handleAssign(team)} style={{ padding: '6px 12px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {team}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Tabs for Reply vs Note */}
                <div style={{ display: 'flex', gap: 14, borderBottom: `1px solid ${c.border}`, paddingBottom: 6 }}>
                  <button
                    onClick={() => setEditorTab('reply')}
                    style={{
                      border: 'none', background: 'none', fontSize: 11, fontWeight: 700,
                      color: editorTab === 'reply' ? c.brand : c.subText,
                      borderBottom: editorTab === 'reply' ? `2px solid ${c.brand}` : '2px solid transparent',
                      paddingBottom: 4, cursor: 'pointer'
                    }}
                  >
                    Reply Customer
                  </button>
                  <button
                    onClick={() => setEditorTab('note')}
                    style={{
                      border: 'none', background: 'none', fontSize: 11, fontWeight: 700,
                      color: editorTab === 'note' ? '#f59e0b' : c.subText,
                      borderBottom: editorTab === 'note' ? '2px solid #f59e0b' : '2px solid transparent',
                      paddingBottom: 4, cursor: 'pointer'
                    }}
                  >
                    🔒 Internal Note
                  </button>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: 10, 
                  alignItems: 'stretch',
                  flexDirection: isMobileView ? 'column' : 'row'
                }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Formatting Toolbar */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px',
                      border: `1.5px solid ${c.border}`, borderBottom: 'none',
                      borderRadius: '8px 8px 0 0', background: isDark ? '#22252C' : '#f5f5f5', flexWrap: 'wrap'
                    }}>
                      {tbBtn(Bold, 'Bold', () => applyFormat('bold'), activeFormats.bold)}
                      {tbBtn(Italic, 'Italic', () => applyFormat('italic'), activeFormats.italic)}
                      {tbBtn(Underline, 'Underline', () => applyFormat('underline'), activeFormats.underline)}
                      {tbd}
                      {tbBtn(TextQuote, 'Quote', () => applyFormat('quote'), activeFormats.quote)}
                      {tbBtn(Code2, 'Code', () => applyFormat('code'), activeFormats.code)}
                      {tbd}
                      {tbBtn(Link2, 'Insert Link', () => {
                        const sel = window.getSelection();
                        if (sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
                          savedRangeRef.current = sel.getRangeAt(0);
                          setLinkText(sel.toString());
                        } else {
                          savedRangeRef.current = null;
                          setLinkText('');
                        }
                        setShowLinkModal(true);
                      })}
                      {tbBtn(Clipboard, 'Paste Link', handlePasteFromClipboard)}
                      {tbBtn(Image, 'Add Screenshot', () => setShowScreenshotHelper(!showScreenshotHelper), showScreenshotHelper)}
                    </div>

                    {/* Rich Editor Box */}
                    <div style={{ display: 'flex', border: `1.5px solid ${c.border}`, borderRadius: '0 0 8px 8px', borderTop: 'none', background: isDark ? '#22252C' : '#f5f5f5' }}>
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
                        placeholder={editorTab === 'note' ? "Type internal note..." : "Type reply..."}
                        style={{
                          ...inp, flex: 1, padding: '8px 12px', border: 'none', background: 'transparent',
                          color: c.text, fontSize: 13, minWidth: 0, minHeight: 70, maxHeight: 150, overflowY: 'auto'
                        }}
                      />
                    </div>

                    {/* Screenshot attachment section */}
                    {showScreenshotHelper && (
                      <div style={{ marginTop: 8, padding: 12, border: `1px solid ${c.border}`, borderRadius: 8, background: isDark ? '#1C1E24' : '#fafafa', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.text }}>Image link screenshot attachment</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            placeholder="Paste image link here..."
                            value={screenshotInput}
                            onChange={e => setScreenshotInput(e.target.value)}
                            style={{ flex: 1, padding: '5px 8px', border: `1px solid ${c.border}`, borderRadius: 6, background: isDark ? '#22252C' : '#fff', color: c.text, fontSize: 11, outline: 'none' }}
                          />
                          <button onClick={handleAddScreenshot} style={{ padding: '5px 10px', background: c.brand, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Add</button>
                        </div>
                        {screenshots.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                            {screenshots.map((url, idx) => (
                              <div key={idx} style={{ position: 'relative', width: 60, height: 40, borderRadius: 4, overflow: 'hidden', border: `1px solid ${c.border}` }}>
                                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button onClick={() => handleRemoveScreenshot(idx)} style={{ position: 'absolute', top: 1, right: 1, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={8} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Submit button */}
                  <button
                    onClick={handleSend}
                    disabled={sending || (!reply.trim() && screenshots.length === 0)}
                    style={{
                      alignSelf: isMobileView ? 'stretch' : 'flex-end', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px',
                      background: editorTab === 'note' ? '#f59e0b' : c.brand, color: '#fff', border: 'none', borderRadius: 8,
                      cursor: 'pointer', fontSize: 12, fontWeight: 700, height: 38,
                      opacity: sending || (!reply.trim() && screenshots.length === 0) ? 0.6 : 1
                    }}
                  >
                    <Send size={12} /> {editorTab === 'note' ? 'Save Note' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        (!isMobileView || mobileView === 'chat') && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexDirection: 'column', 
            gap: 12, 
            color: c.subText, 
            background: isDark ? '#15161A' : '#f8f8f7',
            padding: 24,
            textAlign: 'center',
            flex: 1,
            position: 'relative',
            minWidth: 0,
            gridColumn: isMobileView ? '1' : 'auto'
          }}>
            {isMobileView && (
              <button
                onClick={() => setMobileView('customers')}
                style={{ 
                  position: 'absolute', 
                  top: 14, 
                  left: 14, 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: c.brand, 
                  display: 'flex', 
                  alignItems: 'center' 
                }}
              >
                <ChevronLeft size={22} /> Back
              </button>
            )}
            <Ticket size={40} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 13 }}>Select a customer/ticket to view conversation</p>
            {selectedCustomer && (
              <button 
                onClick={() => setShowCreateTicketModal(true)} 
                style={{ 
                  marginTop: 8, 
                  padding: '8px 16px', 
                  background: c.brand, 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  fontSize: 12, 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Create New Ticket
              </button>
            )}
          </div>
        )
      )}

      {/* ================= MODAL: CUSTOMER PROFILE SUMMARY (SLIDE OUT PANEL) ================= */}
      {showSummaryModal && selectedCustomer && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowSummaryModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: isMobileView ? '90%' : '520px', height: '100%', background: c.bg,
              boxShadow: '-10px 0 30px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
              animation: 'slideIn 0.3s ease-out',
              borderLeft: `1px solid ${c.border}`
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: `1px solid ${c.border}`, background: c.card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={18} style={{ color: c.brand }} />
                <span style={{ fontWeight: 800, fontSize: 15, color: c.text }}>Customer Profile Summary</span>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: c.hover, border: 'none', borderRadius: 6, color: c.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                <X size={15} /> Close
              </button>
            </div>
            
            {/* Scrollable Container with Details */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* CUSTOMER SUMMARY CARD */}
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%',
                    background: avatarColor(selectedCustomer.name), color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, flexShrink: 0
                  }}>
                    {getInitials(selectedCustomer.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: c.text }}>{selectedCustomer.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: selectedCustomer.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: selectedCustomer.status === 'active' ? '#22c55e' : '#ef4444' }}>
                        {selectedCustomer.status === 'active' ? 'Active Customer' : String(selectedCustomer.status || 'Active').toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Grid details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px 12px', fontSize: 11, color: c.subText, marginTop: 10 }}>
                      <div>ID: <strong style={{ color: c.text }}>#{selectedCustomer.id?.slice(0, 8).toUpperCase()}</strong></div>
                      <div>Email: <strong style={{ color: c.text, wordBreak: 'break-all' }}>{selectedCustomer.email}</strong></div>
                      <div>Phone: <strong style={{ color: c.text }}>{selectedCustomer.phone || '—'}</strong></div>
                      <div>Country: <strong style={{ color: c.text }}>{selectedCustomer.country || '—'}</strong></div>
                      <div>Company: <strong style={{ color: c.text }}>{selectedCustomer.company || '—'}</strong></div>
                      <div>Member: <strong style={{ color: c.text }}>{formatDate(selectedCustomer.created_at)}</strong></div>
                    </div>
                  </div>

                  {/* Quick actions panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 120 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.subText, textTransform: 'uppercase', marginBottom: 2 }}>Quick Actions</span>
                    <button onClick={() => { setShowSummaryModal(false); setShowCreateTicketModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: c.brand, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      <Plus size={12} /> Create Ticket
                    </button>
                    <button onClick={() => { setShowSummaryModal(false); setShowSendEmailModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', border: `1px solid ${c.border}`, color: c.text, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <Mail size={12} /> Send Email
                    </button>
                    <button onClick={() => { setShowSummaryModal(false); setShowProfileModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', border: `1px solid ${c.border}`, color: c.text, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <User size={12} /> View Profile
                    </button>
                    <button onClick={() => { setShowSummaryModal(false); setShowAddNoteModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', border: `1px solid ${c.border}`, color: c.text, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <Edit3 size={12} /> Add Note
                    </button>
                  </div>
                </div>

                {/* Status summary counts rows */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                  {[
                    { label: 'Total Tickets', val: totalCount, color: c.text, bg: c.hover },
                    { label: 'Open', val: openCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                    { label: 'In Progress', val: inProgressCount, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                    { label: 'Closed', val: closedCount, color: '#10b981', bg: 'rgba(16,185,129,0.08)' }
                  ].map((s, idx) => (
                    <div key={idx} style={{ background: s.bg, padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: `1px solid ${c.border}` }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: c.subText, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CUSTOMER TICKET LIST */}
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer Tickets ({custTickets.length})</span>
                  
                  {/* Sorting and Filters */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={ticketFilter}
                      onChange={e => setTicketFilter(e.target.value)}
                      style={{ padding: '4px 8px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, color: c.text, borderRadius: 6, fontSize: 10, outline: 'none' }}
                    >
                      <option value="all">All Tickets</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_reply">Waiting Reply</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    
                    <select
                      value={ticketSort}
                      onChange={e => setTicketSort(e.target.value)}
                      style={{ padding: '4px 8px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, color: c.text, borderRadius: 6, fontSize: 10, outline: 'none' }}
                    >
                      <option value="last_updated">Last Updated</option>
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="highest_priority">Highest Priority</option>
                    </select>
                  </div>
                </div>

                {filteredCustomerTickets.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: c.subText, fontSize: 11, border: `1px dashed ${c.border}`, borderRadius: 8 }}>
                    No tickets found matching the selected filter
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${c.border}`, textAlign: 'left', color: c.subText }}>
                          <th style={{ padding: '6px 8px', fontWeight: 600 }}>ID</th>
                          <th style={{ padding: '6px 8px', fontWeight: 600 }}>Subject</th>
                          <th style={{ padding: '6px 8px', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '6px 8px', fontWeight: 600 }}>Assignee</th>
                          <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomerTickets.map(t => {
                          const isTktSelected = selected?.id === t.id;
                          const derived = getDerivedStatus(t);
                          
                          let statusColor = '#9ca3af';
                          let statusBg = 'rgba(156,163,175,0.12)';
                          let statusLabel = 'Closed';
                          
                          if (t.status === 'open') {
                            if (derived === 'waiting_reply') {
                              statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.12)'; statusLabel = 'Waiting Reply';
                            } else if (derived === 'in_progress') {
                              statusColor = '#3b82f6'; statusBg = 'rgba(59,130,246,0.12)'; statusLabel = 'In Progress';
                            } else {
                              statusColor = c.brand; statusBg = c.brand + '15'; statusLabel = 'Open';
                            }
                          }

                          return (
                            <tr
                              key={t.id}
                              onClick={() => {
                                openTicket(t);
                                setShowSummaryModal(false);
                                if (isMobileView) setMobileView('chat');
                              }}
                              style={{
                                borderBottom: `1px solid ${c.border}`,
                                cursor: 'pointer',
                                background: isTktSelected ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent',
                                fontWeight: isUnread(t) && t.status === 'open' ? 700 : 400
                              }}
                            >
                              <td style={{ padding: '10px 8px', color: c.subText }}>#{t.id.slice(0, 8).toUpperCase()}</td>
                              <td style={{ padding: '10px 8px', color: c.text, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.subject}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.subject}</span>
                                  {t.created_by_admin && (
                                    <span style={{ flexShrink: 0, padding: '1px 5px', borderRadius: 4, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>
                                      Admin
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                <span style={{ padding: '2px 6px', borderRadius: 4, background: statusBg, color: statusColor, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td style={{ padding: '10px 8px', color: c.text }}>{t.assignee || 'Unassigned'}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', color: c.subText }}>{fmtTime(t.updated_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* CUSTOMER PRODUCTS & SERVICES */}
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Products & Services ({customerProducts.length})</span>
                  {productsLoading && <RefreshCw size={12} className="animate-spin" style={{ color: c.brand }} />}
                </div>

                {customerProducts.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: c.subText, fontSize: 11, border: `1px dashed ${c.border}`, borderRadius: 8 }}>
                    No active products or services found for this customer
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {customerProducts.map(p => {
                      const Icon = getProductIcon(p.type);
                      const statusStr = String(p.status).toLowerCase();
                      
                      let bg = 'rgba(16,185,129,0.12)';
                      let color = '#10b981';
                      let label = 'Active';
                      
                      if (statusStr === 'expired') {
                        bg = 'rgba(239,68,68,0.12)'; color = '#ef4444'; label = 'Expired';
                      } else if (statusStr === 'suspended') {
                        bg = 'rgba(249,115,22,0.12)'; color = '#f97316'; label = 'Suspended';
                      } else if (statusStr === 'inactive' || statusStr === 'disabled') {
                        bg = c.hover; color = c.subText; label = 'Inactive';
                      } else if (p.expiry) {
                        const days = Math.ceil((new Date(p.expiry) - new Date()) / 86400000);
                        if (days > 0 && days <= 30) {
                          bg = 'rgba(245,158,11,0.12)'; color = '#f59e0b'; label = `Expiring Soon`;
                        }
                      }

                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 10, background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', border: `1px solid ${c.border}`, borderRadius: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: c.brand + '15', color: c.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={14} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ fontSize: 9, color: c.subText }}>{p.type}</div>
                          </div>
                          <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: bg, color, whiteSpace: 'nowrap' }}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW PROFILE (SLIDE OUT PANEL) ================= */}
      {showProfileModal && selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div 
            style={{
              width: '100%', maxWidth: '75%', height: '100%', background: c.bg,
              boxShadow: '-10px 0 30px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: `1px solid ${c.border}`, background: c.card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={18} style={{ color: c.brand }} />
                <span style={{ fontWeight: 800, fontSize: 15, color: c.text }}>Customer Full Profile View</span>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: c.hover, border: 'none', borderRadius: 6, color: c.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                <X size={15} /> Close Profile
              </button>
            </div>
            
            {/* Scrollable Container with CustomerProfileAdminView */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <CustomerProfileAdminView 
                customer={selectedCustomer} 
                onBack={() => setShowProfileModal(false)} 
                isDark={isDark} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE TICKET ================= */}
      {showCreateTicketModal && selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong || c.border}`, borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Open Support Ticket (As Customer)</span>
              <button onClick={() => setShowCreateTicketModal(false)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTicketSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Customer</label>
                <div style={{ fontSize: 13.5, color: c.text, marginTop: 4 }}>
                  <strong>{selectedCustomer.name}</strong> ({selectedCustomer.email})
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Subject / Issue</label>
                <input required value={newTicketSubject} onChange={e => setNewTicketSubject(e.target.value)} placeholder="e.g. Email server not sending outgoing mails" style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Priority</label>
                <select value={newTicketPriority} onChange={e => setNewTicketPriority(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', marginTop: 4 }}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Ticket message (Sent as Customer)</label>
                <textarea required rows={4} value={newTicketMessage} onChange={e => setNewTicketMessage(e.target.value)} placeholder="Describe the issue or message..." style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', marginTop: 4, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateTicketModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isCreatingTicket} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {isCreatingTicket ? <Loader2 size={16} className="animate-spin" /> : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SEND EMAIL ================= */}
      {showSendEmailModal && selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', padding: 24 }} onClick={() => setShowSendEmailModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 16px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 750, color: c.text }}>Send Direct Email</span>
              <button onClick={() => setShowSendEmailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={16} /></button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: c.subText, marginBottom: 4 }}>Recipient Email</label>
                <input type="text" disabled value={selectedCustomer.email} style={{ width: '100%', padding: '8px 10px', background: c.hover, border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: c.subText, marginBottom: 4 }}>Email Subject</label>
                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="e.g. Subscription Renewal Inquiry..." style={{ width: '100%', padding: '8px 10px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 12, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: c.subText, marginBottom: 4 }}>Email Body</label>
                <textarea rows={6} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Type email content here..." style={{ width: '100%', padding: '8px 10px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 12, outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '12px 20px', borderTop: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <button onClick={() => setShowSendEmailModal(false)} style={{ padding: '6px 12px', border: `1px solid ${c.border}`, borderRadius: 6, background: 'transparent', color: c.subText, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSendEmailSubmit} disabled={emailSending} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: c.brand, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: emailSending ? 0.6 : 1 }}>
                {emailSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD NOTE ================= */}
      {showAddNoteModal && selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', padding: 24 }} onClick={() => setShowAddNoteModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 16px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 750, color: c.text }}>Add Internal Customer Note</span>
              <button onClick={() => setShowAddNoteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={16} /></button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: c.subText, marginBottom: 4 }}>Note Type</label>
                <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 12, outline: 'none' }}>
                  <option>Private</option>
                  <option>Shared</option>
                  <option>Important</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: c.subText, marginBottom: 4 }}>Note Content</label>
                <textarea rows={5} value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Type notes here..." style={{ width: '100%', padding: '8px 10px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 12, outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '12px 20px', borderTop: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <button onClick={() => setShowAddNoteModal(false)} style={{ padding: '6px 12px', border: `1px solid ${c.border}`, borderRadius: 6, background: 'transparent', color: c.subText, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddNoteSubmit} disabled={noteSaving} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: c.brand, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: noteSaving ? 0.6 : 1 }}>
                {noteSaving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TRANSFER TICKET ================= */}
      {showTransferModal && selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', padding: 24 }} onClick={() => setShowTransferModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Transfer Ticket</span>
              <button onClick={() => setShowTransferModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={16} /></button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 750, color: c.subText, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Transfer Options</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Admin', 'Dev Team', 'Design Team'].filter(team => team !== selected.assignee).map(team => (
                    <button key={team} onClick={() => handleTransfer(team)} style={{ padding: '6px 12px', background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {team}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 750, color: c.subText, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Or type custom assignee</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={customTransfer} onChange={e => setCustomTransfer(e.target.value)} placeholder="e.g. Billing Team..." style={{ ...inp, flex: 1, padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 12 }} onKeyDown={e => { if (e.key === 'Enter' && customTransfer.trim()) handleTransfer(customTransfer); }} />
                  <button onClick={() => { if (customTransfer.trim()) handleTransfer(customTransfer); }} disabled={!customTransfer.trim()} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: c.brand, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: !customTransfer.trim() ? 0.6 : 1 }}>Transfer</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <button onClick={() => setShowTransferModal(false)} style={{ padding: '6px 14px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.subText, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: INSERT LINK ================= */}
      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', padding: 24 }} onClick={() => setShowLinkModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 16px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Insert Link</span>
              <button onClick={() => setShowLinkModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={16} /></button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.subText, marginBottom: 4 }}>URL</label>
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" autoFocus style={{ ...inp, width: '100%', padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.subText, marginBottom: 4 }}>Display Text</label>
                <input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Link text..." style={{ ...inp, width: '100%', padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', color: c.text, fontSize: 13 }} onKeyDown={e => { if (e.key === 'Enter') handleInsertLink(); }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <button onClick={() => setShowLinkModal(false)} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.subText, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={handleInsertLink} disabled={!linkUrl.trim() || !linkText.trim()} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: c.brand, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: !linkUrl.trim() || !linkText.trim() ? 0.6 : 1 }}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SCREENSHOT PREVIEW MODAL ================= */}
      {activePreviewUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: 24 }} onClick={() => setActivePreviewUrl(null)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, width: '90%', maxWidth: 800, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Screenshot Preview</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={activePreviewUrl} download="screenshot" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: c.brand, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Download</a>
                <button onClick={() => setActivePreviewUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText }}><X size={16} /></button>
              </div>
            </div>
            <div style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#090a0f', maxHeight: '70vh', overflow: 'auto' }}>
              <img src={activePreviewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 }} />
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animation wrapper */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes orange-soft-blink {
          0%, 100% {
            border-color: rgba(249, 115, 22, 0.25);
            box-shadow: 0 0 3px rgba(249, 115, 22, 0.15);
            background-color: rgba(249, 115, 22, 0.01);
          }
          50% {
            border-color: rgba(249, 115, 22, 0.85);
            box-shadow: 0 0 8px rgba(249, 115, 22, 0.4);
            background-color: rgba(249, 115, 22, 0.04);
          }
        }
        .orange-blink-card::after {
          content: '';
          position: absolute;
          inset: 2px;
          pointer-events: none;
          border: 1.5px solid rgba(249, 115, 22, 0.4);
          border-radius: 6px;
          animation: orange-soft-blink 2s infinite ease-in-out;
          z-index: 10;
        }
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
    </div>
  );
}
