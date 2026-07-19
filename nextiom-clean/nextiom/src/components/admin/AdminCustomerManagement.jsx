import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Plus, Eye, Loader2, MonitorSmartphone, BellOff, ShieldCheck, ShieldOff, MoreVertical, Download, Users, Building, HelpCircle, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getCustomers, deleteCustomer, addNotification, clearCustomerNotifications, updateCustomer, createTicket, addTicketMessage } from '@/lib/storage';
import { getPublicInvoiceSettings, resolveLogoUrl } from '@/lib/invoices';
import EditCustomerDialog from '@/components/dialogs/EditCustomerDialog';
import AssignProductDialog from '@/components/dialogs/AssignProductDialog';
import AssignDomainDialog from '@/components/dialogs/AssignDomainDialog';
import AssignHostingDialog from '@/components/dialogs/AssignHostingDialog';
import AssignEmailDialog from '@/components/dialogs/AssignEmailDialog';
import { supabase } from '@/lib/customSupabaseClient';
import CustomerProfileAdminView from './CustomerProfileAdminView';
import { useNavigate } from 'react-router-dom';

function AdminCustomerManagement({ products, onSuccess, isDark = true, onNavigate }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('admin_customer_search_term') || '');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('admin_customer_status_filter') || 'All');
  const [companyFilter, setCompanyFilter] = useState(() => localStorage.getItem('admin_customer_company_filter') || 'All');
  const [dateFilter, setDateFilter] = useState(() => localStorage.getItem('admin_customer_date_filter') || 'All Time');
  const [customerFilter, setCustomerFilter] = useState(() => localStorage.getItem('admin_customer_name_filter') || 'All');

  const customerNames = useMemo(() => {
    const names = customers.map(cu => cu.name).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [customers]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [assigningCustomer, setAssigningCustomer] = useState(null);
  const [assignTargetType, setAssignTargetType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingAccess, setTogglingAccess] = useState({}); // { [customerId]: true }
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [openMenuCustomerId, setOpenMenuCustomerId] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [hoveredCustomer, setHoveredCustomer] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketCustomer, setTicketCustomer] = useState(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketPriority, setTicketPriority] = useState('normal');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Deletion Passcode Check Dialog States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deletePasscode, setDeletePasscode] = useState('');
  const [isCheckingPasscode, setIsCheckingPasscode] = useState(false);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.15)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)', brandLight: 'var(--brand-color-light)' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', borderStrong: '#dcdcdc', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: 'var(--brand-color)', brandLight: 'var(--brand-color-light)' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}`, whiteSpace: 'nowrap' };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };

  const SectionHeader = ({ title, accent }) => (
    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: accent || c.brand, flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 14, color: c.text, letterSpacing: 0.3 }}>{title}</span>
    </div>
  );

  useEffect(() => {
    loadCustomers();
    const channel = supabase
      .channel('customers_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => { loadCustomers(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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

  useEffect(() => {
    if (!openMenuCustomerId) return;
    const handleScrollOrResize = () => {
      setOpenMenuCustomerId(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openMenuCustomerId]);

  useEffect(() => {
    localStorage.setItem('admin_customer_search_term', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('admin_customer_status_filter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('admin_customer_company_filter', companyFilter);
  }, [companyFilter]);

  useEffect(() => {
    localStorage.setItem('admin_customer_date_filter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    localStorage.setItem('admin_customer_name_filter', customerFilter);
  }, [customerFilter]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const [
        custDataResult,
        licsResult,
        hostingResult,
        domainsResult,
        emailsResult,
        jobsResult,
        ticketsResult,
        invoicesResult
      ] = await Promise.allSettled([
        getCustomers(),
        supabase.from('licenses').select('customer_id, expiry_date, status'),
        supabase.from('hosting_requests').select('customer_id, expiry_date, status'),
        supabase.from('domains').select('customer_id, expiry_date, status'),
        supabase.from('email_requests').select('customer_id, expiry_date, status'),
        supabase.from('jobs').select('customer_id, status'),
        supabase.from('tickets').select('customer_id, status'),
        supabase.from('invoices').select('client_email, status, due_date, total, paid_amount')
      ]);

      const custData = custDataResult.status === 'fulfilled' ? custDataResult.value : [];
      const licsData = licsResult.status === 'fulfilled' && licsResult.value.data ? licsResult.value.data : [];
      const hostingData = hostingResult.status === 'fulfilled' && hostingResult.value.data ? hostingResult.value.data : [];
      const domainsData = domainsResult.status === 'fulfilled' && domainsResult.value.data ? domainsResult.value.data : [];
      const emailsData = emailsResult.status === 'fulfilled' && emailsResult.value.data ? emailsResult.value.data : [];
      const jobsData = jobsResult.status === 'fulfilled' && jobsResult.value.data ? jobsResult.value.data : [];
      const ticketsData = ticketsResult.status === 'fulfilled' && ticketsResult.value.data ? ticketsResult.value.data : [];
      const invoicesData = invoicesResult.status === 'fulfilled' && invoicesResult.value.data ? invoicesResult.value.data : [];

      const licensesByCustomer = {};
      const hostingByCustomer = {};
      const domainsByCustomer = {};
      const emailsByCustomer = {};
      const jobsByCustomer = {};
      const ticketsByCustomer = {};
      const invoicesByEmail = {};

      licsData.forEach(lic => {
        if (!lic.customer_id) return;
        if (!licensesByCustomer[lic.customer_id]) licensesByCustomer[lic.customer_id] = [];
        licensesByCustomer[lic.customer_id].push(lic);
      });

      hostingData.forEach(h => {
        if (!h.customer_id) return;
        if (!hostingByCustomer[h.customer_id]) hostingByCustomer[h.customer_id] = [];
        hostingByCustomer[h.customer_id].push(h);
      });

      domainsData.forEach(d => {
        if (!d.customer_id) return;
        if (!domainsByCustomer[d.customer_id]) domainsByCustomer[d.customer_id] = [];
        domainsByCustomer[d.customer_id].push(d);
      });

      emailsData.forEach(e => {
        if (!e.customer_id) return;
        if (!emailsByCustomer[e.customer_id]) emailsByCustomer[e.customer_id] = [];
        emailsByCustomer[e.customer_id].push(e);
      });

      jobsData.forEach(j => {
        if (!j.customer_id) return;
        if (!jobsByCustomer[j.customer_id]) jobsByCustomer[j.customer_id] = [];
        jobsByCustomer[j.customer_id].push(j);
      });

      ticketsData.forEach(t => {
        if (!t.customer_id) return;
        if (!ticketsByCustomer[t.customer_id]) ticketsByCustomer[t.customer_id] = [];
        ticketsByCustomer[t.customer_id].push(t);
      });

      invoicesData.forEach(inv => {
        if (!inv.client_email) return;
        const email = inv.client_email.toLowerCase();
        if (!invoicesByEmail[email]) invoicesByEmail[email] = [];
        invoicesByEmail[email].push(inv);
      });

      const processed = custData.map(cu => {
        const emailLower = (cu.email || '').toLowerCase();
        const customerLics = licensesByCustomer[cu.id] || [];
        const customerHosting = hostingByCustomer[cu.id] || [];
        const customerDomains = domainsByCustomer[cu.id] || [];
        const customerEmails = emailsByCustomer[cu.id] || [];
        const customerJobs = jobsByCustomer[cu.id] || [];
        const customerTickets = ticketsByCustomer[cu.id] || [];
        const customerInvoices = invoicesByEmail[emailLower] || [];

        const productsCount = customerLics.length;
        const hostingCount = customerHosting.length;
        const domainsCount = customerDomains.length;
        const emailsCount = customerEmails.length;
        const jobsCount = customerJobs.length;
        const ticketsCount = customerTickets.length;

        // Health Score
        let hasOverdueInvoice = false;
        const now = new Date();
        customerInvoices.forEach(inv => {
          if (inv.status === 'overdue') {
            hasOverdueInvoice = true;
          } else if (inv.status === 'unpaid' && inv.due_date) {
            const due = new Date(inv.due_date);
            if (due < now) {
              hasOverdueInvoice = true;
            }
          }
        });

        let hasExpiringService = false;
        customerLics.forEach(lic => {
          if (lic.expiry_date) {
            const daysLeft = Math.ceil((new Date(lic.expiry_date) - now) / 86400000);
            if (daysLeft > 0 && daysLeft <= 30) {
              hasExpiringService = true;
            }
          }
        });
        customerHosting.forEach(h => {
          if (h.expiry_date) {
            const daysLeft = Math.ceil((new Date(h.expiry_date) - now) / 86400000);
            if (daysLeft > 0 && daysLeft <= 30) {
              hasExpiringService = true;
            }
          }
        });

        let hasOpenTicket = false;
        customerTickets.forEach(t => {
          const s = String(t.status || '').toLowerCase();
          if (s !== 'resolved' && s !== 'closed') {
            hasOpenTicket = true;
          }
        });

        let health = '🟢 Healthy';
        if (cu.status === 'restricted' || hasOverdueInvoice) {
          health = '🔴 Critical';
        } else if (hasExpiringService || hasOpenTicket) {
          health = '🟡 Attention';
        }

        const lastActStr = cu.last_activity || null;

        let ltv = 0;
        customerInvoices.forEach(inv => {
          if (inv.status === 'paid') {
            ltv += Number(inv.total || 0);
          } else if (inv.status === 'partially_paid') {
            ltv += Number(inv.paid_amount || 0);
          }
        });

        return {
          ...cu,
          productsCount,
          hostingCount,
          domainsCount,
          emailsCount,
          jobsCount,
          ticketsCount,
          health,
          lastActivity: lastActStr,
          ltv
        };
      });

      setCustomers(processed);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load customers page data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const hashPasscode = async (text) => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('Native crypto digest failed, falling back to JS implementation:', e);
      }
    }

    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiLength = text[lengthProperty] * 8;
    
    var hash = [];
    var k = [];
    var primeCounter = 0;

    var isPrime = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isPrime[candidate]) {
        for (i = 0; i < 311; i += candidate) {
          isPrime[i] = 1;
        }
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    
    var ascii = text + '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      var charCode = ascii.charCodeAt(i);
      words[i >> 2] |= charCode << ((3 - i % 4) * 8);
    }
    words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiLength | 0);
    
    for (j = 0; j < words[lengthProperty]; ) {
      var w = words.slice(j, j += 16);
      var oldHash = hash.slice(0);
      
      hash = [0, 1, 2, 3, 4, 5, 6, 7].map(function(index) { return hash[index]; });
      
      for (i = 0; i < 64; i++) {
        var wItem = w[i];
        if (i >= 16) {
          var wa = w[i - 15], wb = w[i - 2];
          var s0 = rightRotate(wa, 7) ^ rightRotate(wa, 18) ^ (wa >>> 3);
          var s1 = rightRotate(wb, 17) ^ rightRotate(wb, 19) ^ (wb >>> 10);
          wItem = w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        
        var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
        var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
        var s0_h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
        var s1_h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
        
        var temp1 = hash[7] + s1_h + ch + k[i] + wItem;
        var temp2 = s0_h + maj;
        
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    
    for (i = 0; i < 8; i++) {
      var val = hash[i];
      if (val < 0) val += maxWord;
      var str = val.toString(16);
      while (str[lengthProperty] < 8) str = '0' + str;
      result += str;
    }
    return result;
  };

  const executeDelete = async (id) => {
    const customer = customers.find(cu => cu.id === id);
    try {
      await deleteCustomer(id);
      addNotification({ customer_id: null, type: 'delete', title: `Customer Deleted — ${customer?.name || 'Unknown'}`, message: `Admin permanently deleted customer account: ${customer?.name || 'Unknown'} (${customer?.email || ''}).` }).catch(() => {});
      toast({ title: 'Customer Deleted' });
      loadCustomers();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    const customer = customers.find(cu => cu.id === id);
    if (!customer) return;

    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('id')
        .eq('id', 1)
        .not('delete_passcode_hash', 'is', null);

      if (error) throw error;
      const isPasscodeSet = !!(data && data.length > 0);

      if (!isPasscodeSet) {
        toast({
          title: 'Action Blocked',
          description: 'No delete passcode is configured. Please set a passcode in System Settings first.',
          variant: 'destructive'
        });
        return;
      }

      setCustomerToDelete(customer);
      setDeletePasscode('');
      setDeleteConfirmOpen(true);
    } catch (err) {
      toast({ title: 'Error checking security settings', description: err.message, variant: 'destructive' });
    }
  };

  const handleVerifyDeletePasscode = async () => {
    if (!customerToDelete) return;
    if (!deletePasscode) {
      toast({ title: 'Validation Error', description: 'Please enter the passcode.', variant: 'destructive' });
      return;
    }

    setIsCheckingPasscode(true);
    try {
      const hash = await hashPasscode(deletePasscode);
      const { data, error } = await supabase
        .from('payment_settings')
        .select('id')
        .eq('id', 1)
        .eq('delete_passcode_hash', hash)
        .maybeSingle();

      if (error) throw error;
      const isValid = !!data;

      if (isValid) {
        setDeleteConfirmOpen(false);
        await executeDelete(customerToDelete.id);
        setCustomerToDelete(null);
      } else {
        toast({ title: 'Incorrect Passcode', description: 'The passcode entered is incorrect. Deletion aborted.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Verification Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCheckingPasscode(false);
    }
  };

  const handleClearNotifications = async (customer) => {
    if (confirm(`Are you sure you want to clear all notification history for ${customer.name}?`)) {
      try {
        await clearCustomerNotifications(customer.id);
        toast({ title: 'Notifications Cleared', description: `Successfully cleared notifications for ${customer.name}.` });
      } catch (err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleToggleAccess = async (customer) => {
    const isRestricted = customer.status === 'restricted';
    const newStatus = isRestricted ? 'active' : 'restricted';
    const action = isRestricted ? 'Access Granted' : 'Access Restricted';
    const actionDesc = isRestricted
      ? `${customer.name} can now log in to the portal.`
      : `${customer.name} has been restricted from logging in.`;

    setTogglingAccess(prev => ({ ...prev, [customer.id]: true }));
    try {
      await updateCustomer(customer.id, { status: newStatus });
      addNotification({
        customer_id: null,
        type: isRestricted ? 'access_granted' : 'access_restricted',
        title: `${action} — ${customer.name}`,
        message: actionDesc,
      }).catch(() => {});
      if (!isRestricted) {
        addNotification({
          customer_id: customer.id,
          type: 'access_restricted',
          title: 'Account Access Restricted',
          message: 'Your account has been restricted by the administrator. Please contact support for assistance.',
        }).catch(() => {});
      }
      toast({ title: action, description: actionDesc });
      loadCustomers();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTogglingAccess(prev => { const n = { ...prev }; delete n[customer.id]; return n; });
    }
  };

  const handleLoginAsCustomer = async (customer) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminToken = session?.access_token;

      if (!adminToken) {
        toast({ title: 'Error', description: 'No admin session found', variant: 'destructive' });
        return;
      }

      if (!customer.user_id) {
        toast({ title: 'Error', description: 'Customer account has no linked user ID', variant: 'destructive' });
        return;
      }

      sessionStorage.setItem('impersonation_token', 'impersonating');
      sessionStorage.setItem('impersonated_user', JSON.stringify({
        id: customer.user_id,
        customer_id: customer.id,
        email: customer.email,
        name: customer.name,
      }));
      sessionStorage.setItem('original_admin_token', adminToken);

      try {
        await supabase.from('impersonation_logs').insert({
          admin_id: session.user.id,
          target_user_id: customer.user_id,
          action: 'start',
          started_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn('Could not log impersonation start:', logErr);
      }

      toast({
        title: 'Impersonation Started',
        description: `You are now viewing as ${customer.name}`,
      });

      navigate(`/admin/impersonate/${customer.id}`);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAssignSuccess = () => {
    handleAssignClose();
    loadCustomers();
    onSuccess?.();
  };

  const handleAssignClose = () => {
    setAssignTargetType(null);
    setAssigningCustomer(null);
  };

  const handleOpenTicket = (customer) => {
    setTicketCustomer(customer);
    setTicketSubject('');
    setTicketPriority('normal');
    setTicketMessage('');
    setIsTicketModalOpen(true);
  };

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketCustomer) return;
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast({ title: 'Required', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    setIsCreatingTicket(true);
    try {
      // 1. Create ticket
      const ticket = await createTicket(ticketCustomer.id, ticketSubject.trim(), ticketPriority, 'Technical Support', null, true);

      // 2. Add message under customer identity (sender_role: 'customer')
      await addTicketMessage(ticket.id, 'customer', ticketMessage.trim());

      // 3. Notify admin that a new support ticket was created
      await addNotification({
        customer_id: null,
        type: 'ticket:' + ticket.id,
        title: 'New support ticket',
        message: `${ticketCustomer.name || ticketCustomer.email} opened a ticket: ${ticketSubject.trim()}`,
      }).catch(() => {});

      toast({ title: 'Ticket Created', description: `Successfully opened ticket: "${ticketSubject}"` });
      setIsTicketModalOpen(false);
      setTicketCustomer(null);
      loadCustomers();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleAction = (action, customer) => {
    if (action === 'create_job') {
      sessionStorage.setItem('create_job_customer_id', customer.id);
      if (onNavigate) {
        onNavigate('jobs');
      } else {
        toast({ title: 'Navigation Error', description: 'Could not navigate to Jobs tab.', variant: 'destructive' });
      }
    } else if (action === 'open_ticket') {
      handleOpenTicket(customer);
    } else if (action === 'clear_notifs') {
      handleClearNotifications(customer);
    } else if (action === 'delete') {
      handleDelete(customer.id);
    }
  };

  const handleBulkSendNotice = async () => {
    const title = prompt('Enter notice title:');
    if (!title) return;
    const message = prompt('Enter notice message:');
    if (!message) return;

    try {
      await Promise.all(selectedCustomerIds.map(id =>
        addNotification({ customer_id: id, type: 'announcement', title, message })
      ));
      toast({ title: 'Notices Sent', description: `Successfully sent notices to ${selectedCustomerIds.length} customers.` });
      setSelectedCustomerIds([]);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send some notices.', variant: 'destructive' });
    }
  };

  // Detects whether all selected customers are already restricted
  const allSelectedRestricted = selectedCustomerIds.length > 0 &&
    selectedCustomerIds.every(id => {
      const cu = customers.find(c => c.id === id);
      return cu && cu.status === 'restricted';
    });

  const handleBulkRestrict = async () => {
    if (allSelectedRestricted) {
      // Re-activate
      if (!confirm(`Restore active access for the ${selectedCustomerIds.length} selected customer(s)?`)) return;
      try {
        await Promise.all(selectedCustomerIds.map(id => updateCustomer(id, { status: 'active' })));
        toast({ title: 'Access Restored', description: `Activated ${selectedCustomerIds.length} customer(s).` });
        setSelectedCustomerIds([]);
        loadCustomers();
      } catch (err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } else {
      // Restrict
      if (!confirm(`Are you sure you want to restrict account access for the ${selectedCustomerIds.length} selected customers?`)) return;
      try {
        await Promise.all(selectedCustomerIds.map(id => updateCustomer(id, { status: 'restricted' })));
        toast({ title: 'Access Restricted', description: `Restricted access for ${selectedCustomerIds.length} customers.` });
        setSelectedCustomerIds([]);
        loadCustomers();
      } catch (err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`WARNING: Are you sure you want to permanently delete the ${selectedCustomerIds.length} selected customers? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedCustomerIds.map(id => deleteCustomer(id)));
      toast({ title: 'Customers Deleted', description: `Successfully deleted ${selectedCustomerIds.length} customers.` });
      setSelectedCustomerIds([]);
      loadCustomers();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleExportCSV = (selectedOnly = false) => {
    const list = selectedOnly ? customers.filter(cu => selectedCustomerIds.includes(cu.id)) : filteredCustomers;
    if (list.length === 0) {
      toast({ title: 'Export Failed', description: 'No customers to export.', variant: 'destructive' });
      return;
    }
    const headers = ['Name', 'Email', 'Company', 'Phone', 'Country', 'Address', 'Joined', 'Status', 'Health', 'Products', 'Hosting', 'Domains', 'Emails', 'Jobs', 'Tickets'];
    const rows = [headers];
    list.forEach(cu => {
      rows.push([
        cu.name || '',
        cu.email || '',
        cu.company || '',
        cu.phone || '',
        cu.country || '',
        cu.address || '',
        new Date(cu.created_at).toLocaleDateString(),
        cu.status || '',
        cu.health || '',
        cu.productsCount || 0,
        cu.hostingCount || 0,
        cu.domainsCount || 0,
        cu.emailsCount || 0,
        cu.jobsCount || 0,
        cu.ticketsCount || 0
      ]);
    });
    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nextiom_customers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async (selectedOnly = false) => {
    const list = selectedOnly ? customers.filter(cu => selectedCustomerIds.includes(cu.id)) : filteredCustomers;
    if (list.length === 0) {
      toast({ title: 'Export Failed', description: 'No customers to export.', variant: 'destructive' });
      return;
    }

    // Fetch company settings + resolve logo
    let settings = { company_name: 'Nextiom (Pvt) Ltd', phone: '', website: '', address: '', logo_url: '' };
    let logoUrl = '';
    try {
      settings = await getPublicInvoiceSettings();
      logoUrl = await resolveLogoUrl(settings.logo_url);
    } catch { /* use defaults */ }

    const company = settings.company_name || 'Nextiom (Pvt) Ltd';
    const generated = new Date().toLocaleString();

    const logoTag = logoUrl
      ? `<img src="${logoUrl}" alt="logo" style="height:52px;object-fit:contain;" />`
      : '';

    const rows = list.map((cu, i) => {
      const health = (cu.health || '').replace(/^[\p{Emoji}\s]+/u, '');
      const statusColor = cu.status === 'active' ? '#10b981' : cu.status === 'restricted' ? '#ef4444' : '#f59e0b';
      const healthColor = health.toLowerCase().includes('healthy') ? '#10b981' : health.toLowerCase().includes('attention') ? '#f59e0b' : '#ef4444';
      return `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
          <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#999;font-size:11px">${i + 1}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600">${cu.name || ''}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#555">${cu.email || ''}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee">${cu.company || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#666">${new Date(cu.created_at).toLocaleDateString()}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee">
            <span style="padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:700;background:${statusColor}20;color:${statusColor}">${(cu.status || '').charAt(0).toUpperCase() + (cu.status || '').slice(1)}</span>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600;color:${healthColor}">${health || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${cu.productsCount || 0}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${cu.hostingCount || 0}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${cu.domainsCount || 0}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${cu.ticketsCount || 0}</td>
        </tr>`;
    }).join('');

    const thStyle = 'text-align:left;padding:9px 10px;font-weight:700;font-size:10.5px;color:#555;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #ddd;background:#f5f5f5';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Nextiom — Customer Report</title>
  <style>
    @media print { @page { size: A4 landscape; margin: 14mm 12mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px 28px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid var(--brand-color);padding-bottom:20px;margin-bottom:24px">
    <div style="display:flex;align-items:center;gap:16px">
      ${logoTag}
      <div>
        <div style="font-weight:800;font-size:20px;color:#1a1a1a">${company}</div>
        ${settings.address ? `<div style="font-size:12px;color:#666;margin-top:2px">${settings.address}</div>` : ''}
        ${settings.phone ? `<div style="font-size:12px;color:#666">${settings.phone}</div>` : ''}
        ${settings.website ? `<div style="font-size:12px;color:var(--brand-color)">${settings.website}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-weight:700;font-size:22px;color:var(--brand-color);letter-spacing:1px">CUSTOMER REPORT</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Generated: ${generated}</div>
      <div style="font-size:12px;color:#666">Total Records: ${list.length}</div>
    </div>
  </div>

  <!-- Table -->
  <table style="width:100%;border-collapse:collapse;font-size:11.5px">
    <thead>
      <tr>
        <th style="${thStyle}">#</th>
        <th style="${thStyle}">Name</th>
        <th style="${thStyle}">Email</th>
        <th style="${thStyle}">Company</th>
        <th style="${thStyle}">Joined</th>
        <th style="${thStyle}">Status</th>
        <th style="${thStyle}">Health</th>
        <th style="${thStyle};text-align:center">Products</th>
        <th style="${thStyle};text-align:center">Hosting</th>
        <th style="${thStyle};text-align:center">Domains</th>
        <th style="${thStyle};text-align:center">Tickets</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Footer -->
  <div style="margin-top:32px;border-top:1px solid #eee;padding-top:14px;display:flex;justify-content:space-between;font-size:11px;color:#999">
    <span>${company} — Confidential</span>
    <span>Printed on ${new Date().toLocaleDateString()}</span>
  </div>

  <script>window.onload = function() { setTimeout(function(){ window.print(); }, 600); };<\/script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Popup Blocked', description: 'Please allow popups for this site to download PDFs.', variant: 'destructive' });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportData = (format) => {
    setShowExportMenu(false);
    if (format === 'csv') {
      handleExportCSV(false);
    } else if (format === 'excel') {
      handleExportCSV(false);
    } else if (format === 'pdf') {
      handleExportPDF(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatLastActivity = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    if (diffMs < 0) return 'Just Now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    return `${diffMonths} months ago`;
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomerIds(filteredCustomers.map(cu => cu.id));
    } else {
      setSelectedCustomerIds([]);
    }
  };

  const handleSelectCustomer = (customerId, checked) => {
    if (checked) {
      setSelectedCustomerIds(prev => [...prev, customerId]);
    } else {
      setSelectedCustomerIds(prev => prev.filter(id => id !== customerId));
    }
  };

  const handleMouseEnterCustomer = (e, customer) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCustomer(customer);
    setHoverPos({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 5
    });
  };

  const handleMouseLeaveCustomer = () => {
    setHoveredCustomer(null);
  };

  // Filter Logic
  const filteredCustomers = customers.filter(cu => {
    if (cu.status === 'rejected') return false;

    // Search
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (cu.name || '').toLowerCase().includes(term) ||
      (cu.email || '').toLowerCase().includes(term) ||
      (cu.company || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;

    // Status Filter
    if (statusFilter !== 'All' && cu.status !== statusFilter) return false;

    // Customer Name Filter
    if (customerFilter !== 'All' && cu.name !== customerFilter) return false;

    // Company Filter
    if (companyFilter === 'Company' && !cu.company) return false;
    if (companyFilter === 'Individual' && cu.company) return false;

    // Date Filter
    if (dateFilter !== 'All Time') {
      const created = new Date(cu.created_at);
      const now = new Date();
      if (dateFilter === 'This Month') {
        if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return false;
      } else if (dateFilter === 'This Year') {
        if (created.getFullYear() !== now.getFullYear()) return false;
      } else if (dateFilter === 'Last 30 Days') {
        const diffDays = (now - created) / 86400000;
        if (diffDays > 30 || diffDays < 0) return false;
      }
    }

    return true;
  });

  // Summary Metrics calculations
  const activeCustomersCount = customers.filter(cu => cu.status === 'active').length;
  const restrictedCustomersCount = customers.filter(cu => cu.status === 'restricted').length;
  const totalCustomersCount = customers.length;
  
  const isNewThisMonthBool = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };
  const newThisMonthCount = customers.filter(cu => isNewThisMonthBool(cu.created_at)).length;
  const companiesCountVal = customers.filter(cu => cu.company).length;

  const summaryCards = [
    { label: 'Total Customers', value: totalCustomersCount, icon: Users, color: '#3b82f6' },
    { label: 'Active Customers', value: activeCustomersCount, icon: ShieldCheck, color: '#10b981' },
    { label: 'Restricted Customers', value: restrictedCustomersCount, icon: ShieldOff, color: '#ef4444' },
    { label: 'New This Month', value: newThisMonthCount, icon: Plus, color: '#8b5cf6' },
    { label: 'Companies', value: companiesCountVal, icon: Building, color: '#f59e0b' }
  ];

  const StatusBadge = ({ status }) => {
    let bg = 'rgba(16, 185, 129, 0.1)';
    let color = '#10b981';
    let text = '🟢 Active';

    if (status === 'restricted') {
      bg = 'rgba(239, 68, 68, 0.1)';
      color = '#ef4444';
      text = '🔴 Restricted';
    } else if (status === 'pending') {
      bg = 'rgba(245, 158, 11, 0.1)';
      color = '#f59e0b';
      text = '🟡 Pending Approval';
    }

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        backgroundColor: bg, color: color, whiteSpace: 'nowrap'
      }}>
        {text}
      </span>
    );
  };

  const menuItemStyle = (themeObj, hoverColor) => ({
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    color: hoverColor || themeObj.text,
    textAlign: 'left',
    fontSize: 12.5,
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background 0.15s',
    borderBottom: `1px solid ${themeObj.border}`
  });

  const exportItemStyle = {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    color: c.text,
    textAlign: 'left',
    fontSize: 12.5,
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.15s'
  };

  const bulkBtnStyle = (themeObj, btnColor) => ({
    padding: '6px 12px',
    background: 'transparent',
    border: `1.5px solid ${btnColor}`,
    color: btnColor,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'opacity 0.15s'
  });

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Loader2 className="animate-spin" size={28} style={{ color: c.brand }} />
    </div>
  );

  if (selectedCustomer) {
    return <CustomerProfileAdminView customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} isDark={isDark} onNavigate={onNavigate} />;
  }

  return (
    <div>
      {/* 1. Dashboard Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} style={{
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ fontSize: 12, color: c.subText, fontWeight: 500, marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.text }}>{card.value}</div>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${card.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: card.color
              }}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Advanced Search & Filters */}
      <div style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
            <input
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
              placeholder="Search by name, email, company..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Customer Filter */}
          <select
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
            style={{ padding: '8px 12px', background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer', maxWidth: 200 }}
          >
            <option value="All">All Customers</option>
            {customerNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="restricted">Restricted</option>
            <option value="pending">Pending Approval</option>
          </select>

          {/* Company Filter */}
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            style={{ padding: '8px 12px', background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Types</option>
            <option value="Company">Companies Only</option>
            <option value="Individual">Individual Only</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{ padding: '8px 12px', background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="All Time">All Time</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
            <option value="Last 30 Days">Last 30 Days</option>
          </select>
        </div>

        {/* Export Button */}
        <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            style={{
              padding: '8px 16px', background: 'transparent', border: `1.5px solid ${c.border}`,
              borderRadius: 8, color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Download size={14} /> Export
          </button>
          {showExportMenu && (
            <>
              <div
                onClick={() => setShowExportMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 998 }}
              />
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 999,
                background: c.card, border: `1px solid ${c.border}`, borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 140, display: 'flex',
                flexDirection: 'column', overflow: 'hidden'
              }}>
                <button onClick={() => exportData('csv')} style={exportItemStyle}>Export CSV</button>
                <button onClick={() => exportData('excel')} style={exportItemStyle}>Export Excel</button>
                <button onClick={() => exportData('pdf')} style={exportItemStyle}>Export PDF</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 7. Bulk Actions Panel */}
      {selectedCustomerIds.length > 0 && (
        <div style={{
          background: c.brandLight,
          border: `1.5px solid ${c.brand}`,
          borderRadius: 10,
          padding: '12px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: c.text }}>
            Selected {selectedCustomerIds.length} customer{selectedCustomerIds.length > 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={handleBulkSendNotice} style={bulkBtnStyle(c, '#3b82f6')}>🔔 Send Notice</button>
            <button onClick={() => handleExportCSV(true)} style={bulkBtnStyle(c, '#10b981')}>📥 Export CSV</button>
            <button onClick={handleBulkRestrict} style={bulkBtnStyle(c, allSelectedRestricted ? '#10b981' : '#f59e0b')}>
              {allSelectedRestricted ? '✅ Activate' : '🔒 Restrict'}
            </button>
            <button onClick={handleBulkDelete} style={bulkBtnStyle(c, '#ef4444')}>🗑 Delete</button>
            <button onClick={() => setSelectedCustomerIds([])} style={bulkBtnStyle(c, c.subText)}>Cancel</button>
          </div>
        </div>
      )}

      <style>{`
        .customers-table-wrapper {
          display: block;
        }
        .customers-cards-wrapper {
          display: none;
        }
        @media (max-width: 768px) {
          .customers-table-wrapper {
            display: none;
          }
          .customers-cards-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
          }
        }
      `}</style>

      {/* Customers Table */}
      <div style={cardS}>
        <SectionHeader title="Customers" accent={c.brand} />
        <div className="customers-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 36 }} />         {/* checkbox */}
              <col style={{ width: '14%' }} />       {/* Customer */}
              <col style={{ width: '16%' }} />       {/* Email */}
              <col style={{ width: '10%' }} />       {/* Company */}
              <col style={{ width: 80 }} />          {/* Joined */}
              <col style={{ width: 110 }} />         {/* Status */}
              <col style={{ width: 100 }} />         {/* Health */}
              <col style={{ width: 36 }} />          {/* Products */}
              <col style={{ width: 36 }} />          {/* Hosting */}
              <col style={{ width: 36 }} />          {/* Domains */}
              <col style={{ width: 36 }} />          {/* Emails */}
              <col style={{ width: 36 }} />          {/* Jobs */}
              <col style={{ width: 36 }} />          {/* Tickets */}
              <col style={{ width: 90 }} />          {/* Last Activity */}
              <col style={{ width: 130 }} />         {/* Actions */}
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thS, width: 36, textAlign: 'center', padding: '11px 8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={thS}>Customer</th>
                <th style={thS}>Email</th>
                <th style={thS}>Company</th>
                <th style={{ ...thS, padding: '11px 8px' }}>Joined</th>
                <th style={thS}>Status</th>
                <th style={thS}>Health</th>
                <th style={{ ...thS, textAlign: 'center', padding: '11px 4px', fontSize: 18 }} title="Products">📦</th>
                <th style={{ ...thS, textAlign: 'center', padding: '11px 4px', fontSize: 18 }} title="Hosting">🖥</th>
                <th style={{ ...thS, textAlign: 'center', padding: '11px 4px', fontSize: 18 }} title="Domains">🌐</th>
                <th style={{ ...thS, textAlign: 'center', padding: '11px 4px', fontSize: 18 }} title="Emails">📧</th>
                <th style={{ ...thS, textAlign: 'center', padding: '11px 4px', fontSize: 18 }} title="Jobs">💼</th>
                <th style={{ ...thS, textAlign: 'center', padding: '11px 4px', fontSize: 18 }} title="Tickets">🎫</th>
                <th style={{ ...thS, padding: '11px 8px' }}>Last Activity</th>
                <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, i) => {
                const bgStyle = i % 2 === 0 ? tdS : tdAlt;
                const compactTd = { ...bgStyle, padding: '13px 8px' };
                const iconTd = { ...bgStyle, textAlign: 'center', fontWeight: 600, padding: '13px 4px' };
                const healthColor = customer.health.startsWith('🟢') ? '#10b981' : customer.health.startsWith('🟡') ? '#f59e0b' : '#ef4444';
                // strip emoji prefix for display (🟢 Healthy → Healthy)
                const healthLabel = customer.health.replace(/^[\p{Emoji}\s]+/u, '');
                return (
                  <tr key={customer.id}>
                    <td style={{ ...bgStyle, textAlign: 'center', padding: '13px 8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.includes(customer.id)}
                        onChange={e => handleSelectCustomer(customer.id, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={bgStyle}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', overflow: 'hidden' }}
                        onMouseEnter={e => handleMouseEnterCustomer(e, customer)}
                        onMouseLeave={handleMouseLeaveCustomer}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: c.brand + '20', color: c.brand,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700
                        }}>
                          {getInitials(customer.name)}
                        </div>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</span>
                      </div>
                    </td>
                    <td style={bgStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ color: c.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}>
                          {customer.email}
                        </span>
                      </div>
                    </td>
                    <td style={bgStyle}><span style={{ color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}>{customer.company || '—'}</span></td>
                    <td style={compactTd}><span style={{ color: c.subText, whiteSpace: 'nowrap' }}>{new Date(customer.created_at).toLocaleDateString()}</span></td>
                    <td style={bgStyle}><StatusBadge status={customer.status} /></td>
                    <td style={{ ...bgStyle, whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: healthColor, whiteSpace: 'nowrap', fontSize: 12.5 }}>
                        {healthLabel}
                      </span>
                    </td>
                    <td style={iconTd}>{customer.productsCount}</td>
                    <td style={iconTd}>{customer.hostingCount}</td>
                    <td style={iconTd}>{customer.domainsCount}</td>
                    <td style={iconTd}>{customer.emailsCount}</td>
                    <td style={iconTd}>{customer.jobsCount}</td>
                    <td style={iconTd}>{customer.ticketsCount}</td>
                    <td style={compactTd}><span style={{ color: c.subText, whiteSpace: 'nowrap' }}>{formatLastActivity(customer.lastActivity)}</span></td>
                    <td style={{ ...bgStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          style={{ background: 'transparent', border: 'none', color: '#378add', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleLoginAsCustomer(customer)}
                          style={{ background: 'transparent', border: 'none', color: '#8b5cf6', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Login As
                        </button>
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (openMenuCustomerId === customer.id) {
                                setOpenMenuCustomerId(null);
                              } else {
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const openAbove = spaceBelow < 320 && rect.top > spaceBelow;
                                setOpenMenuCustomerId(customer.id);
                                setMenuPos({
                                  x: rect.right,
                                  y: openAbove ? rect.top : rect.bottom,
                                  openAbove
                                });
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer', padding: '4px 8px', display: 'inline-flex' }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && <tr><td colSpan={15} style={emptyS}>No customers found</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="customers-cards-wrapper">
          {filteredCustomers.map((customer) => {
            const healthColor = customer.health.startsWith('🟢') ? '#10b981' : customer.health.startsWith('🟡') ? '#f59e0b' : '#ef4444';
            const healthLabel = customer.health.replace(/^[\p{Emoji}\s]+/u, '');
            return (
              <div key={customer.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Header: Checkbox + Initials + Name + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.includes(customer.id)}
                      onChange={e => handleSelectCustomer(customer.id, e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: c.brand + '20', color: c.brand,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700
                      }}>
                        {getInitials(customer.name)}
                      </div>
                      <span style={{ fontWeight: 600, color: c.text }}>{customer.name}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (openMenuCustomerId === customer.id) {
                          setOpenMenuCustomerId(null);
                        } else {
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const openAbove = spaceBelow < 320 && rect.top > spaceBelow;
                          setOpenMenuCustomerId(customer.id);
                          setMenuPos({
                            x: Math.min(rect.right, window.innerWidth - 10),
                            y: openAbove ? rect.top : rect.bottom,
                            openAbove
                          });
                        }
                      }}
                      style={{ background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer', padding: '4px 8px', display: 'inline-flex' }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                {/* Status and Health Badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <StatusBadge status={customer.status} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: healthColor + '15', color: healthColor, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {healthLabel}
                  </span>
                </div>

                {/* Contact and Join Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, padding: '8px 0' }}>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
                    <div style={{ color: c.text, fontWeight: 500, marginTop: 2, wordBreak: 'break-all' }}>{customer.email}</div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Company</div>
                    <div style={{ color: c.text, marginTop: 2 }}>{customer.company || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Joined</div>
                    <div style={{ color: c.text, marginTop: 2 }}>{new Date(customer.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Last Activity</div>
                    <div style={{ color: c.text, marginTop: 2 }}>{formatLastActivity(customer.lastActivity)}</div>
                  </div>
                </div>

                {/* Service Icons Count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}>
                  <div title="Products">📦 {customer.productsCount}</div>
                  <div title="Hosting">🖥 {customer.hostingCount}</div>
                  <div title="Domains">🌐 {customer.domainsCount}</div>
                  <div title="Emails">📧 {customer.emailsCount}</div>
                  <div title="Jobs">💼 {customer.jobsCount}</div>
                  <div title="Tickets">🎫 {customer.ticketsCount}</div>
                </div>

                {/* Primary Button Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => setSelectedCustomer(customer)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid #378add`, background: 'transparent', color: '#378add', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleLoginAsCustomer(customer)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid #8b5cf6`, background: 'transparent', color: '#8b5cf6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Login As
                  </button>
                </div>
              </div>
            );
          })}
          {filteredCustomers.length === 0 && <div style={emptyS}>No customers found</div>}
        </div>
      </div>

      {/* 9. Service Legend */}
      <div style={{
        padding: 12,
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        fontSize: 12.5,
        color: c.subText,
        marginBottom: 20
      }}>
        <span style={{ fontWeight: 600, color: c.text }}>Legend:</span>
        <span>📦 Products</span>
        <span>🖥 Hosting</span>
        <span>🌐 Domains</span>
        <span>📧 Emails</span>
        <span>💼 Jobs</span>
        <span>🎫 Tickets</span>
      </div>

      {/* 12. Quick Stats Hover Card */}
      {hoveredCustomer && (
        <div style={{
          position: 'absolute',
          left: hoverPos.x,
          top: hoverPos.y,
          zIndex: 1000,
          background: c.card,
          border: `1.5px solid ${c.brand}`,
          borderRadius: 10,
          padding: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          minWidth: 180,
          pointerEvents: 'none'
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: c.text, marginBottom: 8, borderBottom: `1px solid ${c.border}`, paddingBottom: 4 }}>
            {hoveredCustomer.name} Stats
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: c.subText }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Lifetime Value:</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>
                {hoveredCustomer.ltv > 0 ? `LKR ${hoveredCustomer.ltv.toLocaleString('en-LK')}` : 'Rs. 0'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📦 Products:</span>
              <span style={{ fontWeight: 600, color: c.text }}>{hoveredCustomer.productsCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🖥 Hosting:</span>
              <span style={{ fontWeight: 600, color: c.text }}>{hoveredCustomer.hostingCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🌐 Domains:</span>
              <span style={{ fontWeight: 600, color: c.text }}>{hoveredCustomer.domainsCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📧 Emails:</span>
              <span style={{ fontWeight: 600, color: c.text }}>{hoveredCustomer.emailsCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>💼 Jobs:</span>
              <span style={{ fontWeight: 600, color: c.text }}>{hoveredCustomer.jobsCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🎫 Tickets:</span>
              <span style={{ fontWeight: 600, color: c.text }}>{hoveredCustomer.ticketsCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Menu Dropdown */}
      {openMenuCustomerId && (
        (() => {
          const menuCustomer = customers.find(cu => cu.id === openMenuCustomerId);
          if (!menuCustomer) return null;
          return (
            <>
              <div
                onClick={() => setOpenMenuCustomerId(null)}
                style={{ position: 'fixed', inset: 0, zIndex: 998 }}
              />
              <div style={{
                position: 'fixed',
                left: menuPos.x - 180,
                top: menuPos.y + (menuPos.openAbove ? -4 : 4),
                transform: menuPos.openAbove ? 'translateY(-100%)' : 'none',
                zIndex: 999,
                background: c.card,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: 180,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <button onClick={() => { setOpenMenuCustomerId(null); setAssigningCustomer(menuCustomer); setAssignTargetType('product'); }} style={menuItemStyle(c)}>📦 Assign Product</button>
                <button onClick={() => { setOpenMenuCustomerId(null); setAssigningCustomer(menuCustomer); setAssignTargetType('hosting'); }} style={menuItemStyle(c)}>🖥 Assign Hosting</button>
                <button onClick={() => { setOpenMenuCustomerId(null); setAssigningCustomer(menuCustomer); setAssignTargetType('domain'); }} style={menuItemStyle(c)}>🌐 Assign Domain</button>
                <button onClick={() => { setOpenMenuCustomerId(null); setAssigningCustomer(menuCustomer); setAssignTargetType('email'); }} style={menuItemStyle(c)}>📧 Assign Email</button>
                <button onClick={() => { setOpenMenuCustomerId(null); handleAction('create_job', menuCustomer); }} style={menuItemStyle(c)}>💼 Create Job</button>
                <button onClick={() => { setOpenMenuCustomerId(null); handleAction('open_ticket', menuCustomer); }} style={menuItemStyle(c)}>🎫 Open Ticket</button>
                <button onClick={() => { setOpenMenuCustomerId(null); handleAction('clear_notifs', menuCustomer); }} style={menuItemStyle(c)}>🔔 Clear Notifs</button>
                <button onClick={() => { setOpenMenuCustomerId(null); handleAction('delete', menuCustomer); }} style={menuItemStyle(c, '#ef4444')}>🗑 Delete</button>
              </div>
            </>
          );
        })()
      )}

      {/* Assign Product Dialog */}
      {assigningCustomer && assignTargetType === 'product' && (
        <AssignProductDialog
          open={true}
          onOpenChange={() => handleAssignClose()}
          customers={[assigningCustomer]}
          products={products}
          onSuccess={handleAssignSuccess}
          c={c}
        />
      )}

      {/* Assign Domain Dialog */}
      <AssignDomainDialog
        open={assigningCustomer && assignTargetType === 'domain'}
        onClose={() => handleAssignClose()}
        customer={assigningCustomer}
        c={c}
        onSuccess={handleAssignSuccess}
      />

      {/* Assign Hosting Dialog */}
      <AssignHostingDialog
        open={assigningCustomer && assignTargetType === 'hosting'}
        onClose={() => handleAssignClose()}
        customer={assigningCustomer}
        c={c}
        onSuccess={handleAssignSuccess}
      />

      {/* Assign Email Dialog */}
      <AssignEmailDialog
        open={assigningCustomer && assignTargetType === 'email'}
        onClose={() => handleAssignClose()}
        customer={assigningCustomer}
        c={c}
        onSuccess={handleAssignSuccess}
      />

      {editingCustomer && (
        <EditCustomerDialog
          open={!!editingCustomer}
          onOpenChange={() => setEditingCustomer(null)}
          customer={editingCustomer}
          onSuccess={() => { setEditingCustomer(null); loadCustomers(); onSuccess?.(); }}
        />
      )}

      {/* Open Ticket Modal */}
      {isTicketModalOpen && ticketCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Open Support Ticket (As Customer)</span>
              <button onClick={() => { setIsTicketModalOpen(false); setTicketCustomer(null); }} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTicketSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Customer</label>
                <div style={{ fontSize: 13.5, color: c.text, marginTop: 4 }}>
                  <strong>{ticketCustomer.name}</strong> ({ticketCustomer.email})
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Subject / Issue</label>
                <input required value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="e.g. Email server not sending outgoing mails" style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Priority</label>
                <select value={ticketPriority} onChange={e => setTicketPriority(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', marginTop: 4 }}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Ticket message (Sent as Customer)</label>
                <textarea required rows={4} value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} placeholder="Describe the issue or message..." style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', marginTop: 4, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => { setIsTicketModalOpen(false); setTicketCustomer(null); }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isCreatingTicket} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {isCreatingTicket ? <Loader2 size={16} className="animate-spin" /> : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Passcode Dialog */}
      {deleteConfirmOpen && customerToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 450, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Security Verification Required</span>
              <button onClick={() => { setDeleteConfirmOpen(false); setCustomerToDelete(null); }} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, color: c.subText }}>You are about to permanently delete the customer account:</span>
                <strong style={{ fontSize: 15, color: '#ef4444' }}>{customerToDelete.name} ({customerToDelete.email})</strong>
                <span style={{ fontSize: 12, color: c.subText, fontStyle: 'italic', marginTop: 4 }}>This action is irreversible and will delete all licenses, hosting packages, and tickets associated with this customer.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Enter Deletion Passcode</label>
                <input
                  type="password"
                  required
                  value={deletePasscode}
                  onChange={e => setDeletePasscode(e.target.value)}
                  placeholder="Enter passcode to authorize deletion..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: `1.5px solid ${c.border}`,
                    borderRadius: 10,
                    background: c.bg,
                    color: c.text,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#ef4444'}
                  onBlur={e => e.target.style.borderColor = c.border}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerifyDeletePasscode();
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setDeleteConfirmOpen(false); setCustomerToDelete(null); }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyDeletePasscode}
                  disabled={isCheckingPasscode || !deletePasscode}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: deletePasscode && !isCheckingPasscode ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: isCheckingPasscode ? 0.7 : 1
                  }}
                >
                  {isCheckingPasscode ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCustomerManagement;
