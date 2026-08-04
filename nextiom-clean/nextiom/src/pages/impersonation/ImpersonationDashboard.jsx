import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Clock, AlertTriangle, LayoutDashboard, Globe, Server, Mail,
  ShoppingCart, MessageSquare, Package, User, Loader2, Menu, X,
  CreditCard, FileText, Info, BellOff, Briefcase, Megaphone, BookOpen,
  Calendar, Search, Sun, Moon
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { clearCustomerNotifications, getTicketsByCustomer, getLicenses } from '@/lib/storage';

import { getCustomerJobs } from '@/lib/jobs';
import { getCustomerInvoices } from '@/lib/invoices';
import { getCustomerQuotations } from '@/lib/quotations';

// Re-use real customer components
import DashboardPage from '@/components/customer/DashboardPage';
import AnnouncementsPage from '@/components/customer/AnnouncementsPage';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import NotificationBell from '@/components/notifications/NotificationBell';
import MyDomainsPage from '@/components/customer/MyDomainsPage';
import MyHostingPackagesPage from '@/components/customer/MyHostingPackagesPage';
import MyEmailsPage from '@/components/customer/MyEmailsPage';
import MyServicesPage from '@/components/customer/MyServicesPage';
import OrderHistoryPage from '@/components/customer/OrderHistoryPage';
import CustomerInvoicesPage from '@/components/customer/CustomerInvoicesPage';
import CustomerQuotationsPage from '@/components/customer/CustomerQuotationsPage';
import MyTicketsPage from '@/components/customer/MyTicketsPage';
import CreateTicketPage from '@/components/customer/CreateTicketPage';
import MyProductsPage from '@/components/customer/MyProductsPage';
import ProfilePage from '@/components/customer/ProfilePage';
import NewHostingOrderPage from '@/components/customer/NewHostingOrderPage';
import NewDomainRequestPage from '@/components/customer/NewDomainRequestPage';
import NewEmailRequestPage from '@/components/customer/NewEmailRequestPage';
import CollapsibleMenuItem from '@/components/ui/CollapsibleMenuItem';
import { CompanyInfoPage, ContactDetailsPage } from '@/components/customer/AboutPages';
import CustomerJobsPage from '@/components/customer/CustomerJobsPage';
import CustomerAgreementManagement from '@/components/customer/CustomerAgreementManagement';
import CustomerAppointmentsPage from '@/components/customer/CustomerAppointmentsPage';
import KnowledgebasePage from '@/components/customer/KnowledgebasePage';
import useDisableRightClick from '@/hooks/useDisableRightClick';

const CustomImageIcon = ({ src, alt, size, className, style, color }) => {
  const sizePx = size ? `${size}px` : undefined;
  const iconColor = color || style?.color || '';
  const colorStr = String(iconColor).toLowerCase();

  let resolvedColor = '#a0a0a0'; // Default gray
  if (colorStr.includes('e87b35') || colorStr.includes('var(--brand-color)') || colorStr.includes('brand')) {
    resolvedColor = 'var(--brand-color)';
  } else if (colorStr.includes('888')) {
    resolvedColor = '#888888';
  } else if (colorStr.includes('a0a0a0')) {
    resolvedColor = '#a0a0a0';
  } else if (colorStr.includes('fff') || colorStr.includes('rgb(255, 255, 255)')) {
    resolvedColor = '#ffffff';
  } else if (iconColor) {
    resolvedColor = iconColor;
  }

  return (
    <div
      className={className}
      style={{
        width: sizePx || '20px',
        height: sizePx || '20px',
        backgroundColor: resolvedColor,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        display: 'inline-block',
        ...style,
      }}
      aria-label={alt || "icon"}
    />
  );
};

const OnProgressIcon = (props) => <CustomImageIcon src="/on-progress.png" alt="Jobs" {...props} />;
const AgreementIcon = (props) => <CustomImageIcon src="/agreement.png" alt="Agreement" {...props} />;

const DARK = {
  bg: '#15161A', sidebar: '#1C1E24', border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0',
  card: '#1C1E24', panel2: '#22252C', hover: 'rgba(255,255,255,0.04)',
  brand: 'var(--brand-color)', brandLight: 'var(--brand-color-light)',
};
const LIGHT = {
  bg: '#f8f8f7', sidebar: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0',
  text: '#1a1a1a', subText: '#888', card: '#fff', panel2: '#f5f5f5',
  hover: '#f5f5f5', brand: 'var(--brand-color)', brandLight: 'var(--brand-color-light)',
};

function getValidity(license) {
  if (license.status === 'Disabled' || license.status === 'Suspended' || license.status === 'Expired') {
    return { valid: false, label: license.status, days: null };
  }
  const lt = license.license_type || license.product?.license_type || 'one_time';
  if (lt === 'lifetime') return { valid: true, label: 'Lifetime', days: null };
  if (lt === 'one_time') {
    return { valid: true, label: 'One Time Purchase', days: null, downloadUsed: false };
  }
  if ((lt === 'yearly' || lt === 'monthly') && license.expiry_date) {
    const days = Math.ceil((new Date(license.expiry_date) - new Date()) / 86400000);
    if (days <= 0) return { valid: false, label: 'Expired', days: 0 };
    return { valid: true, label: `${days}d remaining`, days };
  }
  return { valid: true, label: 'Active', days: null };
}

function getLicenseStatus(license) {
  if (license.status === 'Disabled' || license.status === 'Suspended') {
    return license.status;
  }
  if (license.status === 'Expired') {
    return 'Expired';
  }
  const validity = getValidity(license);
  const lt = license.license_type || license.product?.license_type || 'one_time';
  if (lt === 'lifetime') {
    return 'Active';
  }
  if (lt === 'one_time') {
    return 'Active';
  }
  if (lt === 'yearly' || lt === 'monthly') {
    if (validity.days <= 0) return 'Expired';
    if (validity.days <= 5) return 'Expiring Soon';
    return 'Active';
  }
  return 'Active';
}

