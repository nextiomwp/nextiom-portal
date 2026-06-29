import React, { useEffect, useState } from 'react';
import { 
  ChevronLeft, Mail, Phone, Building, Globe, Bell, Trash2, KeyRound, Package, 
  Edit, RefreshCw, Infinity, Lock, Key, X, Eye, Calendar, Clock, TrendingUp, 
  MessageSquare, Briefcase, CheckCircle2, AlertTriangle, AlertOctagon, Copy, 
  Plus, ExternalLink, FileText, UserCheck, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import AssignHostingDialog from '@/components/dialogs/AssignHostingDialog';
import AssignDomainDialog from '@/components/dialogs/AssignDomainDialog';
import AssignEmailDialog from '@/components/dialogs/AssignEmailDialog';
import EditAssignedProductDialog from '@/components/dialogs/EditAssignedProductDialog';
import ViewAssignedProductDialog from '@/components/dialogs/ViewAssignedProductDialog';
import AssignProductDialog from '@/components/dialogs/AssignProductDialog';

import {
  getCustomerById,
  updateCustomer,
  getCustomerDomainRequests,
  getCustomerHostingRequests,
  getCustomerEmailRequests,
  updateDomainRequest,
  updateHostingRequest,
  updateEmailRequest,
  deleteDomainRequest,
  deleteHostingRequest,
  deleteEmailRequest,
  addNotification,
  getLicenses,
  updateLicense,
  deleteLicense,
  buildHostingRequestUpdatePayload,
  getCustomers,
  getProducts,
  getTicketsByCustomer,
  createTicket,
  addTicketMessage,
  closeTicket,
  reopenTicket,
  deleteTicket
} from '@/lib/storage';

import { getCustomerInvoices, createInvoice, generateInvoiceNo, todayISO } from '@/lib/invoices';
import { getCustomerJobs, createJob, updateJob, deleteJob } from '@/lib/jobs';
import { format } from '@/lib/supabaseHelpers';
import { useToast } from '@/components/ui/use-toast';

function CustomerProfileAdminView({ customer, onBack, isDark = true, onNavigate }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.12)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', borderStrong: '#d1d1d1', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: 'var(--brand-color)' };

  // Data States
  const [customerData, setCustomerData] = useState(customer || null);
  const [domainRequests, setDomainRequests] = useState([]);
  const [hostingRequests, setHostingRequests] = useState([]);
  const [emailRequests, setEmailRequests] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [internalNotes, setInternalNotes] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState('products');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [loading, setLoading] = useState(false);

  // Search/Filter States
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productSortOrder, setProductSortOrder] = useState('newest');

  const [hostingSearch, setHostingSearch] = useState('');
  const [hostingStatusFilter, setHostingStatusFilter] = useState('all');

  const [domainSearch, setDomainSearch] = useState('');
  const [domainStatusFilter, setDomainStatusFilter] = useState('all');

  const [emailSearch, setEmailSearch] = useState('');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');

  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');

  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');

  // Modal / Dialog States
  const [viewingLicense, setViewingLicense] = useState(null);
  const [editingLicense, setEditingLicense] = useState(null);
  const [viewingHosting, setViewingHosting] = useState(null);
  const [viewingDomain, setViewingDomain] = useState(null);
  
  // Assign Modals (Create modes)
  const [isAssignProductOpen, setIsAssignProductOpen] = useState(false);
  const [isAssignHostingOpen, setIsAssignHostingOpen] = useState(false);
  const [isAssignDomainOpen, setIsAssignDomainOpen] = useState(false);
  const [isAssignEmailOpen, setIsAssignEmailOpen] = useState(false);

  // Quick Action Modal states
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isOpenTicketOpen, setIsOpenTicketOpen] = useState(false);
  const [isGenerateInvoiceOpen, setIsGenerateInvoiceOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  
  // Quick Edit Modals for items
  const [editingHosting, setEditingHosting] = useState(null);
  const [editingDomain, setEditingDomain] = useState(null);
  const [editingEmail, setEditingEmail] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);

  // View Modals
  const [showEmailCreds, setShowEmailCreds] = useState(null);
  const [viewAllActivities, setViewAllActivities] = useState(false);

  // Renewal Side Drawer States
  const [renewingHosting, setRenewingHosting] = useState(null);
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewalPeriod, setRenewalPeriod] = useState('yearly');

  // Fields for creation modals
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState('Web Design');
  const [jobPriority, setJobPriority] = useState('Medium');
  const [jobAssignedTo, setJobAssignedTo] = useState('');
  const [jobDueDate, setJobDueDate] = useState('');
  const [jobEstCompletion, setJobEstCompletion] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Normal');
  const [ticketDepartment, setTicketDepartment] = useState('Technical Support');
  const [ticketAssignedStaff, setTicketAssignedStaff] = useState('');
  const [ticketSla, setTicketSla] = useState('24 Hours');
  const [ticketMessage, setTicketMessageText] = useState('');

  const [invDueDate, setInvDueDate] = useState(format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'));
  const [invStatus, setInvStatus] = useState('unpaid');
  const [invCurrency, setInvCurrency] = useState('LKR');
  const [invItemDesc, setInvItemDesc] = useState('');
  const [invItemPrice, setInvItemPrice] = useState('');
  const [invItemQty, setInvItemQty] = useState('1');

  const [noteType, setNoteType] = useState('Private');
  const [noteContent, setNoteContent] = useState('');

  const loadAll = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const [fullCustomer, domReqs, hostReqs, emailReqs, lics, invs, jbs, tks, custs, prods] = await Promise.all([
        getCustomerById(customer.id),
        getCustomerDomainRequests(customer.id),
        getCustomerHostingRequests(customer.id),
        getCustomerEmailRequests(customer.id),
        getLicenses(customer.id),
        getCustomerInvoices(customer.email),
        getCustomerJobs(customer.id),
        getTicketsByCustomer(customer.id),
        getCustomers(),
        getProducts()
      ]);

      // Fetch customer notes
      const { data: notes, error: notesError } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (notesError) console.error('Error loading notes:', notesError.message);

      setCustomerData(fullCustomer || customer);
      setDomainRequests(domReqs || []);
      setHostingRequests(hostReqs || []);
      setEmailRequests(emailReqs || []);
      setLicenses(lics || []);
      setInvoices(invs || []);
      setJobs(jbs || []);
      setTickets(tks || []);
      setInternalNotes(notes || []);
      setAllCustomers(custs || []);
      setAllProducts(prods || []);
    } catch (e) {
      console.error('Error loading page details:', e);
      toast({ title: 'Error loading profile details', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [customer?.id]);

  useEffect(() => {
    if (renewingHosting) {
      const baseDate = renewingHosting.expiry_date ? new Date(renewingHosting.expiry_date) : new Date();
      const year = baseDate.getFullYear();
      const month = String(baseDate.getMonth() + 1).padStart(2, '0');
      const day = String(baseDate.getDate()).padStart(2, '0');
      setRenewStartDate(`${year}-${month}-${day}`);
      setRenewalPeriod(String(renewingHosting.billing_period || 'yearly').toLowerCase());
    }
  }, [renewingHosting]);

  const handleCopyText = (text, type = 'Copied') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: type, description: 'Copied to clipboard.' });
  };

  // Impersonate customer
  const handleImpersonate = () => {
    sessionStorage.setItem('impersonated_user', JSON.stringify({
      id: customerData.user_id,
      email: customerData.email,
      name: customerData.name
    }));
    navigate(`/admin/impersonate/${customerData.id}`);
  };

  const handleSendPasswordReset = async () => {
    if (!customerData?.email) return;
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(customerData.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSendingReset(false);
    if (error) {
      const msg = error.message || '';
      const friendly = msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('over_email') || error.status === 429
        ? 'Email rate limit reached (3/hour). Please wait before trying again.'
        : msg || 'Failed to send reset email.';
      toast({ title: 'Error', description: friendly, variant: 'destructive' });
    } else {
      toast({ title: 'Reset Email Sent', description: `Password reset link sent to ${customerData.email}.` });
    }
  };

  const handleSaveCustomer = async () => {
    setIsSaving(true);
    try {
      await updateCustomer(customerData.id, {
        name: customerData.name, 
        email: customerData.email,
        phone: customerData.phone, 
        company: customerData.company, 
        country: customerData.country
      });
      addNotification({ customer_id: null, type: 'customer_updated', title: `Customer Updated — ${customerData.name}`, message: `Admin updated profile for ${customerData.name} (${customerData.email}).` }).catch(() => {});
      toast({ title: 'Customer Updated', description: 'Profile saved.' });
      await loadAll();
    } finally { setIsSaving(false); }
  };

  const getCalculatedStatus = (lic) => {
    if (lic.status === 'Disabled' || lic.status === 'Suspended' || lic.status === 'Expired') {
      return lic.status;
    }
    const lt = lic.license_type || lic.product?.license_type || 'one_time';
    
    if (lic.start_date) {
      const start = new Date(lic.start_date);
      if (new Date() < start) return 'Pending';
    }

    if (lt === 'lifetime') return 'Active';
    if (lt === 'one_time') {
      return 'Active';
    }
    if ((lt === 'yearly' || lt === 'monthly') && lic.expiry_date) {
      const days = Math.ceil((new Date(lic.expiry_date) - new Date()) / 86400000);
      if (days <= 0) return 'Expired';
      if (days <= 30) return 'Expiring Soon';
      return 'Active';
    }
    return 'Active';
  };

  // Health Status Badge Calculation
  const health = (() => {
    // Critical if:
    // 1. Any expired service (license status is Expired, or hosting status is Expired, or domain status is Expired)
    // 2. Overdue payment (any invoice has status 'overdue')
    // 3. High/Critical priority ticket open
    const hasExpiredService = 
      licenses.some(l => getCalculatedStatus(l) === 'Expired') ||
      hostingRequests.some(h => String(h.status).toLowerCase() === 'expired') ||
      domainRequests.some(d => String(d.status).toLowerCase() === 'expired');
      
    const hasOverduePayment = invoices.some(inv => inv.status === 'overdue');
    
    const hasCriticalTicket = tickets.some(t => 
      ['open', 'awaiting customer'].includes(String(t.status).toLowerCase()) && 
      ['high', 'critical'].includes(String(t.priority).toLowerCase())
    );
    
    if (hasExpiredService || hasOverduePayment || hasCriticalTicket) {
      return { 
        status: 'Critical', 
        color: '#f87171', 
        dot: '#ef4444',
        bg: 'rgba(220, 38, 38, 0.15)',
        details: [
          hasExpiredService && 'Service Expired',
          hasOverduePayment && 'Overdue Payment',
          hasCriticalTicket && 'High Priority Ticket Open'
        ].filter(Boolean)
      };
    }
    
    // Attention Required if:
    // 1. Any service expiring soon (license status 'Expiring Soon')
    // 2. Open tickets
    const hasExpiringService = 
      licenses.some(l => getCalculatedStatus(l) === 'Expiring Soon') ||
      hostingRequests.some(h => {
        if (!h.expiry_date) return false;
        const days = Math.ceil((new Date(h.expiry_date) - new Date()) / 86400000);
        return days > 0 && days <= 30;
      }) ||
      domainRequests.some(d => {
        if (!d.expiry_date) return false;
        const days = Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000);
        return days > 0 && days <= 30;
      });
      
    const hasOpenTicket = tickets.some(t => ['open', 'awaiting customer'].includes(String(t.status).toLowerCase()));
    
    if (hasExpiringService || hasOpenTicket) {
      return {
        status: 'Attention Required',
        color: '#fb923c',
        dot: '#fb923c',
        bg: 'rgba(251, 146, 60, 0.15)',
        details: [
          hasExpiringService && 'Hosting/Domain Expiring Soon',
          hasOpenTicket && `${tickets.filter(t => ['open', 'awaiting customer'].includes(String(t.status).toLowerCase())).length} Open Ticket(s)`
        ].filter(Boolean)
      };
    }
    
    // Healthy
    return {
      status: 'Healthy',
      color: '#4ade80',
      dot: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.15)',
      details: ['Products Active', 'No Overdue Invoices', 'No Critical Tickets']
    };
  })();

  // LTV & financial calculations
  const finances = (() => {
    const ltv = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const pendingPayments = invoices
      .filter(inv => ['unpaid', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate active services cost/year
    let activeCostYear = 0;
    
    // 1. Licenses/Products (yearly/monthly cost)
    licenses.forEach(l => {
      const type = l.license_type || l.product?.license_type || 'one_time';
      const price = l.price || l.product?.price || 0;
      if (type === 'yearly') activeCostYear += price;
      if (type === 'monthly') activeCostYear += price * 12;
    });

    // 2. Hosting Packages
    hostingRequests.forEach(h => {
      if (['approved', 'completed', 'active'].includes(String(h.status).toLowerCase())) {
        const price = h.price || 0;
        const period = String(h.billing_period || '').toLowerCase();
        if (period.includes('year') || period.includes('annual')) activeCostYear += price;
        else if (period.includes('month')) activeCostYear += price * 12;
      }
    });

    // 3. Domains
    domainRequests.forEach(d => {
      if (['approved', 'completed', 'active'].includes(String(d.status).toLowerCase())) {
        activeCostYear += (d.price || 0); // Domain pricing is yearly
      }
    });

    // 4. Emails
    emailRequests.forEach(e => {
      if (['approved', 'completed', 'active'].includes(String(e.status).toLowerCase())) {
        activeCostYear += (e.price || 0); // Emails usually yearly
      }
    });

    return { ltv, pendingPayments, activeCostYear };
  })();

  // Dynamic status counters
  const counters = {
    products: {
      total: licenses.length,
      active: licenses.filter(l => getCalculatedStatus(l) === 'Active').length,
      expired: licenses.filter(l => ['Expired', 'Suspended'].includes(getCalculatedStatus(l))).length
    },
    hosting: {
      total: hostingRequests.filter(h => ['approved', 'completed', 'active'].includes(String(h.status).toLowerCase())).length,
      active: hostingRequests.filter(h => ['approved', 'completed', 'active'].includes(String(h.status).toLowerCase())).length,
      suspended: hostingRequests.filter(h => String(h.status).toLowerCase() === 'suspended').length
    },
    domains: {
      total: domainRequests.filter(d => ['approved', 'completed', 'active'].includes(String(d.status).toLowerCase())).length,
      active: domainRequests.filter(d => ['approved', 'completed', 'active'].includes(String(d.status).toLowerCase())).length,
      expired: domainRequests.filter(d => String(d.status).toLowerCase() === 'expired').length
    },
    emails: {
      total: emailRequests.filter(e => ['approved', 'completed', 'active'].includes(String(e.status).toLowerCase())).length,
      active: emailRequests.filter(e => ['approved', 'completed', 'active'].includes(String(e.status).toLowerCase())).length,
      inactive: emailRequests.filter(e => ['pending', 'suspended'].includes(String(e.status).toLowerCase())).length
    },
    jobs: {
      total: jobs.length,
      active: jobs.filter(j => ['Pending', 'In Progress', 'Waiting'].includes(j.status)).length,
      completed: jobs.filter(j => j.status === 'Completed').length
    },
    tickets: {
      total: tickets.length,
      open: tickets.filter(t => ['open', 'awaiting customer', 'replied'].includes(String(t.status).toLowerCase())).length,
      closed: tickets.filter(t => String(t.status).toLowerCase() === 'closed').length
    }
  };

  // Compile Dynamic Activities
  const compileActivities = (notifs, tks, jbs, doms, hosts, emails, lics, invs) => {
    const list = [];
    
    // Add raw notifications (avoid duplicates of structural items)
    (notifs || []).forEach(n => {
      if (['ticket_reply', 'expiration', 'request_updated', 'invoice_paid'].includes(n.type)) return;
      list.push({
        id: `notif-${n.id}`,
        title: n.title,
        message: n.message,
        date: new Date(n.created_at || Date.now()),
        type: n.type || 'info',
        color: '#3b82f6'
      });
    });

    // Add tickets
    (tks || []).forEach(t => {
      const tId = t.id.slice(0, 4).toUpperCase();
      list.push({
        id: `tkt-create-${t.id}`,
        title: `Ticket #${tId} opened`,
        message: `Subject: ${t.subject}`,
        date: new Date(t.created_at),
        type: 'ticket',
        color: '#ef4444'
      });
      if (t.status === 'closed') {
        list.push({
          id: `tkt-close-${t.id}`,
          title: `Ticket #${tId} closed`,
          message: `Ticket "${t.subject}" marked as closed.`,
          date: new Date(t.updated_at || t.created_at),
          type: 'ticket',
          color: '#22c55e'
        });
      }
      (t.ticket_messages || []).forEach(m => {
        if (m.sender_role === 'admin') {
          list.push({
            id: `tkt-reply-${m.id}`,
            title: `Staff replied to ticket #${tId}`,
            message: m.message?.slice(0, 80) + (m.message?.length > 80 ? '...' : ''),
            date: new Date(m.created_at),
            type: 'ticket_reply',
            color: '#3b82f6'
          });
        } else if (m.sender_role === 'customer') {
          list.push({
            id: `tkt-cust-reply-${m.id}`,
            title: `Customer message on ticket #${tId}`,
            message: m.message?.slice(0, 80) + (m.message?.length > 80 ? '...' : ''),
            date: new Date(m.created_at),
            type: 'ticket_reply',
            color: '#a855f7'
          });
        }
      });
    });

    // Add jobs
    (jbs || []).forEach(j => {
      const jId = j.id.slice(0, 4).toUpperCase();
      list.push({
        id: `job-create-${j.id}`,
        title: `Job #${jId} created`,
        message: `${j.title} (${j.category})`,
        date: new Date(j.created_date || j.created_at),
        type: 'job',
        color: '#a855f7'
      });
      if (j.status === 'Completed') {
        list.push({
          id: `job-complete-${j.id}`,
          title: `Job #${jId} completed`,
          message: `Job "${j.title}" completed successfully.`,
          date: new Date(j.updated_at || j.created_at),
          type: 'job',
          color: '#22c55e'
        });
      }
    });

    // Add hosting
    (hosts || []).forEach(h => {
      const name = h.plan_name || 'Hosting Package';
      list.push({
        id: `host-create-${h.id}`,
        title: `Hosting request submitted`,
        message: `${name} for ${h.domain}`,
        date: new Date(h.created_at),
        type: 'hosting',
        color: '#eab308'
      });
      if (['approved', 'completed', 'active'].includes(String(h.status).toLowerCase()) && h.start_date) {
        list.push({
          id: `host-approve-${h.id}`,
          title: `Hosting package approved`,
          message: `${name} active for ${h.domain}`,
          date: new Date(h.start_date || h.updated_at),
          type: 'hosting',
          color: '#22c55e'
        });
      }
    });

    // Add domains
    (doms || []).forEach(d => {
      list.push({
        id: `dom-create-${d.id}`,
        title: `Domain request submitted`,
        message: `Domain: ${d.domain_name}`,
        date: new Date(d.created_at),
        type: 'domain',
        color: '#eab308'
      });
      if (['approved', 'completed', 'active'].includes(String(d.status).toLowerCase()) && d.start_date) {
        list.push({
          id: `dom-approve-${d.id}`,
          title: `Domain request approved`,
          message: `${d.domain_name} registered`,
          date: new Date(d.start_date || d.updated_at),
          type: 'domain',
          color: '#22c55e'
        });
      }
    });

    // Add emails
    (emails || []).forEach(e => {
      list.push({
        id: `email-create-${e.id}`,
        title: `Email request submitted`,
        message: `Email: ${e.email}`,
        date: new Date(e.created_at),
        type: 'email',
        color: '#eab308'
      });
      if (['approved', 'completed', 'active'].includes(String(e.status).toLowerCase()) && e.start_date) {
        list.push({
          id: `email-approve-${e.id}`,
          title: `Email request approved`,
          message: `${e.email} active`,
          date: new Date(e.start_date || e.updated_at),
          type: 'email',
          color: '#22c55e'
        });
      }
    });

    // Add licenses
    (lics || []).forEach(lic => {
      list.push({
        id: `lic-create-${lic.id}`,
        title: `Product assigned`,
        message: lic.name,
        date: new Date(lic.purchase_date || lic.start_date || lic.created_at),
        type: 'license',
        color: '#f97316'
      });
    });

    // Add invoices
    (invs || []).forEach(inv => {
      list.push({
        id: `inv-create-${inv.id}`,
        title: `Invoice #${inv.invoice_no} generated`,
        message: `Amount: Rs. ${inv.total?.toLocaleString()}`,
        date: new Date(inv.created_at || inv.invoice_date),
        type: 'invoice',
        color: '#6366f1'
      });
      if (inv.status === 'paid') {
        list.push({
          id: `inv-paid-${inv.id}`,
          title: `Invoice #${inv.invoice_no} paid`,
          message: `Payment cleared.`,
          date: new Date(inv.updated_at),
          type: 'invoice',
          color: '#22c55e'
        });
      } else if (inv.status === 'payment_submitted') {
        list.push({
          id: `inv-submit-${inv.id}`,
          title: `Payment submitted for Invoice #${inv.invoice_no}`,
          message: `Receipt uploaded for verification.`,
          date: new Date(inv.updated_at),
          type: 'invoice',
          color: '#fb923c'
        });
      }
    });

    list.sort((a, b) => b.date - a.date);
    return list;
  };

  const activities = compileActivities(
    [], // Pass notifications if we fetch them, otherwise timeline is computed from structural data
    tickets,
    jobs,
    domainRequests,
    hostingRequests,
    emailRequests,
    licenses,
    invoices
  );

  // Helper filters for lists
  const filteredLicenses = licenses
    .map(lic => ({ ...lic, calculatedStatus: getCalculatedStatus(lic) }))
    .filter(lic => {
      const term = productSearch.toLowerCase();
      const nameMatch = (lic.name || '').toLowerCase().includes(term);
      const typeMatch = (lic.product?.type || '').toLowerCase().includes(term);
      const keyMatch = (lic.license_key || '').toLowerCase().includes(term);
      const matchesSearch = nameMatch || typeMatch || keyMatch;
      const matchesStatus = productStatusFilter === 'all' || lic.calculatedStatus.toLowerCase() === productStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.start_date || 0);
      const dateB = new Date(b.created_at || b.start_date || 0);
      return productSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const filteredHosting = hostingRequests
    .filter(h => {
      const term = hostingSearch.toLowerCase();
      const domainMatch = (h.domain || '').toLowerCase().includes(term);
      const planMatch = (h.plan_name || '').toLowerCase().includes(term);
      const matchesSearch = domainMatch || planMatch;
      const matchesStatus = hostingStatusFilter === 'all' || String(h.status).toLowerCase() === hostingStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });

  const filteredDomains = domainRequests
    .filter(d => {
      const term = domainSearch.toLowerCase();
      const domainMatch = (d.domain_name || '').toLowerCase().includes(term);
      const matchesSearch = domainMatch;
      const matchesStatus = domainStatusFilter === 'all' || String(d.status).toLowerCase() === domainStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });

  const filteredEmails = emailRequests
    .filter(e => {
      const term = emailSearch.toLowerCase();
      const emailMatch = (e.email || '').toLowerCase().includes(term);
      const matchesSearch = emailMatch;
      const matchesStatus = emailStatusFilter === 'all' || String(e.status).toLowerCase() === emailStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });

  const filteredJobs = jobs
    .filter(j => {
      const term = jobSearch.toLowerCase();
      const titleMatch = (j.title || '').toLowerCase().includes(term);
      const categoryMatch = (j.category || '').toLowerCase().includes(term);
      const matchesSearch = titleMatch || categoryMatch;
      const matchesStatus = jobStatusFilter === 'all' || String(j.status).toLowerCase() === jobStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });

  const filteredTickets = tickets
    .filter(t => {
      const term = ticketSearch.toLowerCase();
      const subjectMatch = (t.subject || '').toLowerCase().includes(term);
      const matchesSearch = subjectMatch;
      const matchesStatus = ticketStatusFilter === 'all' || String(t.status).toLowerCase() === ticketStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });

  // Action Helpers
  const deleteItem = async (type, id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    const req = type === 'domain'
      ? [...domainRequests].find(r => r.id === id)
      : [...hostingRequests].find(r => r.id === id);
    if (type === 'domain') await deleteDomainRequest(id);
    else await deleteHostingRequest(id);
    const label = type === 'domain' ? (req?.domain_name || 'Domain') : (parsePackage(req?.package_type || '').name || 'Hosting');
    addNotification({ customer_id: null, type: 'delete', title: `${type === 'domain' ? 'Domain' : 'Hosting'} Request Deleted — ${label}`, message: `Admin deleted ${label} request for ${customerData.name}.` }).catch(() => {});
    await loadAll();
    toast({ title: 'Deleted', description: 'Item removed successfully.' });
  };

  const deleteEmailItem = async (id) => {
    if (!confirm('Delete this email request? This cannot be undone.')) return;
    const req = emailRequests.find(r => r.id === id);
    await deleteEmailRequest(id);
    const label = req?.email || 'Email';
    addNotification({ customer_id: null, type: 'delete', title: `Email Request Deleted — ${label}`, message: `Admin deleted email request for ${customerData.name} (${label}).` }).catch(() => {});
    await loadAll();
    toast({ title: 'Deleted', description: 'Email request removed.' });
  };

  const sendExpiryReminder = async (type, item) => {
    const today = new Date();
    const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
    const daysLeft = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
    let title, message;
    if (type === 'domain') {
      title = `Domain Renewal Reminder — ${item.domain_name}`;
      message = daysLeft !== null
        ? `Your domain "${item.domain_name}" will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please renew promptly to avoid service disruption.`
        : `Please renew your domain "${item.domain_name}" to ensure continued service.`;
    } else if (type === 'email') {
      title = `Email Renewal Reminder — ${item.email}`;
      message = daysLeft !== null
        ? `Your email "${item.email}" will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please renew promptly to avoid service disruption.`
        : `Please renew your email "${item.email}" to ensure continued service.`;
    } else {
      const { name } = parsePackage(item.package_type);
      title = `Hosting Renewal Reminder — ${name}`;
      message = `Your hosting package "${name}" is due for renewal. Please contact us to avoid any service interruption.`;
    }
    await addNotification({ customer_id: customerData.id, type: 'expiration', title, message });
    toast({ title: 'Notification Sent', description: 'Expiry reminder sent to customer.' });
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!jobTitle) return;
    try {
      await createJob({
        customer_id: customerData.id,
        title: jobTitle,
        category: jobCategory,
        priority: jobPriority,
        status: 'Pending',
        assign_to: jobAssignedTo || null,
        due_date: jobDueDate ? new Date(jobDueDate).toISOString() : null,
        estimated_completion_date: jobEstCompletion ? new Date(jobEstCompletion).toISOString() : null,
        description: jobDescription,
        progress_percent: 0,
        timeline_steps: ['Request Submitted', 'Under Review', 'Waiting for Customer', 'Job Created', 'Design Phase', 'Development', 'Testing', 'Client Review', 'Completed']
      });
      
      // Notify
      await supabase.from('notifications').insert([{
        customer_id: customerData.id,
        type: 'update',
        title: 'New Job Created',
        message: `A new job "${jobTitle}" has been scheduled for your account.`,
      }]);

      toast({ title: 'Job Created', description: `Job "${jobTitle}" added successfully.` });
      setIsCreateJobOpen(false);
      setJobTitle('');
      setJobDescription('');
      setJobAssignedTo('');
      setJobDueDate('');
      setJobEstCompletion('');
      loadAll();
    } catch (err) {
      toast({ title: 'Error creating job', description: err.message, variant: 'destructive' });
    }
  };

  const handleOpenTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;
    try {
      // 1. Create ticket
      const { data: t, error: tErr } = await supabase
        .from('tickets')
        .insert([{
          customer_id: customerData.id,
          subject: ticketSubject,
          priority: ticketPriority,
          status: 'open',
          department: ticketDepartment,
          assigned_staff: ticketAssignedStaff || null,
          response_sla: ticketSla,
          last_reply_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (tErr) throw tErr;

      // 2. Add message
      await addTicketMessage(t.id, 'admin', ticketMessage);

      // 3. Notify customer
      await supabase.from('notifications').insert([{
        customer_id: customerData.id,
        type: 'ticket_reply',
        title: 'New Ticket Opened',
        message: `Support ticket #${t.id.slice(0,4).toUpperCase()} opened: "${ticketSubject}"`,
      }]);

      toast({ title: 'Ticket Opened', description: `Ticket opened successfully.` });
      setIsOpenTicketOpen(false);
      setTicketSubject('');
      setTicketMessageText('');
      setTicketAssignedStaff('');
      loadAll();
    } catch (err) {
      toast({ title: 'Error opening ticket', description: err.message, variant: 'destructive' });
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!invItemDesc || !invItemPrice) return;
    try {
      const no = await generateInvoiceNo();
      const amount = parseFloat(invItemPrice) * parseInt(invItemQty);
      
      const invoiceData = {
        invoice_no: no,
        invoice_date: todayISO(),
        due_date: new Date(invDueDate).toISOString(),
        status: invStatus,
        client_name: customerData.name || '',
        client_company: customerData.company || '',
        client_phone: customerData.phone || '',
        client_email: customerData.email || '',
        client_address: customerData.country || '',
        notes: 'Generated from customer profile quick actions.',
        total: amount,
        currency: invCurrency
      };

      const items = [{
        description: invItemDesc,
        qty: parseInt(invItemQty),
        unit_price: parseFloat(invItemPrice),
        amount: amount
      }];

      await createInvoice(invoiceData, items);

      // Notify customer
      await supabase.from('notifications').insert([{
        customer_id: customerData.id,
        type: 'update',
        title: 'Invoice Generated',
        message: `Invoice #${no} for Rs. ${amount.toLocaleString()} has been generated.`,
      }]);

      toast({ title: 'Invoice Generated', description: `Invoice #${no} created successfully.` });
      setIsGenerateInvoiceOpen(false);
      setInvItemDesc('');
      setInvItemPrice('');
      setInvItemQty('1');
      loadAll();
    } catch (err) {
      toast({ title: 'Error generating invoice', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      const { error } = await supabase
        .from('customer_notes')
        .insert([{
          customer_id: customerData.id,
          note_type: noteType,
          note_content: noteContent,
          created_by: 'Admin'
        }]);

      if (error) throw error;

      toast({ title: 'Note Added', description: 'Internal note saved successfully.' });
      setIsAddNoteOpen(false);
      setNoteContent('');
      loadAll();
    } catch (err) {
      toast({ title: 'Error saving note', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Delete this internal note?')) return;
    try {
      const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
      toast({ title: 'Note Deleted' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error deleting note', description: err.message, variant: 'destructive' });
    }
  };

  // Quick operations on active items
  const handleRenewProduct = async (lic) => {
    try {
      const currentExpiry = lic.expiry_date ? new Date(lic.expiry_date) : new Date();
      currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
      
      const { error } = await supabase
        .from('licenses')
        .update({
          expiry_date: currentExpiry.toISOString(),
          status: 'Active'
        })
        .eq('id', lic.id);

      if (error) throw error;
      toast({ title: 'Product Renewed', description: 'Expiry date extended by 1 year.' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error renewing product', description: err.message, variant: 'destructive' });
    }
  };

  const handleSuspendProduct = async (lic) => {
    try {
      const { error } = await supabase
        .from('licenses')
        .update({ status: 'Suspended' })
        .eq('id', lic.id);

      if (error) throw error;
      toast({ title: 'Product Suspended' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error suspending product', description: err.message, variant: 'destructive' });
    }
  };

  const handleRenewHosting = async (h) => {
    try {
      const currentExpiry = h.expiry_date ? new Date(h.expiry_date) : new Date();
      const period = String(h.billing_period || '').toLowerCase();
      if (period.includes('month')) {
        currentExpiry.setMonth(currentExpiry.getMonth() + 1);
      } else {
        currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
      }
      
      const { error } = await supabase
        .from('hosting_requests')
        .update({
          expiry_date: currentExpiry.toISOString(),
          status: 'approved'
        })
        .eq('id', h.id);

      if (error) throw error;
      toast({ title: 'Hosting Renewed', description: `Expiry extended.` });
      loadAll();
    } catch (err) {
      toast({ title: 'Error renewing hosting', description: err.message, variant: 'destructive' });
    }
  };

  const calculatedExpiry = (() => {
    if (!renewStartDate || !renewalPeriod) return '';
    const parts = renewStartDate.split('-');
    if (parts.length !== 3) return '';
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(date.getTime())) return '';
    
    switch (renewalPeriod) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'semi-annually':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case '2years':
        date.setFullYear(date.getFullYear() + 2);
        break;
      case '3years':
        date.setFullYear(date.getFullYear() + 3);
        break;
      case '5years':
        date.setFullYear(date.getFullYear() + 5);
        break;
      default:
        break;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const handleSaveRenewal = async () => {
    if (!renewingHosting || !renewStartDate || !calculatedExpiry) return;
    try {
      setLoading(true);
      
      let currentHistory = [];
      if (renewingHosting.renewal_history && Array.isArray(renewingHosting.renewal_history)) {
        currentHistory = [...renewingHosting.renewal_history];
      }
      
      // If history is empty, insert the initial state as first history record
      if (currentHistory.length === 0) {
        currentHistory.push({
          renew_start_date: renewingHosting.start_date || renewingHosting.created_at,
          renewal_time: renewingHosting.billing_period || 'yearly',
          expiry_date: renewingHosting.expiry_date
        });
      }
      
      // Push new renewal event
      const newEntry = {
        renew_start_date: new Date(renewStartDate).toISOString(),
        renewal_time: renewalPeriod,
        expiry_date: new Date(calculatedExpiry).toISOString(),
        created_at: new Date().toISOString()
      };
      
      const updatedHistory = [...currentHistory, newEntry];
      
      const { error } = await supabase
        .from('hosting_requests')
        .update({
          expiry_date: new Date(calculatedExpiry).toISOString(),
          billing_period: renewalPeriod,
          renewal_history: updatedHistory
        })
        .eq('id', renewingHosting.id);

      if (error) throw error;
      
      toast({ title: 'Hosting Renewed Successfully', description: `Expiry extended to ${safeFormatDate(calculatedExpiry)}.` });
      setRenewingHosting(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Error Renewing Hosting', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendHosting = async (h) => {
    try {
      const { error } = await supabase
        .from('hosting_requests')
        .update({ status: 'suspended' })
        .eq('id', h.id);

      if (error) throw error;
      toast({ title: 'Hosting Suspended' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error suspending hosting', description: err.message, variant: 'destructive' });
    }
  };

  const handleResetEmailPassword = async (emailReq) => {
    const newPass = prompt(`Enter new password for ${emailReq.email}:`);
    if (!newPass) return;
    try {
      const { error } = await supabase
        .from('email_requests')
        .update({
          email_password: newPass,
          password_last_changed: new Date().toISOString()
        })
        .eq('id', emailReq.id);

      if (error) throw error;
      toast({ title: 'Password Reset', description: 'Webmail password updated successfully.' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error resetting password', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditEmailQuota = async (emailReq) => {
    const newQuota = prompt(`Enter new quota for ${emailReq.email} (e.g. 5 GB, 10 GB):`, emailReq.storage_used || '5 GB');
    if (newQuota === null) return;
    try {
      const { error } = await supabase
        .from('email_requests')
        .update({ storage_used: newQuota })
        .eq('id', emailReq.id);

      if (error) throw error;
      toast({ title: 'Quota Updated' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error updating quota', description: err.message, variant: 'destructive' });
    }
  };

  const handleQuickJobStatus = async (job, newStatus) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', job.id);
      if (error) throw error;
      toast({ title: 'Job Status Updated', description: `Job set to "${newStatus}".` });
      loadAll();
    } catch (err) {
      toast({ title: 'Error updating status', description: err.message, variant: 'destructive' });
    }
  };

  const handleQuickJobProgress = async (job) => {
    const val = prompt(`Enter progress percentage (0 - 100):`, job.progress_percent || '0');
    if (val === null) return;
    const progress = parseInt(val);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      alert('Invalid percentage.');
      return;
    }
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ progress_percent: progress })
        .eq('id', job.id);
      if (error) throw error;
      toast({ title: 'Job Progress Updated' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error updating progress', description: err.message, variant: 'destructive' });
    }
  };

  const handleQuickTicketStatus = async (tkt, newStatus) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', tkt.id);
      if (error) throw error;
      toast({ title: 'Ticket Status Updated' });
      loadAll();
    } catch (err) {
      toast({ title: 'Error updating status', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateHostingSave = async (e) => {
    e.preventDefault();
    if (!editingHosting) return;
    try {
      const { error } = await supabase
        .from('hosting_requests')
        .update({
          server_name: editingHosting.server_name,
          hosting_provider: editingHosting.hosting_provider,
          disk_usage: editingHosting.disk_usage,
          bandwidth_usage: editingHosting.bandwidth_usage,
          disk_usage_limit: editingHosting.disk_usage_limit,
          bandwidth_limit: editingHosting.bandwidth_limit,
          cpanel: editingHosting.cpanel,
          ftp: editingHosting.ftp,
          renewal_cost: editingHosting.renewal_cost ? parseFloat(editingHosting.renewal_cost) : null,
          status: editingHosting.status,
          expiry_date: editingHosting.expiry_date ? new Date(editingHosting.expiry_date).toISOString() : null,
          start_date: editingHosting.start_date ? new Date(editingHosting.start_date).toISOString() : null
        })
        .eq('id', editingHosting.id);

      if (error) throw error;
      toast({ title: 'Hosting Package Updated' });
      setEditingHosting(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Error saving hosting data', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateDomainSave = async (e) => {
    e.preventDefault();
    if (!editingDomain) return;
    try {
      const { error } = await supabase
        .from('domain_requests')
        .update({
          registrar: editingDomain.registrar,
          nameservers: editingDomain.nameservers,
          whois_privacy: editingDomain.whois_privacy,
          auto_renew: editingDomain.auto_renew,
          status: editingDomain.status,
          expiry_date: editingDomain.expiry_date ? new Date(editingDomain.expiry_date).toISOString() : null,
          start_date: editingDomain.start_date ? new Date(editingDomain.start_date).toISOString() : null
        })
        .eq('id', editingDomain.id);

      if (error) throw error;
      toast({ title: 'Domain Details Updated' });
      setEditingDomain(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Error saving domain data', description: err.message, variant: 'destructive' });
    }
  };



  const handleUpdateJobSave = async (e) => {
    e.preventDefault();
    if (!editingJob) return;
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          title: editingJob.title,
          category: editingJob.category,
          priority: editingJob.priority,
          assign_to: editingJob.assign_to,
          progress_percent: parseInt(editingJob.progress_percent || 0),
          status: editingJob.status,
          due_date: editingJob.due_date ? new Date(editingJob.due_date).toISOString() : null,
          estimated_completion_date: editingJob.estimated_completion_date ? new Date(editingJob.estimated_completion_date).toISOString() : null,
          description: editingJob.description
        })
        .eq('id', editingJob.id);

      if (error) throw error;
      toast({ title: 'Job Details Updated' });
      setEditingJob(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Error saving job data', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateTicketSave = async (e) => {
    e.preventDefault();
    if (!editingTicket) return;
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          subject: editingTicket.subject,
          priority: editingTicket.priority,
          department: editingTicket.department,
          assigned_staff: editingTicket.assigned_staff,
          response_sla: editingTicket.response_sla,
          status: editingTicket.status
        })
        .eq('id', editingTicket.id);

      if (error) throw error;
      toast({ title: 'Ticket Details Updated' });
      setEditingTicket(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Error saving ticket data', description: err.message, variant: 'destructive' });
    }
  };

  // Styles definitions
  const cardS = { 
    background: c.card, 
    border: `1px solid ${c.border}`, 
    borderRadius: 14, 
    overflow: 'hidden', 
    marginBottom: 20, 
    boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' 
  };
  const thS = {
    textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700,
    color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2,
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
    borderBottom: `1px solid ${c.border}`,
    whiteSpace: 'nowrap',
  };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle', whiteSpace: 'nowrap' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const col = isDark
      ? (['approved', 'completed', 'active', 'replied', 'healthy'].includes(s) ? { bg: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', dot: '#4ade80' }
        : ['pending', 'expiring soon', 'attention required', 'in progress', 'waiting customer'].includes(s) ? { bg: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', dot: '#fb923c' }
        : { bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171', dot: '#f87171' })
      : (['approved', 'completed', 'active', 'replied', 'healthy'].includes(s) ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
        : ['pending', 'expiring soon', 'attention required', 'in progress', 'waiting customer'].includes(s) ? { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' }
        : { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' });
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
        {status || '-'}
      </span>
    );
  };

  const Btn = ({ onClick, color, children, title, filled }) => (
    <button onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${color}`,
      background: filled ? color : 'transparent',
      color: filled ? '#fff' : color,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
      whiteSpace: 'nowrap'
    }}>
      {children}
    </button>
  );

  return (
    <div style={{ width: '100%', maxWidth: 1560, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          color: c.subText, cursor: 'pointer', fontSize: 13.5, padding: '6px 0',
          fontWeight: 500, transition: 'color 0.15s'
        }}>
          <ChevronLeft size={16} /> Customers
        </button>
        <span style={{ color: c.subText, fontSize: 13 }}>&gt;</span>
        <span style={{ color: c.text, fontSize: 13, fontWeight: 600 }}>Customer Details</span>
      </div>

      {/* Main Grid: Left content, Right sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start', gridTemplateAreas: '"main sidebar"' }}>
        
        {/* Left Column (Main Content) */}
        <div style={{ gridArea: 'main', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Profile Header Card */}
          <div style={{ ...cardS, marginBottom: 0 }}>
            <div style={{
              padding: '24px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderBottom: `1px solid ${c.border}`,
              background: isDark ? 'rgba(232,123,53,0.05)' : 'rgba(232,123,53,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: '50%', background: c.brand,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0
                }}>
                  {(customerData.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{customerData.name}</span>
                    <span 
                      style={{ 
                        background: health.bg, color: health.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                      }}
                      title={health.details.join(' | ')}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: health.dot }} />
                      {health.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: c.subText, marginTop: 4, display: 'flex', gap: 12 }}>
                    <span>Customer ID: <strong>CUS-{(customerData.id || '').split('-')[0]?.toUpperCase() || 'UNKNOWN'}</strong></span>
                    <span>|</span>
                    <span>Member Since: <strong>{customerData.created_at ? format(new Date(customerData.created_at), 'MMM dd, yyyy') : '-'}</strong></span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSendPasswordReset} disabled={isSendingReset} title="Send password reset email" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${c.border}`,
                  background: 'transparent', color: c.text, fontSize: 12.5, fontWeight: 600,
                  cursor: isSendingReset ? 'default' : 'pointer', opacity: isSendingReset ? 0.65 : 1
                }}>
                  <KeyRound size={13} />
                  Reset Password
                </button>
                <button onClick={handleSaveCustomer} disabled={isSaving} style={{
                  padding: '9px 20px', borderRadius: 8, border: 'none', background: c.brand,
                  color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
                }}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Overview Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '16px 24px', borderBottom: `1px solid ${c.border}`, background: isDark ? '#1a1d24' : '#fafafa' }}>
              <div>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Last Login</div>
                <div style={{ fontSize: 13.5, color: c.text, fontWeight: 600, marginTop: 4 }}>
                  {activities.find(a => a.title?.includes('Login'))?.date ? format(activities.find(a => a.title?.includes('Login')).date, 'MMM dd, yyyy • hh:mm a') : 'Jun 14, 2026 • 10:20 AM'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Account Status</div>
                <div style={{ fontSize: 13.5, color: c.text, fontWeight: 600, marginTop: 4 }}>Active</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Account Manager</div>
                <div style={{ fontSize: 13.5, color: c.text, fontWeight: 600, marginTop: 4 }}>Admin</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Spending</div>
                <div style={{ fontSize: 13.5, color: '#22c55e', fontWeight: 700, marginTop: 4 }}>Rs. {finances.ltv.toLocaleString()}</div>
              </div>
            </div>

            {/* Editable Info Fields Cards (Styled borderless inputs inside cards) */}
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {/* Email Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', flexShrink: 0 }}>
                  <Mail size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 10, color: c.subText, fontWeight: 700, textTransform: 'uppercase' }}>Email</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <input 
                      value={customerData.email || ''} 
                      onChange={e => setCustomerData({ ...customerData, email: e.target.value })}
                      style={{ background: 'transparent', border: 'none', color: c.text, fontSize: 13, fontWeight: 600, width: '100%', outline: 'none', padding: 0 }}
                    />
                    <Copy size={12} style={{ color: c.subText, cursor: 'pointer', flexShrink: 0 }} onClick={() => handleCopyText(customerData.email, 'Email')} />
                  </div>
                </div>
              </div>

              {/* Phone Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', flexShrink: 0 }}>
                  <Phone size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 10, color: c.subText, fontWeight: 700, textTransform: 'uppercase' }}>Phone</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <input 
                      value={customerData.phone || ''} 
                      onChange={e => setCustomerData({ ...customerData, phone: e.target.value })}
                      style={{ background: 'transparent', border: 'none', color: c.text, fontSize: 13, fontWeight: 600, width: '100%', outline: 'none', padding: 0 }}
                    />
                    <Copy size={12} style={{ color: c.subText, cursor: 'pointer', flexShrink: 0 }} onClick={() => handleCopyText(customerData.phone, 'Phone')} />
                  </div>
                </div>
              </div>

              {/* Company Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
                  <Building size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: 10, color: c.subText, fontWeight: 700, textTransform: 'uppercase' }}>Company</label>
                  <input 
                    value={customerData.company || ''} 
                    onChange={e => setCustomerData({ ...customerData, company: e.target.value })}
                    style={{ background: 'transparent', border: 'none', color: c.text, fontSize: 13, fontWeight: 600, width: '100%', outline: 'none', padding: 0 }}
                  />
                </div>
              </div>

              {/* Country Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', flexShrink: 0 }}>
                  <Globe size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: 10, color: c.subText, fontWeight: 700, textTransform: 'uppercase' }}>Country</label>
                  <input 
                    value={customerData.country || ''} 
                    onChange={e => setCustomerData({ ...customerData, country: e.target.value })}
                    style={{ background: 'transparent', border: 'none', color: c.text, fontSize: 13, fontWeight: 600, width: '100%', outline: 'none', padding: 0 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Service Summary Cards (Clickable to switch tab) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {[
              { id: 'products', label: 'Products', count: counters.products.total, active: counters.products.active, extra: `${counters.products.expired} Expired`, icon: <Package size={18} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
              { id: 'hosting', label: 'Hosting', count: counters.hosting.total, active: counters.hosting.active, extra: `${counters.hosting.suspended} Suspended`, value: `Rs. ${finances.activeCostYear?.toLocaleString()} / Yr`, icon: <ServerIcon size={18} />, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
              { id: 'domains', label: 'Domains', count: counters.domains.total, active: counters.domains.active, extra: `${counters.domains.expired} Expired`, icon: <Globe size={18} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
              { id: 'emails', label: 'Emails', count: counters.emails.total, active: counters.emails.active, extra: `${counters.emails.inactive} Inactive`, icon: <Mail size={18} />, color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
              { id: 'jobs', label: 'Jobs', count: counters.jobs.total, active: counters.jobs.active, extra: `${counters.jobs.completed} Completed`, icon: <Briefcase size={18} />, color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
              { id: 'tickets', label: 'Tickets', count: counters.tickets.total, active: counters.tickets.open, extra: `${counters.tickets.closed} Closed`, icon: <MessageSquare size={18} />, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
            ].map(card => (
              <div 
                key={card.id} 
                onClick={() => setActiveTab(card.id)}
                style={{
                  background: c.card, border: `1.5px solid ${activeTab === card.id ? card.color : c.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.2s',
                  boxShadow: activeTab === card.id ? `0 4px 16px ${card.bg}` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.subText }}>{card.label}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: c.text, lineHeight: 1.1 }}>{card.count}</div>
                <div style={{ fontSize: 11, color: card.active > 0 ? card.color : c.subText, fontWeight: 600 }}>
                  {card.active} Active {card.extra && `· ${card.extra}`}
                </div>
                {card.value && <div style={{ fontSize: 10.5, color: c.subText, fontWeight: 700, borderTop: `1px solid ${c.border}`, paddingTop: 4, marginTop: 2 }}>{card.value}</div>}
              </div>
            ))}
          </div>

          {/* Tabs Navigation */}
          <div style={{ borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 1 }}>
            {[
              { id: 'products', label: 'Products', count: counters.products.total },
              { id: 'hosting', label: 'Hosting', count: hostingRequests.length },
              { id: 'domains', label: 'Domains', count: domainRequests.length },
              { id: 'emails', label: 'Emails', count: emailRequests.length },
              { id: 'jobs', label: 'Jobs', count: jobs.length },
              { id: 'tickets', label: 'Tickets', count: tickets.length },
              { id: 'notes', label: 'Notes', count: internalNotes.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? c.brand : 'transparent'}`, color: activeTab === tab.id ? c.text : c.subText, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
                }}
              >
                {tab.label}
                <span style={{ background: activeTab === tab.id ? 'var(--brand-color-light)' : 'rgba(255,255,255,0.05)', color: activeTab === tab.id ? c.brand : c.subText, fontSize: 10.5, padding: '2px 6px', borderRadius: 10 }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Active Tab Table Content */}
          <div style={{ ...cardS, minHeight: 300 }}>
            
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text" placeholder="Search assigned products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                    style={{ padding: '7px 12px', fontSize: 13, border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, width: 260 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={productStatusFilter} onChange={(e) => setProductStatusFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: `1.5px solid ${c.border}`, background: isDark ? '#22252C' : '#fff', color: c.text }}>
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="expiring soon">Expiring Soon</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thS}>Product</th>
                        <th style={thS}>Version</th>
                        <th style={thS}>Renewal Type</th>
                        <th style={thS}>Purchase Price</th>
                        <th style={thS}>Renewal Price</th>
                        <th style={thS}>Start Date</th>
                        <th style={thS}>Expiry Date</th>
                        <th style={thS}>Status</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLicenses.map((lic, i) => {
                        const row = i % 2 === 0 ? tdS : tdAlt;
                        const pImg = lic.product?.image_url || null;
                        const type = lic.license_type || lic.product?.license_type || 'one_time';
                        return (
                          <tr key={lic.id}>
                            <td style={row}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {pImg ? (
                                  <img src={pImg} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} alt="" />
                                ) : (
                                  <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--brand-color-light)', color: c.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={14} /></div>
                                )}
                                <span style={{ fontWeight: 600 }}>{lic.name}</span>
                              </div>
                            </td>
                            <td style={row}>{lic.version || lic.product?.version || '1.0.0'}</td>
                            <td style={row}><span style={{ textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span></td>
                            <td style={row}>Rs. {lic.price?.toLocaleString() || lic.product?.price?.toLocaleString() || '0'}</td>
                            <td style={row}>Rs. {lic.renewal_price?.toLocaleString() || lic.product?.renewal_price?.toLocaleString() || '0'}</td>
                            <td style={row}>{lic.start_date ? format(new Date(lic.start_date), 'MMM dd, yyyy') : '—'}</td>
                            <td style={row}>{lic.expiry_date ? format(new Date(lic.expiry_date), 'MMM dd, yyyy') : '—'}</td>
                            <td style={row}><StatusBadge status={lic.calculatedStatus} /></td>
                            <td style={{ ...row, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                <button onClick={() => setViewingLicense(lic)} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 4 }} title="View"><Eye size={14} /></button>
                                <button onClick={() => setEditingLicense(lic)} style={{ background: 'none', border: 'none', color: c.brand, cursor: 'pointer', padding: 4 }} title="Edit"><Edit size={14} /></button>
                                <button onClick={async () => {
                                  if (!confirm('Revoke this product license?')) return;
                                  await deleteLicense(lic.id);
                                  toast({ title: 'License revoked' });
                                  loadAll();
                                }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }} title="Delete"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLicenses.length === 0 && <tr><td colSpan={9} style={emptyS}>No products assigned.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Hosting Tab */}
            {activeTab === 'hosting' && (
              <div>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text" placeholder="Search hosting packages..." value={hostingSearch} onChange={(e) => setHostingSearch(e.target.value)}
                    style={{ padding: '7px 12px', fontSize: 13, border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, width: 260 }}
                  />
                  <select value={hostingStatusFilter} onChange={(e) => setHostingStatusFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: `1.5px solid ${c.border}`, background: isDark ? '#22252C' : '#fff', color: c.text }}>
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thS}>Package</th>
                        <th style={thS}>Start Date</th>
                        <th style={thS}>End Date</th>
                        <th style={thS}>Disk Usage</th>
                        <th style={thS}>Bandwidth</th>
                        <th style={thS}>Price</th>
                        <th style={thS}>Status</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHosting.map((h, i) => {
                        const row = i % 2 === 0 ? tdS : tdAlt;
                        const packageLabel = parsePackageSummary(h.package_type).name;
                        return (
                          <tr key={h.id}>
                            <td style={row}>{h.plan_name || packageLabel}</td>
                            <td style={row}>{safeFormatDate(h.start_date)}</td>
                            <td style={row}>{safeFormatDate(h.expiry_date)}</td>
                            <td style={row}>{h.disk_usage || '—'} / {h.disk_usage_limit || '—'}</td>
                            <td style={row}>{h.bandwidth_usage || '—'} / {h.bandwidth_limit || '—'}</td>
                            <td style={row}>{formatPrice(h.price)}</td>
                            <td style={row}><StatusBadge status={h.status} /></td>
                            <td style={{ ...row, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                <button onClick={() => setViewingHosting(h)} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 4 }} title="View Details"><Eye size={14} /></button>
                                <button onClick={() => setRenewingHosting(h)} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 4 }} title="Renew & Timeline"><RefreshCw size={14} /></button>
                                <button onClick={() => setEditingHosting(h)} style={{ background: 'none', border: 'none', color: c.brand, cursor: 'pointer', padding: 4 }} title="Quick Edit"><Edit size={14} /></button>
                                <button onClick={() => deleteItem('hosting', h.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }} title="Delete"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredHosting.length === 0 && <tr><td colSpan={8} style={emptyS}>No hosting packages.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Domains Tab */}
            {activeTab === 'domains' && (
              <div>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text" placeholder="Search domains..." value={domainSearch} onChange={(e) => setDomainSearch(e.target.value)}
                    style={{ padding: '7px 12px', fontSize: 13, border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, width: 260 }}
                  />
                  <select value={domainStatusFilter} onChange={(e) => setDomainStatusFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: `1.5px solid ${c.border}`, background: isDark ? '#22252C' : '#fff', color: c.text }}>
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thS}>Domain</th>
                        <th style={thS}>Start Date</th>
                        <th style={thS}>End Date</th>
                        <th style={thS}>Auto Renewal</th>
                        <th style={thS}>Price</th>
                        <th style={thS}>Status</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDomains.map((d, i) => {
                        const row = i % 2 === 0 ? tdS : tdAlt;
                        return (
                          <tr key={d.id}>
                            <td style={row}><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6' }}>{d.domain_name}</span></td>
                            <td style={row}>{safeFormatDate(d.start_date)}</td>
                            <td style={row}>{safeFormatDate(d.expiry_date)}</td>
                            <td style={row}>
                              <span style={{ color: d.auto_renew ? '#22c55e' : c.subText, fontSize: 12, fontWeight: 600 }}>
                                {d.auto_renew ? 'Auto Renewal Enabled' : 'Auto Renewal Disabled'}
                              </span>
                            </td>
                            <td style={row}>{formatPrice(d.price)}</td>
                            <td style={row}><StatusBadge status={d.status} /></td>
                            <td style={{ ...row, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                <button onClick={() => setViewingDomain(d)} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 4 }} title="View Details"><Eye size={14} /></button>
                                <button onClick={() => setEditingDomain(d)} style={{ background: 'none', border: 'none', color: c.brand, cursor: 'pointer', padding: 4 }} title="Quick Edit"><Edit size={14} /></button>
                                <button onClick={() => sendExpiryReminder('domain', d)} style={{ background: 'none', border: 'none', color: c.brand, cursor: 'pointer', padding: 4 }} title="Send Reminder"><Bell size={14} /></button>
                                <button onClick={() => deleteItem('domain', d.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }} title="Delete"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDomains.length === 0 && <tr><td colSpan={7} style={emptyS}>No domains assigned.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Emails Tab */}
            {activeTab === 'emails' && (
              <div>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text" placeholder="Search email accounts..." value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)}
                    style={{ padding: '7px 12px', fontSize: 13, border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, width: 260 }}
                  />
                  <select value={emailStatusFilter} onChange={(e) => setEmailStatusFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: `1.5px solid ${c.border}`, background: isDark ? '#22252C' : '#fff', color: c.text }}>
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thS}>Email Address</th>
                        <th style={thS}>Package</th>
                        <th style={thS}>Start Date</th>
                        <th style={thS}>Expiry</th>
                        <th style={thS}>Auto Renew</th>
                        <th style={thS}>Status</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmails.map((e, i) => {
                        const row = i % 2 === 0 ? tdS : tdAlt;
                        return (
                          <tr key={e.id}>
                            <td style={row}><span style={{ fontWeight: 600 }}>{e.email}</span></td>
                            <td style={row}>{e.plan_name || e.email_type || 'Starter Email'}</td>
                            <td style={row}>{e.start_date ? format(new Date(e.start_date), 'MMM dd, yyyy') : '—'}</td>
                            <td style={row}>{e.expiry_date ? format(new Date(e.expiry_date), 'MMM dd, yyyy') : '—'}</td>
                            <td style={row}>
                              <span style={{ color: e.auto_renew ? '#22c55e' : c.subText, fontSize: 12, fontWeight: 600 }}>
                                {e.auto_renew ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                            <td style={row}><StatusBadge status={e.status} /></td>
                            <td style={{ ...row, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                {(e.email_username || e.email_password) && (
                                  <button onClick={() => setShowEmailCreds(e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.border}`, background: isDark ? 'rgba(234,179,8,0.12)' : '#fef9c3', color: '#ca8a04', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                    <Lock size={11} /> Credentials
                                  </button>
                                )}
                                <button onClick={() => setEditingEmail(e)} style={{ background: 'none', border: 'none', color: c.brand, cursor: 'pointer', padding: 4 }} title="Quick Edit"><Edit size={14} /></button>
                                <button onClick={() => deleteEmailItem(e.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }} title="Delete"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEmails.length === 0 && <tr><td colSpan={7} style={emptyS}>No email accounts assigned.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <div>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text" placeholder="Search jobs..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)}
                    style={{ padding: '7px 12px', fontSize: 13, border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, width: 260 }}
                  />
                  <select value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: `1.5px solid ${c.border}`, background: isDark ? '#22252C' : '#fff', color: c.text }}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="waiting customer">Waiting Customer</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thS, width: '12%' }}>Job ID</th>
                        <th style={{ ...thS, width: '20%' }}>Job Title</th>
                        <th style={{ ...thS, width: '10%' }}>Priority</th>
                        <th style={{ ...thS, width: '14%' }}>Assigned Staff</th>
                        <th style={{ ...thS, width: '16%' }}>Progress</th>
                        <th style={{ ...thS, width: '11%' }}>Due Date</th>
                        <th style={{ ...thS, width: '10%' }}>Status</th>
                        <th style={{ ...thS, width: '17%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((j, i) => {
                        const row = i % 2 === 0 ? tdS : tdAlt;
                        const DEFAULT_STEPS = ['Request Submitted','Under Review','Waiting for Customer','Job Created','Design Phase','Development','Testing','Client Review','Completed'];
                        const steps = Array.isArray(j.timeline_steps) && j.timeline_steps.length > 0 ? j.timeline_steps : DEFAULT_STEPS;
                        const progressStep = j.progress_step ?? 0;
                        const pct = Math.round((progressStep / Math.max(1, steps.length - 1)) * 100);
                        const currentStepLabel = steps[progressStep] || steps[steps.length - 1];
                        return (
                          <tr key={j.id}>
                            <td style={{ ...row, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ fontFamily: 'monospace', fontWeight: 600, color: c.brand }}>JOB-{j.id.slice(0, 4).toUpperCase()}</span></td>
                            <td style={{ ...row, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ fontWeight: 600 }}>{j.title}</span></td>
                            <td style={row}><span style={{ color: j.priority === 'Critical' || j.priority === 'High' ? '#f87171' : c.text, fontWeight: 600 }}>{j.priority}</span></td>
                            <td style={{ ...row, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.assign_to || 'Unassigned'}</td>
                            <td style={row}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ flex: 1, height: 5, background: isDark ? '#374151' : '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : '#f59e0b', borderRadius: 3, transition: 'width 0.3s' }} />
                                  </div>
                                  <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', color: pct === 100 ? '#10b981' : c.text }}>{pct}%</span>
                                </div>
                                <span style={{ fontSize: 10, color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentStepLabel}</span>
                              </div>
                            </td>
                            <td style={row}><span style={{ fontSize: 12 }}>{j.due_date ? format(new Date(j.due_date), 'MMM dd, yyyy') : '—'}</span></td>
                            <td style={row}><StatusBadge status={j.status} /></td>
                            <td style={{ ...row, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                                <select 
                                  value={j.status} 
                                  onChange={(e) => handleQuickJobStatus(j, e.target.value)} 
                                  style={{ padding: '3px 6px', fontSize: 11, borderRadius: 6, border: `1px solid ${c.border}`, background: isDark ? '#1a1d24' : '#fff', color: c.text }}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Waiting Customer">Waiting</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                                <button onClick={() => setEditingJob(j)} style={{ background: 'none', border: 'none', color: c.brand, cursor: 'pointer', padding: 4 }} title="Quick Edit"><Edit size={14} /></button>
                                <button onClick={() => handleQuickJobProgress(j)} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 4 }} title="Progress"><SlidersIcon size={14} /></button>
                                <button onClick={async () => {
                                  if (!confirm('Delete this job?')) return;
                                  await deleteJob(j.id);
                                  toast({ title: 'Job deleted' });
                                  loadAll();
                                }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }} title="Delete"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredJobs.length === 0 && <tr><td colSpan={8} style={emptyS}>No jobs found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text" placeholder="Search tickets..." value={ticketSearch} onChange={(e) => setTicketSearch(e.target.value)}
                    style={{ padding: '7px 12px', fontSize: 13, border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, width: 260 }}
                  />
                  <select value={ticketStatusFilter} onChange={(e) => setTicketStatusFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: `1.5px solid ${c.border}`, background: isDark ? '#22252C' : '#fff', color: c.text }}>
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="awaiting customer">Awaiting Customer</option>
                    <option value="replied">Replied</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thS}>Ticket ID</th>
                        <th style={thS}>Subject</th>
                        <th style={thS}>Priority</th>
                        <th style={thS}>Department</th>
                        <th style={thS}>Assigned Staff</th>
                        <th style={thS}>Last Reply</th>
                        <th style={thS}>SLA</th>
                        <th style={thS}>Status</th>
                        <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((t, i) => {
                        const row = i % 2 === 0 ? tdS : tdAlt;
                        // Highlight overdue tickets in red (Critical or open > 24h)
                        const isOverdue = ['open', 'awaiting customer'].includes(String(t.status).toLowerCase()) && 
                          (String(t.priority).toLowerCase() === 'critical' || 
                           (t.created_at && (Date.now() - new Date(t.created_at).getTime() > 24 * 3600000)));

                        const rowColor = isOverdue ? { color: '#f87171', fontWeight: 600 } : {};

                        return (
                          <tr key={t.id} style={isOverdue ? { background: isDark ? 'rgba(239, 68, 68, 0.05)' : '#fee2e2' } : {}}>
                            <td style={{ ...row, ...rowColor }}><span style={{ fontFamily: 'monospace' }}>TKT-{t.id.slice(0, 4).toUpperCase()}</span></td>
                            <td style={{ ...row, ...rowColor, whiteSpace: 'normal', minWidth: 200 }}>{t.subject}</td>
                            <td style={{ ...row, ...rowColor }}>
                              <span style={{ color: ['critical', 'high'].includes(String(t.priority).toLowerCase()) ? '#ef4444' : c.text, fontWeight: 700 }}>
                                {t.priority}
                              </span>
                            </td>
                            <td style={row}>{t.department || 'Technical Support'}</td>
                            <td style={row}>{t.assigned_staff || 'Unassigned'}</td>
                            <td style={row}>
                              <span style={{ fontSize: 12, color: c.subText }}>
                                {t.last_reply_time ? format(new Date(t.last_reply_time), 'MMM dd, hh:mm a') : format(new Date(t.updated_at || t.created_at), 'MMM dd, hh:mm a')}
                              </span>
                            </td>
                            <td style={row}><span style={{ fontSize: 12, fontWeight: 600 }}>{t.response_sla || '24 Hours'}</span></td>
                            <td style={row}><StatusBadge status={t.status} /></td>
                            <td style={{ ...row, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                                {t.status !== 'closed' ? (
                                  <button onClick={async () => {
                                    await closeTicket(t.id);
                                    toast({ title: 'Ticket Closed' });
                                    loadAll();
                                  }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }} title="Close Ticket"><Lock size={14} /></button>
                                ) : (
                                  <button onClick={async () => {
                                    await reopenTicket(t.id);
                                    toast({ title: 'Ticket Reopened' });
                                    loadAll();
                                  }} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 4 }} title="Reopen Ticket"><RefreshCw size={14} /></button>
                                )}
                                <button onClick={() => setEditingTicket(t)} style={{ background: 'none', border: 'none', color: c.brand, cursor: 'pointer', padding: 4 }} title="Quick Edit"><Edit size={14} /></button>
                                <button onClick={async () => {
                                  if (!confirm('Delete this ticket thread?')) return;
                                  await deleteTicket(t.id);
                                  toast({ title: 'Ticket deleted' });
                                  loadAll();
                                }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }} title="Delete"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTickets.length === 0 && <tr><td colSpan={9} style={emptyS}>No tickets found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Internal Staff Notes</span>
                  <button onClick={() => setIsAddNoteOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: c.brand, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={14} /> Add Internal Note
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {internalNotes.map(note => {
                    const tagCol = note.note_type === 'Private' ? '#ef4444' : note.note_type === 'Sales' ? '#3b82f6' : note.note_type === 'Billing' ? '#22c55e' : '#a855f7';
                    return (
                      <div key={note.id} style={{ border: `1px solid ${c.border}`, borderRadius: 10, padding: 16, background: isDark ? '#22252C' : '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ background: `${tagCol}20`, color: tagCol, border: `1px solid ${tagCol}40`, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                              {note.note_type}
                            </span>
                            <span style={{ fontSize: 12, color: c.subText }}>By <strong>{note.created_by}</strong> on {format(new Date(note.created_at), 'MMM dd, yyyy • hh:mm a')}</span>
                          </div>
                          <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p style={{ fontSize: 13.5, color: c.text, whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0 }}>
                          {note.note_content}
                        </p>
                      </div>
                    );
                  })}
                  {internalNotes.length === 0 && <div style={emptyS}>No internal notes. Only visible to staff.</div>}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Row: Dynamic Overview Cards (Always Visible) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {/* Hosting Packages Card */}
            <div style={{ ...cardS, marginBottom: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>Active Hosting Packages</span>
                <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                  {hostingRequests.filter(h => ['approved', 'completed', 'active'].includes(String(h.status).toLowerCase())).length} Active
                </span>
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {hostingRequests.filter(h => ['approved', 'completed', 'active'].includes(String(h.status).toLowerCase())).slice(0, 3).map(h => {
                  const packageLabel = parsePackageSummary(h.package_type).name;
                  return (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa', borderRadius: 8, border: `1px solid ${c.border}` }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: c.text }}>{h.domain}</div>
                        <div style={{ fontSize: 11, color: c.subText, marginTop: 2 }}>{h.plan_name || packageLabel}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>Active</span>
                    </div>
                  );
                })}
                {hostingRequests.filter(h => ['approved', 'completed', 'active'].includes(String(h.status).toLowerCase())).length === 0 && (
                  <div style={{ fontSize: 12, color: c.subText, textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>No active hosting packages</div>
                )}
              </div>
            </div>

            {/* Jobs Overview Card */}
            <div style={{ ...cardS, marginBottom: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>Jobs Overview</span>
                <span style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                  {jobs.filter(j => j.status !== 'Completed' && j.status !== 'Cancelled').length} In Progress
                </span>
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {jobs.slice(0, 3).map(j => (
                  <div key={j.id} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa', borderRadius: 8, border: `1px solid ${c.border}` }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                      <div style={{ fontSize: 10.5, color: c.subText, marginTop: 2 }}>
                        Due: {j.due_date ? format(new Date(j.due_date), 'MMM dd, yyyy') : '—'}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: j.status === 'Completed' ? '#22c55e' : '#fb923c', marginLeft: 8 }}>
                      {j.status}
                    </span>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div style={{ fontSize: 12, color: c.subText, textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>No active jobs assigned</div>
                )}
              </div>
            </div>

            {/* Recent Tickets Card */}
            <div style={{ ...cardS, marginBottom: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>Recent Tickets</span>
                <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                  {tickets.filter(t => t.status !== 'closed').length} Open
                </span>
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tickets.slice(0, 3).map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa', borderRadius: 8, border: `1px solid ${c.border}` }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                      <div style={{ fontSize: 10.5, color: c.subText, marginTop: 2 }}>ID: TKT-{t.id.slice(0, 4).toUpperCase()}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.status === 'closed' ? c.subText : '#ef4444', marginLeft: 8 }}>
                      {t.status}
                    </span>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div style={{ fontSize: 12, color: c.subText, textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>No support tickets</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div style={{ gridArea: 'sidebar', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Quick Actions Panel */}
          <div style={{ ...cardS, marginBottom: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <SlidersIcon size={14} /> Quick Actions
              </span>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                onClick={() => setIsAssignProductOpen(true)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, color: c.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb'}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? '#22252C' : '#f5f5f5'}
              >
                <Plus size={14} style={{ color: '#a78bfa' }} /> Assign Product
              </button>
              <button 
                onClick={() => setIsAssignHostingOpen(true)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, color: c.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb'}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? '#22252C' : '#f5f5f5'}
              >
                <Plus size={14} style={{ color: '#22c55e' }} /> Add Hosting
              </button>
              <button 
                onClick={() => setIsAssignDomainOpen(true)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, color: c.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb'}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? '#22252C' : '#f5f5f5'}
              >
                <Plus size={14} style={{ color: '#3b82f6' }} /> Add Domain
              </button>
              <button 
                onClick={() => setIsAssignEmailOpen(true)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, color: c.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb'}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? '#22252C' : '#f5f5f5'}
              >
                <Plus size={14} style={{ color: '#eab308' }} /> Add Email
              </button>
              <button 
                onClick={() => onNavigate ? onNavigate('jobs') : setIsCreateJobOpen(true)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, color: c.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb'}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? '#22252C' : '#f5f5f5'}
              >
                <Plus size={14} style={{ color: '#ec4899' }} /> Create Job
              </button>

              <button 
                onClick={handleSendPasswordReset}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, color: c.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb'}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? '#22252C' : '#f5f5f5'}
              >
                <KeyRound size={14} style={{ color: c.subText }} /> Send Password Reset
              </button>
              <button 
                onClick={() => setIsAddNoteOpen(true)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, color: c.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb'}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? '#22252C' : '#f5f5f5'}
              >
                <FileText size={14} style={{ color: c.brand }} /> Add Internal Note
              </button>
              <button 
                onClick={() => onNavigate ? onNavigate('invoices') : setIsGenerateInvoiceOpen(true)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: isDark ? '#22252C' : '#f5f5f5', border: `1px solid ${c.border}`, color: c.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb'}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? '#22252C' : '#f5f5f5'}
              >
                <TrendingUp size={14} style={{ color: '#22c55e' }} /> Generate Invoice
              </button>
            </div>
          </div>

          {/* Customer Financial Summary Card */}
          <div style={{ ...cardS, marginBottom: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={14} /> Financial Summary
              </span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lifetime Value (LTV)</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', marginTop: 4 }}>Rs. {finances.ltv.toLocaleString()}</div>
              </div>
              <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Services Cost</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: c.text, marginTop: 4 }}>Rs. {finances.activeCostYear.toLocaleString()} / Year</div>
              </div>
              <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pending Payments</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>Rs. {finances.pendingPayments.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline Panel */}
          <div style={{ ...cardS, marginBottom: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Recent Activity
              </span>
              {activities.length > 5 && (
                <button onClick={() => setViewAllActivities(true)} style={{ background: 'none', border: 'none', color: c.brand, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  View All
                </button>
              )}
            </div>
            <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Timeline vertical bar */}
                {activities.length > 0 && (
                  <div style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: c.border }} />
                )}
                {activities.slice(0, 5).map(act => (
                  <div key={act.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: act.color, border: `3px solid ${c.card}`, zIndex: 2, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: c.text, lineHeight: 1.2 }}>{act.title}</div>
                      {act.message && <div style={{ fontSize: 11.5, color: c.subText, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.message}</div>}
                      <div style={{ fontSize: 10, color: c.subText, marginTop: 2 }}>{format(act.date, 'MMM dd, yyyy • hh:mm a')}</div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div style={{ fontSize: 12, color: c.subText, textAlign: 'center', fontStyle: 'italic' }}>No activity logged.</div>
                )}
              </div>
            </div>
          </div>

          {/* Internal Notes Panel */}
          <div style={{ ...cardS, marginBottom: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} /> Internal Notes
              </span>
              <button onClick={() => setIsAddNoteOpen(true)} style={{ background: 'none', border: 'none', color: c.brand, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Plus size={11} /> Add Note
              </button>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {internalNotes.slice(0, 3).map(note => (
                <div key={note.id} style={{ borderLeft: `3px solid ${note.note_type === 'Private' ? '#ef4444' : note.note_type === 'Sales' ? '#3b82f6' : note.note_type === 'Billing' ? '#22c55e' : '#a855f7'}`, paddingLeft: 8 }}>
                  <div style={{ fontSize: 11, color: c.subText, fontWeight: 700 }}>{note.note_type} Note</div>
                  <p style={{ fontSize: 12, color: c.text, margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                    {note.note_content}
                  </p>
                </div>
              ))}
              {internalNotes.length > 0 && (
                <div style={{ fontSize: 10, color: c.subText, borderTop: `1px solid ${c.border}`, paddingTop: 8, marginTop: 4 }}>
                  Updated: {format(new Date(internalNotes[0].created_at), 'MMM dd, yyyy')} by {internalNotes[0].created_by}
                </div>
              )}
              {internalNotes.length === 0 && (
                <div style={{ fontSize: 12, color: c.subText, textAlign: 'center', fontStyle: 'italic' }}>No internal notes saved.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- ALL MODALS & DIALOGS AT THE BOTTOM --- */}

      {/* Email Credentials Modal */}
      {showEmailCreds && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowEmailCreds(null)}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 420, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={16} color="#ca8a04" />
                <span style={{ fontWeight: 700, fontSize: 15, color: c.text }}>Email Credentials</span>
              </div>
              <button onClick={() => setShowEmailCreds(null)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Email Account</div>
                <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 12px', color: c.text, fontSize: 13 }}>{showEmailCreds.email}</div>
              </div>
              {showEmailCreds.url && (
                <div>
                  <div style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Login URL</div>
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, wordBreak: 'break-all' }}>
                    <a href={showEmailCreds.url} target="_blank" rel="noopener noreferrer" style={{ color: c.brand, textDecoration: 'underline' }}>{showEmailCreds.url}</a>
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Key size={12} /> Username
                </div>
                <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 12px', color: c.text, fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{showEmailCreds.email_username || <span style={{ color: c.subText, fontStyle: 'italic' }}>Not set</span>}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Key size={12} /> Password
                </div>
                <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 12px', color: c.text, fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{showEmailCreds.email_password || <span style={{ color: c.subText, fontStyle: 'italic' }}>Not set</span>}</div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}` }}>
              <button onClick={() => setShowEmailCreds(null)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {isCreateJobOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Create New Job</span>
              <button onClick={() => setIsCreateJobOpen(false)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateJob} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Job Title</label>
                <input required value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Website Development" style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Category</label>
                  <select value={jobCategory} onChange={e => setJobCategory(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="Web Design">Web Design</option>
                    <option value="Web Development">Web Development</option>
                    <option value="SEO Optimization">SEO Optimization</option>
                    <option value="Hosting Setup">Hosting Setup</option>
                    <option value="Domain Transfer">Domain Transfer</option>
                    <option value="Custom Email">Custom Email</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Priority</label>
                  <select value={jobPriority} onChange={e => setJobPriority(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Due Date</label>
                  <input type="date" value={jobDueDate} onChange={e => setJobDueDate(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Estimated Completion</label>
                  <input type="date" value={jobEstCompletion} onChange={e => setJobEstCompletion(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Assigned Staff</label>
                <input value={jobAssignedTo} onChange={e => setJobAssignedTo(e.target.value)} placeholder="e.g. John Doe" style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Job Description</label>
                <textarea rows={3} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Enter details for the team..." style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsCreateJobOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Ticket Modal */}
      {isOpenTicketOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Open Support Ticket</span>
              <button onClick={() => setIsOpenTicketOpen(false)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleOpenTicket} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Subject / Issue</label>
                <input required value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="e.g. Email server not sending outgoing mails" style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Department</label>
                  <select value={ticketDepartment} onChange={e => setTicketDepartment(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing & Invoices">Billing & Invoices</option>
                    <option value="Sales & Quotations">Sales & Quotations</option>
                    <option value="General Queries">General Queries</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Priority</label>
                  <select value={ticketPriority} onChange={e => setTicketPriority(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Assigned Staff</label>
                  <input value={ticketAssignedStaff} onChange={e => setTicketAssignedStaff(e.target.value)} placeholder="e.g. support_manager" style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Response SLA</label>
                  <select value={ticketSla} onChange={e => setTicketSla(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="2 Hours">2 Hours (Urgent)</option>
                    <option value="4 Hours">4 Hours</option>
                    <option value="12 Hours">12 Hours</option>
                    <option value="24 Hours">24 Hours (Standard)</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Initial Ticket message (Visible to Customer)</label>
                <textarea required rows={4} value={ticketMessage} onChange={e => setTicketMessageText(e.target.value)} placeholder="Describe the issue or initial message..." style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsOpenTicketOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {isGenerateInvoiceOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 500, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Generate Invoice</span>
              <button onClick={() => setIsGenerateInvoiceOpen(false)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerateInvoice} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Due Date</label>
                  <input type="date" required value={invDueDate} onChange={e => setInvDueDate(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Initial Status</label>
                  <select value={invStatus} onChange={e => setInvStatus(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Currency</label>
                  <select value={invCurrency} onChange={e => setInvCurrency(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="LKR">LKR (Rs.)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>Line Item Details</span>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 10.5, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Description</label>
                  <input required value={invItemDesc} onChange={e => setInvItemDesc(e.target.value)} placeholder="e.g. Hosting Renewal - 1 Year" style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginTop: 10 }}>
                  <div>
                    <label style={{ fontSize: 10.5, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Price per Unit</label>
                    <input type="number" required value={invItemPrice} onChange={e => setInvItemPrice(e.target.value)} placeholder="e.g. 15000" style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10.5, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Qty</label>
                    <input type="number" min="1" required value={invItemQty} onChange={e => setInvItemQty(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setIsGenerateInvoiceOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {isAddNoteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 460, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Add Internal Note</span>
              <button onClick={() => setIsAddNoteOpen(false)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddNoteSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Note Category</label>
                <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                  <option value="Private">Private Note</option>
                  <option value="Sales">Sales Note</option>
                  <option value="Billing">Billing Note</option>
                  <option value="Technical">Technical Note</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Content</label>
                <textarea required rows={5} value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Type private staff instructions, billing requests, or client preference notes here..." style={{ width: '100%', padding: '9px 13px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsAddNoteOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View All Activities Modal */}
      {viewAllActivities && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setViewAllActivities(false)}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>All Customer Activities</span>
              <button onClick={() => setViewAllActivities(false)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
              {activities.map((act, index) => (
                <div key={act.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: act.color, border: `3px solid ${c.card}`, zIndex: 2, flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{act.title}</div>
                    {act.message && <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>{act.message}</div>}
                    <div style={{ fontSize: 10.5, color: c.subText, marginTop: 4 }}>{format(act.date, 'MMM dd, yyyy • hh:mm a')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODALS FOR ITEMS --- */}

      {/* View Hosting Details Modal */}
      {viewingHosting && (() => {
        const cpanelInfo = parseJson(viewingHosting.cpanel);
        const ftpInfo = parseJson(viewingHosting.ftp);
        const creds = parseJson(viewingHosting.additional_credentials) || [];

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Hosting Package Details</span>
                <button onClick={() => setViewingHosting(null)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Domain</span>
                    <span style={{ fontSize: 14, color: c.text, fontWeight: 500, fontFamily: 'monospace' }}>{viewingHosting.domain || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Package / Plan</span>
                    <span style={{ fontSize: 14, color: c.text, fontWeight: 500 }}>{viewingHosting.plan_name || parsePackageSummary(viewingHosting.package_type).name}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Server Name</span>
                    <span style={{ fontSize: 14, color: c.text }}>{viewingHosting.server_name || 'Not Set'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Hosting Provider</span>
                    <span style={{ fontSize: 14, color: c.text }}>{viewingHosting.hosting_provider || 'Not Set'}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Disk Usage</span>
                    <span style={{ fontSize: 14, color: c.text }}>{viewingHosting.disk_usage || '—'} / {viewingHosting.disk_usage_limit || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Bandwidth</span>
                    <span style={{ fontSize: 14, color: c.text }}>{viewingHosting.bandwidth_usage || '—'} / {viewingHosting.bandwidth_limit || '—'}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Start Date</span>
                    <span style={{ fontSize: 14, color: c.text }}>{safeFormatDate(viewingHosting.start_date)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Expiry / End Date</span>
                    <span style={{ fontSize: 14, color: c.text }}>{safeFormatDate(viewingHosting.expiry_date)}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Price</span>
                    <span style={{ fontSize: 14, color: c.text }}>{formatPrice(viewingHosting.price)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Renewal Cost</span>
                    <span style={{ fontSize: 14, color: c.text }}>{formatPrice(viewingHosting.renewal_cost || viewingHosting.next_renewal_price)}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Billing Period</span>
                    <span style={{ fontSize: 14, color: c.text, textTransform: 'capitalize' }}>{viewingHosting.billing_period || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Status</span>
                    <div style={{ marginTop: 4 }}><StatusBadge status={viewingHosting.status} /></div>
                  </div>
                </div>

                {viewingHosting.cpanel && (() => {
                  const info = cpanelInfo;
                  if (info && typeof info === 'object') {
                    const hasData = info.url || info.username || info.password || info.notes;
                    if (!hasData) return null;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>cPanel Credentials</span>
                        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {info.url && (
                            <div>
                              <span style={{ fontSize: 11, color: c.subText }}>URL: </span>
                              <a href={info.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: c.brand, textDecoration: 'none', wordBreak: 'break-all' }}>
                                {info.url} <ExternalLink size={10} style={{ display: 'inline', marginLeft: 4 }} />
                              </a>
                            </div>
                          )}
                          {info.username && (
                            <div style={{ fontSize: 12, color: c.text }}>
                              <span style={{ color: c.subText }}>Username: </span>
                              <strong>{info.username}</strong>
                            </div>
                          )}
                          {info.password && (
                            <div style={{ fontSize: 12, color: c.text }}>
                              <span style={{ color: c.subText }}>Password: </span>
                              <strong>{info.password}</strong>
                            </div>
                          )}
                          {info.notes && (
                            <div style={{ fontSize: 12, color: c.text, borderTop: `1px solid ${c.border}`, paddingTop: 6, marginTop: 4 }}>
                              <span style={{ color: c.subText, display: 'block', fontSize: 11 }}>Notes:</span>
                              <span style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{info.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else if (typeof viewingHosting.cpanel === 'string') {
                    return (
                      <div>
                        <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>cPanel URL</span>
                        <a href={viewingHosting.cpanel} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: c.brand, textDecoration: 'none', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <ExternalLink size={12} /> {viewingHosting.cpanel}
                        </a>
                      </div>
                    );
                  }
                  return null;
                })()}

                {viewingHosting.ftp && (() => {
                  const info = ftpInfo;
                  if (info && typeof info === 'object') {
                    const hasData = info.host || info.username || info.password || info.port;
                    if (!hasData) return null;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>FTP Credentials</span>
                        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {info.host && (
                            <div style={{ fontSize: 12, color: c.text }}>
                              <span style={{ color: c.subText }}>Host: </span>
                              <strong>{info.host}</strong>
                            </div>
                          )}
                          {info.username && (
                            <div style={{ fontSize: 12, color: c.text }}>
                              <span style={{ color: c.subText }}>Username: </span>
                              <strong>{info.username}</strong>
                            </div>
                          )}
                          {info.password && (
                            <div style={{ fontSize: 12, color: c.text }}>
                              <span style={{ color: c.subText }}>Password: </span>
                              <strong>{info.password}</strong>
                            </div>
                          )}
                          {info.port && (
                            <div style={{ fontSize: 12, color: c.text }}>
                              <span style={{ color: c.subText }}>Port: </span>
                              <strong>{info.port}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else if (typeof viewingHosting.ftp === 'string') {
                    return (
                      <div>
                        <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>FTP Details</span>
                        <pre style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: 12, margin: '4px 0 0 0', fontSize: 12, color: c.text, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                          {viewingHosting.ftp}
                        </pre>
                      </div>
                    );
                  }
                  return null;
                })()}

                {creds.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Additional Credentials</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {creds.map((cred, idx) => (
                        <div key={idx} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {cred.label && <strong style={{ fontSize: 12, color: c.brand }}>{cred.label}</strong>}
                          {cred.username && (
                            <div style={{ fontSize: 11, color: c.text }}>
                              <span style={{ color: c.subText }}>Username: </span>
                              {cred.username}
                            </div>
                          )}
                          {cred.password && (
                            <div style={{ fontSize: 11, color: c.text }}>
                              <span style={{ color: c.subText }}>Password: </span>
                              {cred.password}
                            </div>
                          )}
                          {cred.notes && (
                            <div style={{ fontSize: 11, color: c.subText, borderTop: `1px solid ${c.border}`, paddingTop: 4, marginTop: 2 }}>
                              {cred.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', marginTop: 8 }}>
                  <button type="button" onClick={() => setViewingHosting(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* View Domain Details Modal */}
      {viewingDomain && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Domain Details</span>
              <button onClick={() => setViewingDomain(null)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Domain Name</span>
                  <span style={{ fontSize: 14, color: c.text, fontWeight: 500, fontFamily: 'monospace' }}>{viewingDomain.domain_name || '—'}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Registrar</span>
                  <span style={{ fontSize: 14, color: c.text, fontWeight: 500 }}>{viewingDomain.registrar || 'Not Assigned'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Start Date</span>
                  <span style={{ fontSize: 14, color: c.text }}>{safeFormatDate(viewingDomain.start_date)}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Expiry / End Date</span>
                  <span style={{ fontSize: 14, color: c.text }}>{safeFormatDate(viewingDomain.expiry_date)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Price</span>
                  <span style={{ fontSize: 14, color: c.text }}>{formatPrice(viewingDomain.price)}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Registration Period</span>
                  <span style={{ fontSize: 14, color: c.text }}>{viewingDomain.registration_period ? `${viewingDomain.registration_period} Year${viewingDomain.registration_period !== 1 ? 's' : ''}` : '—'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Auto Renewal</span>
                  <span style={{ fontSize: 14, color: c.text }}>{viewingDomain.auto_renew ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>WHOIS Privacy</span>
                  <span style={{ fontSize: 14, color: c.text }}>{viewingDomain.whois_privacy || 'Disabled'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Status</span>
                  <div style={{ marginTop: 4 }}><StatusBadge status={viewingDomain.status} /></div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Name Servers</span>
                  <span style={{ fontSize: 12, color: c.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>{viewingDomain.nameservers || 'ns1.nextiom.com, ns2.nextiom.com'}</span>
                </div>
              </div>

              {viewingDomain.notes && (
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Customer Notes</span>
                  <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: 12, fontSize: 12, color: c.text, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                    {viewingDomain.notes}
                  </div>
                </div>
              )}

              {viewingDomain.admin_reply && (
                <div>
                  <span style={{ fontSize: 10, color: c.subText, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Admin Reply</span>
                  <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: 12, fontSize: 12, color: c.text, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                    {viewingDomain.admin_reply}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', marginTop: 8 }}>
                <button type="button" onClick={() => setViewingDomain(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Hosting Modal */}
      {editingHosting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Edit Hosting Package</span>
              <button onClick={() => setEditingHosting(null)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateHostingSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Server Name</label>
                  <input value={editingHosting.server_name || ''} onChange={e => setEditingHosting({ ...editingHosting, server_name: e.target.value })} placeholder="e.g. srv-web01.nextiom.com" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Hosting Provider</label>
                  <input value={editingHosting.hosting_provider || ''} onChange={e => setEditingHosting({ ...editingHosting, hosting_provider: e.target.value })} placeholder="e.g. DigitalOcean" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Disk Usage (Current)</label>
                  <input value={editingHosting.disk_usage || ''} onChange={e => setEditingHosting({ ...editingHosting, disk_usage: e.target.value })} placeholder="e.g. 1.2 GB" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Disk Limit</label>
                  <input value={editingHosting.disk_usage_limit || ''} onChange={e => setEditingHosting({ ...editingHosting, disk_usage_limit: e.target.value })} placeholder="e.g. 10 GB" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Bandwidth Usage (Current)</label>
                  <input value={editingHosting.bandwidth_usage || ''} onChange={e => setEditingHosting({ ...editingHosting, bandwidth_usage: e.target.value })} placeholder="e.g. 45 GB" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Bandwidth Limit</label>
                  <input value={editingHosting.bandwidth_limit || ''} onChange={e => setEditingHosting({ ...editingHosting, bandwidth_limit: e.target.value })} placeholder="e.g. 100 GB" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Renewal Cost</label>
                  <input type="number" step="0.01" value={editingHosting.renewal_cost || ''} onChange={e => setEditingHosting({ ...editingHosting, renewal_cost: e.target.value })} placeholder="e.g. 24000" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Status</label>
                  <select value={editingHosting.status} onChange={e => setEditingHosting({ ...editingHosting, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="approved">Approved / Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Start Date</label>
                  <input type="date" value={editingHosting.start_date ? editingHosting.start_date.split('T')[0] : ''} onChange={e => setEditingHosting({ ...editingHosting, start_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Expiry Date</label>
                  <input type="date" value={editingHosting.expiry_date ? editingHosting.expiry_date.split('T')[0] : ''} onChange={e => setEditingHosting({ ...editingHosting, expiry_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>cPanel URL</label>
                <input value={editingHosting.cpanel || ''} onChange={e => setEditingHosting({ ...editingHosting, cpanel: e.target.value })} placeholder="https://cpanel.example.com" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setEditingHosting(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Domain Modal */}
      {editingDomain && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 500, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Edit Domain Details</span>
              <button onClick={() => setEditingDomain(null)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateDomainSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Registrar</label>
                <input value={editingDomain.registrar || ''} onChange={e => setEditingDomain({ ...editingDomain, registrar: e.target.value })} placeholder="e.g. GoDaddy" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Name Servers (Comma separated)</label>
                <input value={editingDomain.nameservers || ''} onChange={e => setEditingDomain({ ...editingDomain, nameservers: e.target.value })} placeholder="ns1.nextiom.com, ns2.nextiom.com" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>WHOIS Privacy</label>
                  <select value={editingDomain.whois_privacy || 'Disabled'} onChange={e => setEditingDomain({ ...editingDomain, whois_privacy: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Status</label>
                  <select value={editingDomain.status} onChange={e => setEditingDomain({ ...editingDomain, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="approved">Approved / Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Start Date</label>
                  <input type="date" value={editingDomain.start_date ? editingDomain.start_date.split('T')[0] : ''} onChange={e => setEditingDomain({ ...editingDomain, start_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Expiry Date</label>
                  <input type="date" value={editingDomain.expiry_date ? editingDomain.expiry_date.split('T')[0] : ''} onChange={e => setEditingDomain({ ...editingDomain, expiry_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input type="checkbox" checked={editingDomain.auto_renew || false} onChange={e => setEditingDomain({ ...editingDomain, auto_renew: e.target.checked })} style={{ accentColor: c.brand }} />
                <span style={{ fontSize: 13, color: c.text }}>Auto Renewal Enabled</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setEditingDomain(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 500, width: '100%', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Edit Job Details</span>
              <button onClick={() => setEditingJob(null)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateJobSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Job Title</label>
                <input required value={editingJob.title || ''} onChange={e => setEditingJob({ ...editingJob, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Category</label>
                  <input value={editingJob.category || ''} onChange={e => setEditingJob({ ...editingJob, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Priority</label>
                  <select value={editingJob.priority || 'Medium'} onChange={e => setEditingJob({ ...editingJob, priority: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Progress %</label>
                  <input type="number" min="0" max="100" value={editingJob.progress_percent || 0} onChange={e => setEditingJob({ ...editingJob, progress_percent: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Status</label>
                  <select value={editingJob.status} onChange={e => setEditingJob({ ...editingJob, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting Customer">Waiting Customer</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Due Date</label>
                  <input type="date" value={editingJob.due_date ? editingJob.due_date.split('T')[0] : ''} onChange={e => setEditingJob({ ...editingJob, due_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Est. Completion</label>
                  <input type="date" value={editingJob.estimated_completion_date ? editingJob.estimated_completion_date.split('T')[0] : ''} onChange={e => setEditingJob({ ...editingJob, estimated_completion_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Assigned Staff</label>
                <input value={editingJob.assign_to || ''} onChange={e => setEditingJob({ ...editingJob, assign_to: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Description</label>
                <textarea rows={3} value={editingJob.description || ''} onChange={e => setEditingJob({ ...editingJob, description: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setEditingJob(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 500, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>Edit Ticket Details</span>
              <button onClick={() => setEditingTicket(null)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateTicketSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Subject</label>
                <input required value={editingTicket.subject || ''} onChange={e => setEditingTicket({ ...editingTicket, subject: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Department</label>
                  <input value={editingTicket.department || ''} onChange={e => setEditingTicket({ ...editingTicket, department: e.target.value })} placeholder="e.g. Technical Support" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Priority</label>
                  <select value={editingTicket.priority || 'Normal'} onChange={e => setEditingTicket({ ...editingTicket, priority: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Assigned Staff</label>
                  <input value={editingTicket.assigned_staff || ''} onChange={e => setEditingTicket({ ...editingTicket, assigned_staff: e.target.value })} placeholder="e.g. support_staff" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Response SLA</label>
                  <input value={editingTicket.response_sla || ''} onChange={e => setEditingTicket({ ...editingTicket, response_sla: e.target.value })} placeholder="e.g. 24 Hours" style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase' }}>Status</label>
                <select value={editingTicket.status} onChange={e => setEditingTicket({ ...editingTicket, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.text, fontSize: 13, outline: 'none', marginTop: 4 }}>
                  <option value="open">Open</option>
                  <option value="awaiting customer">Awaiting Customer</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setEditingTicket(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EXTERNAL SHARED DIALOGS --- */}

      <AssignProductDialog
        open={isAssignProductOpen}
        onOpenChange={setIsAssignProductOpen}
        customers={[customerData]}
        products={allProducts}
        onSuccess={() => {
          setIsAssignProductOpen(false);
          loadAll();
        }}
        c={c}
      />

      <AssignHostingDialog
        open={isAssignHostingOpen}
        onClose={() => setIsAssignHostingOpen(false)}
        customer={{ id: customerData.id, name: customerData.name || 'Customer', email: customerData.email || '' }}
        c={c}
        isEditMode={false}
        onSuccess={() => {
          setIsAssignHostingOpen(false);
          loadAll();
        }}
      />

      <AssignDomainDialog
        open={isAssignDomainOpen}
        onClose={() => setIsAssignDomainOpen(false)}
        customer={{ id: customerData.id, name: customerData.name || 'Customer', email: customerData.email || '' }}
        c={c}
        isEditMode={false}
        onSuccess={() => {
          setIsAssignDomainOpen(false);
          loadAll();
        }}
      />

      <AssignEmailDialog
        open={isAssignEmailOpen}
        onClose={() => setIsAssignEmailOpen(false)}
        customer={{ id: customerData.id, name: customerData.name || 'Customer', email: customerData.email || '' }}
        c={c}
        isEditMode={false}
        onSuccess={() => {
          setIsAssignEmailOpen(false);
          loadAll();
        }}
      />

      <AssignHostingDialog
        open={!!editingHosting}
        onClose={() => setEditingHosting(null)}
        customer={{ id: customerData.id, name: customerData.name || 'Customer', email: customerData.email || '' }}
        request={editingHosting}
        c={c}
        isEditMode={true}
        onSuccess={() => {
          setEditingHosting(null);
          loadAll();
        }}
      />

      <AssignDomainDialog
        open={!!editingDomain}
        onClose={() => setEditingDomain(null)}
        customer={{ id: customerData.id, name: customerData.name || 'Customer', email: customerData.email || '' }}
        request={editingDomain}
        c={c}
        isEditMode={true}
        onSuccess={() => {
          setEditingDomain(null);
          loadAll();
        }}
      />

      <AssignEmailDialog
        open={!!editingEmail}
        onClose={() => setEditingEmail(null)}
        customer={{ id: customerData.id, name: customerData.name || 'Customer', email: customerData.email || '' }}
        request={editingEmail}
        c={c}
        isEditMode={true}
        onSuccess={() => {
          setEditingEmail(null);
          loadAll();
        }}
      />

      <EditAssignedProductDialog
        open={!!editingLicense}
        onOpenChange={() => setEditingLicense(null)}
        license={editingLicense}
        product={editingLicense?.product}
        customer={customerData}
        onSuccess={() => {
          setEditingLicense(null);
          loadAll();
        }}
        c={c}
      />

      <ViewAssignedProductDialog
        open={!!viewingLicense}
        onOpenChange={() => setViewingLicense(null)}
        license={viewingLicense}
        product={viewingLicense?.product}
        customer={customerData}
        c={c}
      />

      {/* Renew Hosting Drawer side window */}
      {renewingHosting && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <div 
            onClick={() => setRenewingHosting(null)} 
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease-in-out' }} 
          />
          
          {/* Drawer container */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: 460, 
            height: '100%', 
            background: c.card, 
            borderLeft: `1px solid ${c.borderStrong}`, 
            display: 'flex', 
            flexDirection: 'column', 
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
            animation: 'slideIn 0.2s ease-out'
          }}>
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 16, color: c.text, display: 'block' }}>Renew Hosting Package</span>
                <span style={{ fontSize: 12, color: c.subText, marginTop: 2, display: 'block' }}>
                  Domain: <strong style={{ color: c.text }}>{renewingHosting.domain || '—'}</strong>
                </span>
              </div>
              <button 
                onClick={() => setRenewingHosting(null)} 
                style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body - Scrollable */}
            <div style={{ padding: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Package details card */}
              <div style={{ padding: 14, background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa', borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 12.5 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span style={{ display: 'block', color: c.subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Plan Name</span>
                    <span style={{ color: c.text, fontWeight: 600 }}>{renewingHosting.plan_name || parsePackageSummary(renewingHosting.package_type).name}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: c.subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Original Start Date</span>
                    <span style={{ color: c.text }}>{safeFormatDate(renewingHosting.start_date)}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: c.subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Current Expiry</span>
                    <span style={{ color: c.text }}>{safeFormatDate(renewingHosting.expiry_date)}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: c.subText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Billing Period</span>
                    <span style={{ color: c.text, textTransform: 'capitalize' }}>{renewingHosting.billing_period || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Renewal Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: c.subText, marginBottom: 6 }}>
                    Renew Start Date
                  </label>
                  <input 
                    type="date" 
                    value={renewStartDate} 
                    onChange={(e) => setRenewStartDate(e.target.value)} 
                    style={{ 
                      width: '100%', 
                      padding: '9px 12px', 
                      borderRadius: 8, 
                      border: `1.5px solid ${c.border}`, 
                      background: isDark ? '#22252C' : '#fff', 
                      color: c.text, 
                      fontSize: 13, 
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: c.subText, marginBottom: 6 }}>
                    Renewal Period
                  </label>
                  <select 
                    value={renewalPeriod} 
                    onChange={(e) => setRenewalPeriod(e.target.value)} 
                    style={{ 
                      width: '100%', 
                      padding: '9px 12px', 
                      borderRadius: 8, 
                      border: `1.5px solid ${c.border}`, 
                      background: isDark ? '#22252C' : '#fff', 
                      color: c.text, 
                      fontSize: 13, 
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="monthly">Monthly (1 Month)</option>
                    <option value="quarterly">Quarterly (3 Months)</option>
                    <option value="semi-annually">Semi-Annually (6 Months)</option>
                    <option value="yearly">Yearly (1 Year)</option>
                    <option value="2years">2 Years</option>
                    <option value="3years">3 Years</option>
                    <option value="5years">5 Years</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: c.subText, marginBottom: 6 }}>
                    Auto Calculated Expiry Date
                  </label>
                  <input 
                    type="date" 
                    value={calculatedExpiry} 
                    disabled 
                    style={{ 
                      width: '100%', 
                      padding: '9px 12px', 
                      borderRadius: 8, 
                      border: `1.5px solid ${c.border}`, 
                      background: isDark ? 'rgba(255,255,255,0.04)' : '#ebebeb', 
                      color: c.text, 
                      fontSize: 13, 
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              </div>

              {/* Timeline of Package */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: c.subText, marginBottom: 12 }}>
                  Package History & Timeline
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 16 }}>
                  {/* Vertical timeline line */}
                  <div style={{ 
                    position: 'absolute', 
                    top: 8, 
                    bottom: 8, 
                    left: 4, 
                    width: 2, 
                    background: isDark ? 'rgba(255,255,255,0.1)' : '#ebebeb' 
                  }} />

                  {/* Compute Timeline Items */}
                  {(() => {
                    let timelineItems = [];
                    try {
                      if (renewingHosting.renewal_history && Array.isArray(renewingHosting.renewal_history)) {
                        timelineItems = [...renewingHosting.renewal_history];
                      }
                    } catch (e) {
                      console.error(e);
                    }

                    if (timelineItems.length === 0) {
                      timelineItems.push({
                        renew_start_date: renewingHosting.start_date || renewingHosting.created_at,
                        renewal_time: renewingHosting.billing_period || 'Initial Purchase',
                        expiry_date: renewingHosting.expiry_date
                      });
                    }

                    return timelineItems.map((item, idx) => {
                      const isLatest = idx === timelineItems.length - 1;
                      return (
                        <div key={idx} style={{ position: 'relative', paddingBottom: idx === timelineItems.length - 1 ? 0 : 20 }}>
                          <div style={{ 
                            position: 'absolute', 
                            left: -16, 
                            top: 4, 
                            width: 10, 
                            height: 10, 
                            borderRadius: '50%', 
                            background: isLatest ? c.brand : (isDark ? '#4b5563' : '#9ca3af'),
                            border: `2px solid ${c.card}`,
                            boxShadow: isLatest ? `0 0 8px ${c.brand}` : 'none',
                            zIndex: 2
                          }} />

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: isLatest ? c.brand : c.text }}>
                                {idx === 0 ? 'Initial Purchase' : `Renewal #${idx}`}
                              </span>
                              <span style={{ fontSize: 11, background: isDark ? 'rgba(255,255,255,0.05)' : '#eaeaea', padding: '2px 6px', borderRadius: 4, color: c.subText, textTransform: 'capitalize' }}>
                                {item.renewal_time || 'yearly'}
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: c.subText, marginTop: 4 }}>
                              Duration: <strong>{safeFormatDate(item.renew_start_date)}</strong> to <strong>{safeFormatDate(item.expiry_date)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setRenewingHosting(null)} 
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  borderRadius: 8, 
                  border: `1.5px solid ${c.border}`, 
                  background: 'transparent', 
                  color: c.text, 
                  fontSize: 13, 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRenewal}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  borderRadius: 8, 
                  border: 'none', 
                  background: c.brand, 
                  color: '#fff', 
                  fontSize: 13, 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  opacity: !calculatedExpiry ? 0.6 : 1
                }}
                disabled={!calculatedExpiry}
              >
                Save Renewal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Helper Components/Icons for internal use
function ServerIcon({ size = 16, style = {} }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
      <line x1="6" x2="6.01" y1="6" y2="6"/>
      <line x1="6" x2="6.01" y1="18" y2="18"/>
      <line x1="10" x2="10.01" y1="6" y2="6"/>
      <line x1="10" x2="10.01" y1="18" y2="18"/>
    </svg>
  );
}

function SlidersIcon({ size = 16, style = {} }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="4" x2="4" y1="21" y2="14"/>
      <line x1="4" x2="4" y1="10" y2="3"/>
      <line x1="12" x2="12" y1="21" y2="12"/>
      <line x1="12" x2="12" y1="8" y2="3"/>
      <line x1="20" x2="20" y1="21" y2="16"/>
      <line x1="20" x2="20" y1="12" y2="3"/>
      <line x1="2" x2="6" y1="14" y2="14"/>
      <line x1="10" x2="14" y1="8" y2="8"/>
      <line x1="18" x2="22" y1="16" y2="16"/>
    </svg>
  );
}

// Helpers
function parsePackageSummary(summary) {
  const raw = String(summary || '');
  const mainPart = raw.split('|')[0]?.trim() || '';
  const dashIndex = mainPart.indexOf(' - ');
  const name = dashIndex >= 0 ? mainPart.slice(dashIndex + 3).trim() : mainPart;
  return { name };
}

function parsePackage(packageType) {
  const parts = (packageType || '').split(' | ');
  const name = parts[0]?.trim() || '-';
  const domainPart = parts.find(p => p.startsWith('Domain:'));
  const domain = domainPart ? domainPart.replace('Domain:', '').trim() : '-';
  const billingPart = parts.find(p => p.startsWith('Billing:'));
  const billing = billingPart ? billingPart.replace('Billing:', '').trim().toLowerCase() : 'yearly';
  return { name, domain, billing };
}

const parseJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const safeFormatDate = (dateVal, formatStr = 'MMM dd, yyyy') => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return format(d, formatStr);
  } catch (e) {
    return '—';
  }
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return isNaN(num) ? '—' : `Rs. ${num.toLocaleString()}`;
};

export default CustomerProfileAdminView;