const NAV_STRUCTURE = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'item' },
  {
    id: 'hosting', label: 'Hosting', icon: Server, type: 'group',
    children: [
      { id: 'hosting_my', label: 'My Hosting' },
      { id: 'hosting_new', label: 'Order Hosting' },
    ],
  },
  {
    id: 'domains', label: 'Domains', icon: Globe, type: 'group',
    children: [
      { id: 'domains_my', label: 'My Domains' },
      { id: 'domains_new', label: 'Register Domain' },
    ],
  },
  {
    id: 'emails', label: 'Emails', icon: Mail, type: 'group',
    children: [
      { id: 'emails_my', label: 'My Emails' },
      { id: 'emails_new', label: 'Email Registration' },
    ],
  },
  { id: 'products', label: 'My Products', icon: Package, type: 'item' },
  {
    id: 'orders', label: 'Orders', icon: ShoppingCart, type: 'group',
    children: [
      { id: 'services', label: 'My Subscriptions' },
      { id: 'order_history', label: 'Order History' },
    ],
  },
  {
    id: 'billing', label: 'Billing Center', icon: CreditCard, type: 'group',
    children: [
      { id: 'invoices', label: 'Invoices' },
      { id: 'quotations', label: 'Quotations' },
      { id: 'agreements', label: 'Agreements' },
    ],
  },
  {
    id: 'support', label: 'Ticket', icon: MessageSquare, type: 'group',
    children: [
      { id: 'support_create', label: 'Create Ticket' },
      { id: 'support_tickets', label: 'My Tickets' },
    ],
  },
  { id: 'jobs', label: 'Jobs', icon: OnProgressIcon, type: 'item' },
  { id: 'knowledgebase', label: 'Knowledgebase', icon: BookOpen, type: 'item' },
  { id: 'profile', label: 'Account Details', icon: User, type: 'item' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, type: 'item' },
  {
    id: 'about', label: 'About Us', icon: Info, type: 'group',
    children: [
      { id: 'about_company', label: 'Company Info' },
      { id: 'about_contact', label: 'Contact Details' },
      { id: 'about_website', label: 'Our Website' },
    ],
  },
];

const KEEP_ALIVE_TABS = ['dashboard', 'announcements', 'hosting_my', 'domains_my', 'emails_my', 'services', 'order_history', 'invoices', 'quotations', 'support_tickets', 'jobs', 'appointments', 'products', 'profile', 'notifications', 'about_company', 'about_contact', 'agreements', 'knowledgebase'];

function ImpersonationDashboard() {
  useDisableRightClick();
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState('00:00');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mountedTabs, setMountedTabs] = useState(() => new Set(['dashboard']));
  const [expandedMenus, setExpandedMenus] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('cust_sidebar_collapsed') === 'true'
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches
  });

  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('cust_dark') !== 'false'
  );
  const c = isDark ? DARK : LIGHT;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('cust_dark', String(next));
  };

  const toggleSidebarCollapse = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    localStorage.setItem('cust_sidebar_collapsed', String(next));
  };

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)')
    const listener = (event) => setIsMobile(event.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, []);

  const [startTime] = useState(() => Date.now());

  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [waitingJobsCount, setWaitingJobsCount] = useState(0);
  const [activeTicketsCount, setActiveTicketsCount] = useState(0);
  const [activeProductsCount, setActiveProductsCount] = useState(0);
  const [hasUnpaidInvoices, setHasUnpaidInvoices] = useState(false);
  const [hasActiveQuotations, setHasActiveQuotations] = useState(false);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [emailsCount, setEmailsCount] = useState(0);
  const [domainsCount, setDomainsCount] = useState(0);
  const [hostingCount, setHostingCount] = useState(0);
  const [overdueInvoicesCount, setOverdueInvoicesCount] = useState(0);

  // States for search datasets and modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [ticketsList, setTicketsList] = useState([]);
  const [licensesList, setLicensesList] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [domainsList, setDomainsList] = useState([]);
  const [hostingPackagesList, setHostingPackagesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!customerProfile?.id) return;

    const fetchCounts = async () => {
      try {
        const email = customerProfile.email || impersonatedUser.email;
        const [
          jobsData, ticketsData, licensesData, invoicesData, quotationsData, announcementsCountRes,
          domainsDataRes, hostingPackagesDataRes, domainRequestsRes, hostingRequestsRes, emailRequestsRes
        ] = await Promise.all([
          getCustomerJobs(customerProfile.id).catch(() => []),
          getTicketsByCustomer(customerProfile.id).catch(() => []),
          getLicenses(customerProfile.id).catch(() => []),
          getCustomerInvoices(email).catch(() => []),
          getCustomerQuotations(email).catch(() => []),
          supabase.from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customerProfile.id)
            .eq('type', 'announcement')
            .eq('read_status', false),
          supabase.from('domains')
            .select('*')
            .eq('customer_id', customerProfile.id),
          supabase.from('hosting_packages')
            .select('*')
            .eq('customer_id', customerProfile.id),
          supabase.from('domain_requests')
            .select('*')
            .eq('customer_id', customerProfile.id),
          supabase.from('hosting_requests')
            .select('*')
            .eq('customer_id', customerProfile.id),
          supabase.from('email_requests')
            .select('*')
            .eq('customer_id', customerProfile.id),
        ]);
        setActiveJobsCount(jobsData.filter(j => j.status === 'Active').length);
        setWaitingJobsCount(jobsData.filter(j => j.status === 'Waiting').length);
        setActiveTicketsCount(ticketsData.filter(t => t.status === 'open').length);
        setUnreadAnnouncementsCount(announcementsCountRes?.count || 0);

        setTicketsList(ticketsData);
        setLicensesList(licensesData);

        // Count Active products
        const activeLics = licensesData.filter(l => {
          const status = getLicenseStatus(l);
          return status === 'Active' || status === 'Expiring Soon';
        });
        setActiveProductsCount(activeLics.length);

        const todayStr = new Date().toISOString().split('T')[0];
        const processedInvoices = (invoicesData || []).map(inv => {
          let status = inv.status;
          if (status !== 'paid' && status !== 'payment_submitted' && status !== 'refunded' && status !== 'partially_refunded' && status !== 'ongoing') {
            const due = inv.due_date ? inv.due_date.substring(0, 10) : null;
            if (due && due < todayStr) { status = 'overdue'; }
          }
          return { ...inv, status };
        });
        setInvoicesList(processedInvoices);

        // Count overdue invoices
        const overdueCount = processedInvoices.filter(inv => inv.status === 'overdue').length;
        setOverdueInvoicesCount(overdueCount);

        // Check for unpaid invoices
        const hasUnpaid = processedInvoices.some(inv => 
          inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partially_paid' || inv.status === 'ongoing'
        );
        setHasUnpaidInvoices(hasUnpaid);

        // Check for active quotations
        const today = new Date();
        const hasActiveQuotes = quotationsData.some(q => {
          const status = q.status || 'active';
          if (status === 'accepted') return true;
          if (status === 'declined' || status === 'expired') return false;
          if (!q.valid_until) return true;
          const valid = new Date(q.valid_until + 'T23:59:59');
          return valid >= today;
        });
        setHasActiveQuotations(hasActiveQuotes);

        const getBillingMonths = (billing) => {
          const b = String(billing || '').toLowerCase();
          if (b.includes('yearly') || b.includes('annual')) return 12;
          if (b.includes('6')) return 6;
          if (b.includes('3')) return 3;
          return 1;
        };

        const parseRequestField = (raw, label) => {
          if (!raw) return null;
          const regex = new RegExp(`${label}:\\s*([^|;\\n]+)`, 'i');
          const match = raw.match(regex);
          return match?.[1]?.trim() || null;
        };

        const getHostingExpiryDate = (h) => {
          if (h.expiry_date) return new Date(h.expiry_date);
          const isApproved = ['active', 'connected', 'approved', 'completed'].includes(String(h.status || '').toLowerCase());
          if (!isApproved) return null;
          const updated = h.updated_at || h.created_at;
          if (!updated) return null;
          const base = new Date(updated);
          const raw = h.package_type || h.notes || '';
          const billingPeriod = parseRequestField(raw, 'Billing') || h.billing_period;
          base.setMonth(base.getMonth() + getBillingMonths(billingPeriod));
          return base;
        };

        const isHostingActive = (h) => {
          const status = String(h.status || '').toLowerCase();
          const approved = ['active', 'connected', 'approved', 'completed'].includes(status);
          if (!approved) return false;
          const exp = getHostingExpiryDate(h);
          if (exp) {
            return exp.getTime() >= new Date().getTime();
          }
          return true;
        };

        const isDomainActive = (d) => {
          const status = String(d.status || '').toLowerCase();
          const approved = ['active', 'registered', 'approved', 'connected', 'completed'].includes(status);
          if (!approved) return false;
          const isExpired = d.expiry_date && new Date(d.expiry_date).getTime() < new Date().getTime();
          return !isExpired;
        };

        const isEmailActive = (e) => {
          const status = String(e.status || '').toLowerCase();
          const approved = ['active', 'connected', 'approved', 'completed'].includes(status);
          if (!approved) return false;
          const isExpired = e.expiry_date && new Date(e.expiry_date).getTime() < new Date().getTime();
          return !isExpired;
        };

        // Deduplicate and combine domains
        const seenDomains = new Set();
        let combinedDomainsCount = 0;
        const combinedDomainsSearch = [];
        (domainsDataRes?.data || []).forEach(d => {
          const name = d.domain_name || d.domain || d.name;
          if (name) {
            const key = name.toLowerCase().trim();
            if (!seenDomains.has(key)) {
              seenDomains.add(key);
              combinedDomainsSearch.push({ ...d, domain_name: name });
              if (isDomainActive(d)) {
                combinedDomainsCount++;
              }
            }
          }
        });
        (domainRequestsRes?.data || []).forEach(d => {
          const name = d.domain_name || d.domain || d.name;
          if (name) {
            const key = name.toLowerCase().trim();
            if (!seenDomains.has(key)) {
              seenDomains.add(key);
              combinedDomainsSearch.push({ ...d, domain_name: name });
              if (isDomainActive(d)) {
                combinedDomainsCount++;
              }
            }
          }
        });
        setDomainsCount(combinedDomainsCount);
        setDomainsList(combinedDomainsSearch);

        // Deduplicate and combine hosting packages and requests
        const normalizeHostingKey = (value) => String(value || '').split('|')[0].trim().toLowerCase();
        
        const rawPackages = hostingPackagesDataRes?.data || [];
        const rawRequests = hostingRequestsRes?.data || [];
        
        const requestIndex = new Map();
        rawRequests.forEach(req => {
          const key = `${req.customer_id || customerProfile.id}:${normalizeHostingKey(req.package_name || req.package_type || req.packageName)}`;
          requestIndex.set(key, req);
        });

        const linkedRequestIds = new Set();
        
        const enrichedPackages = rawPackages.map(pkg => {
          const key = `${pkg.customer_id || customerProfile.id}:${normalizeHostingKey(pkg.package_name || pkg.package_type || pkg.packageName)}`;
          const linkedRequest = requestIndex.get(key) || null;
          if (linkedRequest) linkedRequestIds.add(linkedRequest.id);
          
          const raw = linkedRequest?.package_type || linkedRequest?.notes || pkg.package_type || pkg.notes || '';
          const billingPeriod = pkg.billing_period || linkedRequest?.billing_period || parseRequestField(raw, 'Billing');
          const expiryDate = pkg.expiry_date || linkedRequest?.expiry_date || null;
          
          return {
            ...pkg,
            billing_period: billingPeriod,
            expiry_date: expiryDate,
          };
        });

        const unlinkedRequests = rawRequests.filter(r => !linkedRequestIds.has(r.id)).map(r => {
          const raw = r.package_type || r.notes || '';
          const billingPeriod = parseRequestField(raw, 'Billing');
          return {
            ...r,
            billing_period: billingPeriod,
          };
        });

        const combinedHosting = [...enrichedPackages, ...unlinkedRequests];

        const activeHostingSet = new Set();
        combinedHosting.forEach(h => {
          if (isHostingActive(h)) {
            const key = String(h.package_name || h.package_type || h.packageName || '').toLowerCase().trim();
            if (key) activeHostingSet.add(key);
          }
        });
        setHostingCount(activeHostingSet.size);

        // Populate hosting list for search
        const seenHostingsSearch = new Set();
        const combinedHostingsSearch = [];
        enrichedPackages.forEach(h => {
          const pkgName = h.package_name || h.package_type || h.packageName;
          const domName = h.domain_name || h.domain;
          const key = `${pkgName || ''}_${domName || ''}`.toLowerCase().trim();
          if (pkgName || domName) {
            seenHostingsSearch.add(key);
            combinedHostingsSearch.push({ ...h, package_type: pkgName, domain_name: domName });
          }
        });
        unlinkedRequests.forEach(h => {
          const pkgName = h.package_name || h.package_type || h.packageName;
          const domName = h.domain_name || h.domain;
          const key = `${pkgName || ''}_${domName || ''}`.toLowerCase().trim();
          if (!seenHostingsSearch.has(key) && (pkgName || domName)) {
            seenHostingsSearch.add(key);
            combinedHostingsSearch.push({ ...h, package_type: pkgName, domain_name: domName });
          }
        });
        setHostingPackagesList(combinedHostingsSearch);

        // Emails count
        const activeEmails = (emailRequestsRes?.data || []).filter(isEmailActive);
        setEmailsCount(activeEmails.length);

      } catch (error) {
        console.error('Error fetching impersonated dashboard counts:', error);
      }
    };

    fetchCounts();

    const channel = supabase
      .channel('impersonation-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'licenses' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotations' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domains' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hosting_packages' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domain_requests' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hosting_requests' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_requests' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerProfile?.id, impersonatedUser?.email]);

  // Read impersonation data
  useEffect(() => {
    const stored = sessionStorage.getItem('impersonated_user');
    const token = sessionStorage.getItem('impersonation_token');

    if (!stored || !token) {
      toast({ title: 'Error', description: 'No impersonation session found', variant: 'destructive' });
      navigate('/admin-dashboard', { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setImpersonatedUser(parsed);
      fetchCustomerProfile(parsed);
    } catch {
      navigate('/admin-dashboard', { replace: true });
    }
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(
        `${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Keep-alive: mount pages once, show/hide via display
  useEffect(() => {
    if (KEEP_ALIVE_TABS.includes(activeTab)) {
      setMountedTabs(s => s.has(activeTab) ? s : new Set(s).add(activeTab));
    }
  }, [activeTab]);

  useEffect(() => {
    // Auto-expand the parent group of the active sub-item, and collapse all other groups
    const parentGroup = NAV_STRUCTURE.find(item =>
      item.type === 'group' && item.children.some(child => child.id === activeTab)
    );
    if (parentGroup) {
      setExpandedMenus([parentGroup.id]);
    } else {
      setExpandedMenus([]);
    }
  }, [activeTab]);

  const fetchCustomerProfile = async (impUser) => {
    setLoading(true);
    try {
      let profile = null;

      // Try by user_id first
      const { data: byUserId } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', impUser.id)
        .single();

      if (byUserId) {
        profile = byUserId;
      } else if (impUser.customer_id) {
        const { data: byId } = await supabase
          .from('customers')
          .select('*')
          .eq('id', impUser.customer_id)
          .single();
        if (byId) profile = byId;
      }

      if (!profile) {
        const { data: byUrlId } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        if (byUrlId) profile = byUrlId;
      }

      if (profile) {
        setCustomerProfile(profile);
      } else {
        // Fallback: build from sessionStorage data
        setCustomerProfile({
          id: impUser.customer_id || customerId,
          user_id: impUser.id,
          name: impUser.name,
          email: impUser.email,
        });
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async () => {
    try {
      const adminToken = sessionStorage.getItem('original_admin_token');

      // Log exit
      try {
        const { data: { user } } = await supabase.auth.getSession();
        const imp = JSON.parse(sessionStorage.getItem('impersonated_user') || '{}');
        if (user?.id && imp?.id) {
          const { data: logs } = await supabase
            .from('impersonation_logs')
            .select('id')
            .eq('admin_id', user.id)
            .eq('target_user_id', imp.id)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1);

          if (logs?.[0]?.id) {
            await supabase
              .from('impersonation_logs')
              .update({ ended_at: new Date().toISOString(), action: 'exit' })
              .eq('id', logs[0].id);
          }
        }
      } catch { /* non-critical */ }

      if (adminToken) {
        try { await supabase.auth.setSession({ access_token: adminToken, refresh_token: '' }); }
        catch { /* ok */ }
      }

      sessionStorage.removeItem('impersonation_token');
      sessionStorage.removeItem('impersonated_user');
      sessionStorage.removeItem('original_admin_token');
      navigate('/admin-dashboard', { replace: true });
    } catch {
      sessionStorage.removeItem('impersonation_token');
      sessionStorage.removeItem('impersonated_user');
      sessionStorage.removeItem('original_admin_token');
      navigate('/admin-dashboard', { replace: true });
    }
  };

  const handleClearNotifications = async () => {
    const targetName = customerProfile?.name || impersonatedUser?.name || 'this customer';
    const targetId = customerProfile?.id || impersonatedUser?.customer_id || customerId;
    if (!targetId) return;

    if (confirm(`Are you sure you want to clear all notification history for ${targetName}?`)) {
      try {
        await clearCustomerNotifications(targetId);
        toast({ title: 'Notifications Cleared', description: `Successfully cleared notifications for ${targetName}.` });
      } catch (err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId) ? [] : [menuId]
    );
  };

  const switchTab = (tabId) => {
    if (tabId === 'about_website') {
      window.open('https://nextiom.com', '_blank');
      setIsMobileSidebarOpen(false);
      return;
    }
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);
  };

  const refreshProfile = async () => {
    if (impersonatedUser) {
      await fetchCustomerProfile(impersonatedUser);
    }
  };

  // Build user prop expected by customer components (memoize to prevent constant re-renders)
  const userProp = useMemo(() => 
    impersonatedUser && customerProfile
      ? { id: impersonatedUser.id, email: impersonatedUser.email, name: impersonatedUser.name, ...customerProfile, memberSince: customerProfile.created_at }
      : null,
    [impersonatedUser?.id, impersonatedUser?.email, impersonatedUser?.name, customerProfile]
  );

  if (!impersonatedUser) {
    return <div style={{ background: c.bg, minHeight: '100vh' }} />;
  }

  const renderContent = () => {
    if (!userProp) return null;
    const theme = { isDark, c };

    // Form pages — render fresh each visit (no keep-alive for these)
    if (activeTab === 'hosting_new')
      return <NewHostingOrderPage onSuccess={() => setActiveTab('hosting_my')} user={userProp} onNavigate={setActiveTab} {...theme} />;
    if (activeTab === 'domains_new')
      return <NewDomainRequestPage onSuccess={() => setActiveTab('domains_my')} user={userProp} {...theme} />;
    if (activeTab === 'emails_new')
      return <NewEmailRequestPage onSuccess={() => setActiveTab('emails_my')} user={userProp} {...theme} />;
    if (activeTab === 'support_create')
      return <CreateTicketPage user={userProp} isDark={isDark} c={c} onNavigate={setActiveTab} />;

    // Keep-alive pages: mount once, toggle visibility with display:none/block
    const wrap = (id, node) => (
      <div key={id} style={{ display: activeTab === id ? 'block' : 'none' }}>{node}</div>
    );

    return (
      <>
        {mountedTabs.has('dashboard') && wrap('dashboard', <DashboardPage user={userProp} {...theme} onNavigate={switchTab} />)}
        {mountedTabs.has('announcements') && wrap('announcements', <AnnouncementsPage user={userProp} {...theme} />)}
        {mountedTabs.has('hosting_my') && wrap('hosting_my', <MyHostingPackagesPage user={userProp} {...theme} />)}
        {mountedTabs.has('domains_my') && wrap('domains_my', <MyDomainsPage user={userProp} {...theme} />)}
        {mountedTabs.has('emails_my') && wrap('emails_my', <MyEmailsPage user={userProp} {...theme} />)}
        {mountedTabs.has('services') && wrap('services', <MyServicesPage user={userProp} {...theme} />)}
        {mountedTabs.has('order_history') && wrap('order_history', <OrderHistoryPage user={userProp} {...theme} />)}
        {mountedTabs.has('invoices') && wrap('invoices', <CustomerInvoicesPage user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('quotations') && wrap('quotations', <CustomerQuotationsPage user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('support_tickets') && wrap('support_tickets', <MyTicketsPage user={userProp} isDark={isDark} c={c} onNavigate={setActiveTab} />)}
        {mountedTabs.has('jobs') && wrap('jobs', <CustomerJobsPage user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('appointments') && wrap('appointments', <CustomerAppointmentsPage user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('products') && wrap('products', <MyProductsPage user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('profile') && wrap('profile', <ProfilePage user={userProp} onUpdate={refreshProfile} {...theme} />)}
        {mountedTabs.has('notifications') && wrap('notifications', <NotificationsPage customerId={customerProfile.id} onNavigate={switchTab} {...theme} />)}
        {mountedTabs.has('about_company') && wrap('about_company', <CompanyInfoPage {...theme} />)}
        {mountedTabs.has('about_contact') && wrap('about_contact', <ContactDetailsPage user={userProp} {...theme} />)}
        {mountedTabs.has('agreements') && wrap('agreements', <CustomerAgreementManagement user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('knowledgebase') && wrap('knowledgebase', <KnowledgebasePage isDark={isDark} c={c} />)}
      </>
    );
  };

  const renderNav = (collapsed) => (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
      {NAV_STRUCTURE.map((item) => {
        if (item.type === 'group') {
          const groupActive = item.children.some((ch) => ch.id === activeTab);
          return (
            <CollapsibleMenuItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={groupActive}
              isExpanded={expandedMenus.includes(item.id) && !collapsed}
              hasSubItems={!collapsed}
              collapsed={collapsed}
              c={c}
              isDark={isDark}
              onToggle={() => {
                if (collapsed) switchTab(item.children[0].id);
                else toggleMenu(item.id);
              }}
              onClick={() => {
                if (collapsed) switchTab(item.children[0].id);
                else toggleMenu(item.id);
              }}
              badge={
                item.id === 'support' ? activeTicketsCount :
                item.id === 'hosting' ? hostingCount :
                item.id === 'domains' ? domainsCount :
                item.id === 'emails' ? emailsCount :
                item.id === 'billing' ? overdueInvoicesCount : 0
              }
              badgeColor={item.id === 'billing' ? '#ef4444' : '#16a34a'}
              showDot={item.id === 'billing' && hasUnpaidInvoices && hasActiveQuotations}
              dotColor="#22c55e"
            >
              {item.children.map((child) => {
                let displayCount = null;
                if (child.id === 'hosting_my') displayCount = hostingCount;
                if (child.id === 'domains_my') displayCount = domainsCount;
                if (child.id === 'emails_my') displayCount = emailsCount;
                if (child.id === 'invoices' && overdueInvoicesCount > 0) displayCount = overdueInvoicesCount;

                return (
                  <button
                    key={child.id}
                    onClick={() => switchTab(child.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm mb-0.5 transition-colors"
                    style={{
                      color: activeTab === child.id ? c.brand : c.subText,
                      backgroundColor: activeTab === child.id ? c.brandLight : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== child.id) e.currentTarget.style.backgroundColor = c.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        activeTab === child.id ? c.brandLight : 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {child.icon && <child.icon size={16} color={activeTab === child.id ? c.brand : c.subText} />}
                      <span>{child.label}</span>
                    </div>
                    {displayCount !== null && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold font-mono"
                        style={{
                          backgroundColor: child.id === 'invoices' && activeTab !== child.id
                            ? 'rgba(239, 68, 68, 0.15)'
                            : activeTab === child.id ? c.brand : 'rgba(255,255,255,0.1)',
                          color: child.id === 'invoices' && activeTab !== child.id
                            ? '#ef4444'
                            : activeTab === child.id ? '#ffffff' : c.subText,
                        }}
                      >
                        {displayCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </CollapsibleMenuItem>
          );
        }
        return (
          <CollapsibleMenuItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeTab === item.id}
            hasSubItems={false}
            collapsed={collapsed}
            c={c}
            isDark={isDark}
            onClick={() => switchTab(item.id)}
            badge={item.id === 'jobs' ? activeJobsCount : (item.id === 'products' ? activeProductsCount : (item.id === 'announcements' ? unreadAnnouncementsCount : 0))}
            badgeColor={item.id === 'announcements' ? '#f97316' : '#16a34a'}
            badgeTextColor="#ffffff"
            isBlinking={item.id === 'jobs' && waitingJobsCount > 0}
          />
        );
      })}
    </nav>
  );

  const getSearchResults = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { products: [], domains: [], hosting: [], tickets: [], invoices: [] };

    const filteredProducts = licensesList.filter(l => 
      String(l.products?.name || l.name || '').toLowerCase().includes(q) ||
      String(l.license_key || '').toLowerCase().includes(q)
    );

    const filteredDomains = domainsList.filter(d => 
      String(d.domain_name || '').toLowerCase().includes(q) ||
      String(d.status || '').toLowerCase().includes(q)
    );

    const filteredHosting = hostingPackagesList.filter(h => 
      String(h.package_type || '').toLowerCase().includes(q) ||
      String(h.domain_name || '').toLowerCase().includes(q) ||
      String(h.status || '').toLowerCase().includes(q)
    );

    const filteredTickets = ticketsList.filter(t => 
      String(t.subject || '').toLowerCase().includes(q) ||
      String(t.status || '').toLowerCase().includes(q) ||
      String(t.ticket_number || '').toLowerCase().includes(q)
    );

    const filteredInvoices = invoicesList.filter(i => 
      String(i.invoice_number || '').toLowerCase().includes(q) ||
      String(i.status || '').toLowerCase().includes(q) ||
      String(i.total || '').toLowerCase().includes(q)
    );

    return {
      products: filteredProducts,
      domains: filteredDomains,
      hosting: filteredHosting,
      tickets: filteredTickets,
      invoices: filteredInvoices
    };
  };

  const searchResults = getSearchResults();
  const hasResults = Object.values(searchResults).some(arr => arr.length > 0);

  return (
    <div style={{ background: c.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="customer-dashboard-container">
      <Helmet><title>Customer Impersonation – {impersonatedUser?.name || 'Portal'}</title></Helmet>

      {/* Impersonation Banner */}
      <div
        style={{
          zIndex: 9999,
          background: 'var(--brand-color)',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 13 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>
            Viewing as <strong>{impersonatedUser.name}</strong> · {impersonatedUser.email}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Clock size={13} /> {elapsed}
          </span>
          <button
            onClick={handleClearNotifications}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 14px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Clear customer's notification history"
          >
            <BellOff size={13} /> Clear Notifs
          </button>
          <button
            onClick={handleExit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 14px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} /> Exit
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Mobile hamburger */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 50,
            padding: 8,
            borderRadius: 8,
            background: c.card,
            border: `1px solid ${c.border}`,
            color: c.text,
            display: 'block',
          }}
          className="lg:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:flex flex-col h-screen flex-shrink-0 overflow-hidden"
          style={{
            width: isSidebarCollapsed ? 64 : 260,
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), border-radius 0.25s cubic-bezier(0.4,0,0.2,1)',
            background: isSidebarCollapsed
              ? (isDark ? 'rgba(22,24,30,0.92)' : 'rgba(255,255,255,0.92)')
              : c.sidebar,
            backdropFilter: isSidebarCollapsed ? 'blur(24px)' : 'none',
            WebkitBackdropFilter: isSidebarCollapsed ? 'blur(24px)' : 'none',
            borderRight: isSidebarCollapsed ? 'none' : `1px solid ${c.border}`,
          }}
        >
        {/* Sidebar header */}
        <div
          className="h-16 flex items-center px-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          {/* Hamburger icon to toggle collapse */}
          <button
            onClick={toggleSidebarCollapse}
            className="p-1.5 rounded-md transition-colors flex-shrink-0"
            style={{ color: c.subText }}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={(e) => { e.currentTarget.style.color = c.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = c.subText; }}
          >
            <Menu size={20} />
          </button>

          {/* Logo — only show when sidebar is expanded */}
          {!isSidebarCollapsed && (
            <span style={{ color: c.brand, marginLeft: 12 }} className="font-bold text-lg tracking-wide select-none">
              NEXTIOM
            </span>
          )}
        </div>

        {renderNav(isSidebarCollapsed)}

        {/* Exit button in sidebar footer */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${c.border}` }}>
          <button
            onClick={handleExit}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={{ color: c.subText }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = c.subText;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && <span>Exit Impersonation</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <>
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ duration: 0.28 }}
            className="lg:hidden fixed inset-y-0 left-0 z-40 w-[260px] flex flex-col overflow-hidden"
            style={{ background: c.sidebar, paddingTop: 44 }}
          >
            <div
              className="h-16 flex items-center px-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${c.border}` }}
            >
              <span style={{ color: c.brand }} className="font-bold text-lg tracking-wide">
                NEXTIOM
              </span>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="ml-auto p-1"
                style={{ color: c.subText }}
              >
                <X size={16} />
              </button>
            </div>
            {renderNav(false)}
            <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${c.border}` }}>
              <button
                onClick={handleExit}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                style={{ color: '#ef4444' }}
              >
                <LogOut size={20} /> Exit Impersonation
              </button>
            </div>
          </motion.aside>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen flex flex-col min-w-0">
        {/* Header bar */}
        <div
          className="h-16 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
          style={{
            background: c.sidebar,
            borderBottom: `1px solid ${c.border}`,
            boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div className="pl-8 lg:pl-0 font-semibold truncate flex-1 min-w-0" style={{ color: c.text }}>
            {activeTab === 'dashboard' ? (
              <span className="hidden lg:inline">
                Viewing Customer: <span style={{ color: c.brand }}>{impersonatedUser?.name}</span>
              </span>
            ) : (
              <span className="hidden lg:inline">
                {activeTab === 'appointments' ? 'Appointments' : (NAV_STRUCTURE.flatMap((i) => i.children || [i]).find((i) => i.id === activeTab)?.label || 'Dashboard')}
              </span>
            )}
          </div>

          {/* Desktop Search & Knowledgebase Container */}
          <div className="hidden md:flex items-center gap-3 mx-4 flex-shrink-0">
            <div className="w-full max-w-xs xl:max-w-sm">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all text-left cursor-pointer hover:opacity-85"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  borderColor: c.border,
                  color: c.subText,
                }}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search products, domains, hosting...</span>
              </button>
            </div>

            {/* Knowledgebase Button */}
            <button
              onClick={() => switchTab(activeTab === 'knowledgebase' ? 'dashboard' : 'knowledgebase')}
              className="w-10 h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
              title={activeTab === 'knowledgebase' ? 'Back to Dashboard' : 'Knowledgebase'}
              style={{
                background: activeTab === 'knowledgebase'
                  ? `linear-gradient(135deg, ${c.brand || '#E87B35'} 0%, #D8631F 100%)`
                  : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                color: activeTab === 'knowledgebase' ? '#fff' : c.subText,
                border: activeTab === 'knowledgebase'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : `1px solid ${c.border}`,
                boxShadow: activeTab === 'knowledgebase'
                  ? `0 4px 14px rgba(232, 123, 53, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                  : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                if (activeTab === 'knowledgebase') {
                  e.currentTarget.style.boxShadow = `0 6px 20px rgba(232, 123, 53, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35)`;
                  e.currentTarget.style.filter = 'brightness(1.05)';
                } else {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
                  e.currentTarget.style.color = c.brand;
                  e.currentTarget.style.borderColor = c.brand;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                if (activeTab === 'knowledgebase') {
                  e.currentTarget.style.boxShadow = `0 4px 14px rgba(232, 123, 53, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)`;
                  e.currentTarget.style.filter = 'none';
                } else {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
                  e.currentTarget.style.color = c.subText;
                  e.currentTarget.style.borderColor = c.border;
                }
              }}
            >
              <BookOpen className="w-5 h-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
            </button>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Mobile Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden p-2 rounded-full transition-colors"
              style={{ color: c.subText, background: 'transparent' }}
              title="Search"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = c.hover}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mobile Support Ticket Button */}
            <button
              onClick={() => switchTab(activeTab === 'support_create' ? 'dashboard' : 'support_create')}
              className="md:hidden p-2 rounded-full transition-colors relative"
              style={{ 
                color: activeTab === 'support_create' ? c.brand : c.subText, 
                background: 'transparent' 
              }}
              title="Open Support Ticket"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = c.hover}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <MessageSquare className="w-4.5 h-4.5" />
            </button>

            {/* Mobile Appointments Button */}
            <button
              onClick={() => switchTab(activeTab === 'appointments' ? 'dashboard' : 'appointments')}
              className="md:hidden p-2 rounded-full transition-colors relative"
              style={{ 
                color: activeTab === 'appointments' ? c.brand : c.subText, 
                background: 'transparent' 
              }}
              title="Appointments"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = c.hover}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Calendar className="w-4.5 h-4.5" />
            </button>

            {/* Mobile Knowledgebase Button */}
            <button
              onClick={() => switchTab(activeTab === 'knowledgebase' ? 'dashboard' : 'knowledgebase')}
              className="md:hidden p-2 rounded-full transition-colors relative"
              style={{ 
                color: activeTab === 'knowledgebase' ? c.brand : c.subText, 
                background: 'transparent' 
              }}
              title="Knowledgebase"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = c.hover}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <BookOpen className="w-4.5 h-4.5" />
            </button>

            {/* Desktop Open Support Ticket button */}
            <button
              onClick={() => switchTab(activeTab === 'support_create' ? 'dashboard' : 'support_create')}
              className="hidden md:flex w-10 h-10 rounded-xl transition-all items-center justify-center cursor-pointer flex-shrink-0"
              title={activeTab === 'support_create' ? 'Back to Dashboard' : 'Open Support Ticket'}
              style={{
                background: activeTab === 'support_create'
                  ? `linear-gradient(135deg, ${c.brand || '#E87B35'} 0%, #D8631F 100%)`
                  : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                color: activeTab === 'support_create' ? '#fff' : c.subText,
                border: activeTab === 'support_create'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : `1px solid ${c.border}`,
                boxShadow: activeTab === 'support_create'
                  ? `0 4px 14px rgba(232, 123, 53, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                  : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                if (activeTab === 'support_create') {
                  e.currentTarget.style.boxShadow = `0 6px 20px rgba(232, 123, 53, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35)`;
                  e.currentTarget.style.filter = 'brightness(1.05)';
                } else {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
                  e.currentTarget.style.color = c.brand;
                  e.currentTarget.style.borderColor = c.brand;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                if (activeTab === 'support_create') {
                  e.currentTarget.style.boxShadow = `0 4px 14px rgba(232, 123, 53, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)`;
                  e.currentTarget.style.filter = 'none';
                } else {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
                  e.currentTarget.style.color = c.subText;
                  e.currentTarget.style.borderColor = c.border;
                }
              }}
            >
              <MessageSquare className="w-5 h-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
            </button>

            {/* Desktop Appointment Button */}
            <button
              onClick={() => switchTab(activeTab === 'appointments' ? 'dashboard' : 'appointments')}
              className="hidden md:flex w-10 h-10 rounded-xl transition-all items-center justify-center cursor-pointer flex-shrink-0"
              title={activeTab === 'appointments' ? 'Back to Dashboard' : 'Appointments'}
              style={{
                background: activeTab === 'appointments'
                  ? `linear-gradient(135deg, ${c.brand || '#E87B35'} 0%, #D8631F 100%)`
                  : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                color: activeTab === 'appointments' ? '#fff' : c.subText,
                border: activeTab === 'appointments'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : `1px solid ${c.border}`,
                boxShadow: activeTab === 'appointments'
                  ? `0 4px 14px rgba(232, 123, 53, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                  : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                if (activeTab === 'appointments') {
                  e.currentTarget.style.boxShadow = `0 6px 20px rgba(232, 123, 53, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35)`;
                  e.currentTarget.style.filter = 'brightness(1.05)';
                } else {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
                  e.currentTarget.style.color = c.brand;
                  e.currentTarget.style.borderColor = c.brand;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                if (activeTab === 'appointments') {
                  e.currentTarget.style.boxShadow = `0 4px 14px rgba(232, 123, 53, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)`;
                  e.currentTarget.style.filter = 'none';
                } else {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
                  e.currentTarget.style.color = c.subText;
                  e.currentTarget.style.borderColor = c.border;
                }
              }}
            >
              <Calendar className="w-5 h-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
            </button>

            {/* Status button */}
            <div
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => setShowStatusTooltip(true)}
              onMouseLeave={() => setShowStatusTooltip(false)}
            >
              <a
                href="https://nextiom.com/hosting-status/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  color: 'rgb(34, 197, 94)',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="flex items-center gap-1.5 animate-green-shine-blink">
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'rgb(34, 197, 94)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }} />
                  Status
                </span>
              </a>
              {showStatusTooltip && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%) translateY(8px)',
                  background: c.sidebar,
                  color: c.text,
                  border: `1px solid ${c.brand}`,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  width: 200,
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
                  zIndex: 50,
                  textAlign: 'center',
                  lineHeight: 1.4,
                  pointerEvents: 'none',
                  whiteSpace: 'normal'
                }}>
                  View real-time status of our hosting servers and system operations.
                  {/* Arrow pointing up */}
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: `6px solid ${c.brand}`
                  }} />
                </div>
              )}
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-full transition-colors"
              style={{ color: c.subText, background: 'transparent' }}
              title={isDark ? 'Switch to Light' : 'Switch to Dark'}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = c.hover}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {customerProfile?.id && (
              <NotificationBell
                userId={customerProfile.id}
                onViewAll={() => switchTab('notifications')}
                onNavigate={switchTab}
                isDark={isDark}
                c={c}
              />
            )}
            <button
              onClick={() => switchTab('profile')}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors flex-shrink-0"
              style={{ background: c.brandLight, color: c.brand }}
              title="Account Details"
            >
              {impersonatedUser?.name ? impersonatedUser.name.charAt(0).toUpperCase() : 'U'}
            </button>
          </div>
        </div>

        {/* Page content wrapper — fills remaining space, scrolls independently */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <Loader2 className="animate-spin" size={32} style={{ color: c.brand }} />
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </div>
      </main>
      </div>

      {/* Global Search Dialog Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-start justify-center pt-[10vh] px-4"
              onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
            >
              <motion.div
                initial={{ scale: 0.95, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col shadow-2xl border"
                style={{ background: c.card, borderColor: c.border }}
                onClick={e => e.stopPropagation()}
              >
                {/* Search Input Area */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: c.border }}>
                  <Search className="w-5 h-5" style={{ color: c.brand }} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search products, domains, hosting, tickets, invoices..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                    style={{ color: c.text }}
                  />
                  <button 
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                    className="p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Results Area */}
                <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-4">
                  {!searchQuery ? (
                    <div className="text-center py-8 text-xs" style={{ color: c.subText }}>
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-25 animate-pulse" style={{ color: c.brand }} />
                      Type to search across Nextiom Portal...
                    </div>
                  ) : !hasResults ? (
                    <div className="text-center py-8 text-xs" style={{ color: c.subText }}>
                      No results found for <span className="font-semibold" style={{ color: c.text }}>"{searchQuery}"</span>
                    </div>
                  ) : (
                    <>
                      {/* Products */}
                      {searchResults.products.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: c.subText }}>
                            <Package className="w-3 h-3" /> Products ({searchResults.products.length})
                          </div>
                          <div className="flex flex-col gap-1">
                            {searchResults.products.map(l => (
                              <button
                                key={l.id}
                                onClick={() => { switchTab('products'); setIsSearchOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer"
                                style={{ background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = c.hover; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <span className="font-semibold" style={{ color: c.text }}>{l.products?.name || l.name}</span>
                                <span style={{ color: c.subText, fontSize: 10 }}>{l.status}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Domains */}
                      {searchResults.domains.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: c.subText }}>
                            <Globe className="w-3 h-3" /> Domains ({searchResults.domains.length})
                          </div>
                          <div className="flex flex-col gap-1">
                            {searchResults.domains.map(d => (
                              <button
                                key={d.id}
                                onClick={() => { switchTab('domains_my'); setIsSearchOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer"
                                style={{ background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = c.hover; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <span className="font-semibold" style={{ color: c.text }}>{d.domain_name}</span>
                                <span style={{ color: c.subText, fontSize: 10 }}>{d.status}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hosting */}
                      {searchResults.hosting.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: c.subText }}>
                            <Server className="w-3 h-3" /> Hosting Packages ({searchResults.hosting.length})
                          </div>
                          <div className="flex flex-col gap-1">
                            {searchResults.hosting.map(h => (
                              <button
                                key={h.id}
                                onClick={() => { switchTab('hosting_my'); setIsSearchOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer"
                                style={{ background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = c.hover; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <span className="font-semibold" style={{ color: c.text }}>{h.package_type?.split('|')[0]}</span>
                                <span style={{ color: c.subText, fontSize: 10 }}>{h.domain_name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tickets */}
                      {searchResults.tickets.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: c.subText }}>
                            <MessageSquare className="w-3 h-3" /> Support Tickets ({searchResults.tickets.length})
                          </div>
                          <div className="flex flex-col gap-1">
                            {searchResults.tickets.map(t => (
                              <button
                                key={t.id}
                                onClick={() => { switchTab('support_tickets'); setIsSearchOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer"
                                style={{ background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = c.hover; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <span className="font-semibold truncate max-w-[70%]" style={{ color: c.text }}>{t.subject}</span>
                                <span style={{ color: c.subText, fontSize: 10 }}>#{t.ticket_number || t.id?.slice(0, 8)} - {t.status}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Invoices */}
                      {searchResults.invoices.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: c.subText }}>
                            <CreditCard className="w-3 h-3" /> Invoices ({searchResults.invoices.length})
                          </div>
                          <div className="flex flex-col gap-1">
                            {searchResults.invoices.map(i => (
                              <button
                                key={i.id || i.invoice_number}
                                onClick={() => { switchTab('invoices'); setIsSearchOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer"
                                style={{ background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = c.hover; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <span className="font-semibold" style={{ color: c.text }}>#{i.invoice_number || 'INV'}</span>
                                <span style={{ color: c.subText, fontSize: 10 }}>{i.currency} {i.total} - {i.status}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ImpersonationDashboard;
