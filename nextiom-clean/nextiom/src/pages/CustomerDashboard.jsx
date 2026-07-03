import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, LogOut, Menu, X,
  Globe, ShoppingCart, MessageSquare, Server, Loader2,
  Sun, Moon, ChevronLeft, ChevronRight, Package, Mail,
  CreditCard, FileText, Info, Briefcase, Megaphone, Search, BookOpen, Sparkles,
  CheckCircle, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

import DashboardPage from '@/components/customer/DashboardPage';
import AnnouncementsPage from '@/components/customer/AnnouncementsPage';
import MyServicesPage from '@/components/customer/MyServicesPage';
import OrderHistoryPage from '@/components/customer/OrderHistoryPage';
import ProfilePage from '@/components/customer/ProfilePage';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import NotificationBell from '@/components/notifications/NotificationBell';
import MyDomainsPage from '@/components/customer/MyDomainsPage';
import MyProductsPage from '@/components/customer/MyProductsPage';
import NewDomainRequestPage from '@/components/customer/NewDomainRequestPage';
import MyEmailsPage from '@/components/customer/MyEmailsPage';
import NewEmailRequestPage from '@/components/customer/NewEmailRequestPage';
import MyHostingPackagesPage from '@/components/customer/MyHostingPackagesPage';
import NewHostingOrderPage from '@/components/customer/NewHostingOrderPage';
import CollapsibleMenuItem from '@/components/ui/CollapsibleMenuItem';
import CustomerInvoicesPage from '@/components/customer/CustomerInvoicesPage';
import CustomerQuotationsPage from '@/components/customer/CustomerQuotationsPage';
import CreateTicketPage from '@/components/customer/CreateTicketPage';
import MyTicketsPage from '@/components/customer/MyTicketsPage';
import KnowledgebasePage from '@/components/customer/KnowledgebasePage';
import PortalRestrictionBanner from '@/components/customer/PortalRestrictionBanner';
import { usePortalRestriction } from '@/hooks/usePortalRestriction';
import useDisableRightClick from '@/hooks/useDisableRightClick';
import { cn } from '@/lib/utils';
import { CompanyInfoPage, ContactDetailsPage } from '@/components/customer/AboutPages';
import CustomerJobsPage from '@/components/customer/CustomerJobsPage';
import CustomerAgreementManagement from '@/components/customer/CustomerAgreementManagement';
import { getCustomerJobs } from '@/lib/jobs';
import { getTicketsByCustomer, getLicenses } from '@/lib/storage';
import { getCustomerInvoices } from '@/lib/invoices';
import { getCustomerQuotations } from '@/lib/quotations';
import { supabase } from '@/lib/customSupabaseClient';

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

function getActiveLabel(activeTab) {
  for (const item of NAV_STRUCTURE) {
    if (item.id === activeTab) return item.label;
    if (item.children) {
      const child = item.children.find(c => c.id === activeTab);
      if (child) return child.label;
    }
  }
  return 'Dashboard';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 20) return 'Good night';
  if (hour >= 16) return 'Good evening';
  if (hour >= 12) return 'Good afternoon';
  return 'Good morning';
}

const KEEP_ALIVE_TABS = ['dashboard', 'announcements', 'hosting_my', 'domains_my', 'emails_my', 'services', 'order_history', 'invoices', 'quotations', 'support_tickets', 'jobs', 'products', 'profile', 'notifications', 'about_company', 'about_contact', 'agreements', 'knowledgebase'];

function CustomerDashboard() {
  useDisableRightClick();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mountedTabs, setMountedTabs] = useState(() => new Set(['dashboard']));
  const portalRestriction = usePortalRestriction();

  const [ipayModal, setIpayModal] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ipayStatus = params.get('ipay_status');
    if (ipayStatus) {
      if (ipayStatus === 'return') {
        setIpayModal('success');
        setActiveTab('invoices');
      } else if (ipayStatus === 'cancel') {
        setIpayModal('cancel');
        setActiveTab('invoices');
      }
      // Clear URL params to avoid modal showing again on reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  useEffect(() => {
    if (KEEP_ALIVE_TABS.includes(activeTab)) {
      setMountedTabs(s => s.has(activeTab) ? s : new Set(s).add(activeTab));
    }
  }, [activeTab]);

  const [expandedMenus, setExpandedMenus] = useState([]);

  useEffect(() => {
    // Auto-expand the parent group of the active sub-item
    const parentGroup = NAV_STRUCTURE.find(item =>
      item.type === 'group' && item.children.some(child => child.id === activeTab)
    );
    if (parentGroup) {
      setExpandedMenus(prev => {
        if (!prev.includes(parentGroup.id)) {
          return [...prev, parentGroup.id];
        }
        return prev;
      });
    }
  }, [activeTab]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('cust_sidebar_collapsed') === 'true'
  );
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('cust_dark') !== 'false'
  );
  const { user, signOut, customerProfile } = useAuth();
  const c = isDark ? DARK : LIGHT;

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (customerProfile && customerProfile.welcome_modal_shown === false) {
      const timer = setTimeout(() => {
        setShowWelcomeModal(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [customerProfile]);

  const handleCloseWelcomeModal = async (goToKb = false) => {
    setShowWelcomeModal(false);
    if (customerProfile) {
      customerProfile.welcome_modal_shown = true;
    }
    if (goToKb) {
      setActiveTab('knowledgebase');
    }
    try {
      if (customerProfile?.id) {
        await supabase
          .from('customers')
          .update({ welcome_modal_shown: true })
          .eq('id', customerProfile.id);
      }
    } catch (err) {
      console.error("Failed to save welcome modal status:", err);
    }
  };

  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [waitingJobsCount, setWaitingJobsCount] = useState(0);
  const [activeTicketsCount, setActiveTicketsCount] = useState(0);
  const [activeProductsCount, setActiveProductsCount] = useState(0);
  const [hasUnpaidInvoices, setHasUnpaidInvoices] = useState(false);
  const [hasActiveQuotations, setHasActiveQuotations] = useState(false);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [emailsCount, setEmailsCount] = useState(0);

  // States for search datasets and modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [ticketsList, setTicketsList] = useState([]);
  const [licensesList, setLicensesList] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [domainsList, setDomainsList] = useState([]);
  const [hostingPackagesList, setHostingPackagesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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
      String(t.ticket_number || '').toLowerCase().includes(q) ||
      String(t.status || '').toLowerCase().includes(q)
    );

    const filteredInvoices = invoicesList.filter(i => 
      String(i.invoice_number || '').toLowerCase().includes(q) ||
      String(i.status || '').toLowerCase().includes(q) ||
      String(i.total || '').toLowerCase().includes(q)
    );

    return {
      products: filteredProducts.slice(0, 4),
      domains: filteredDomains.slice(0, 4),
      hosting: filteredHosting.slice(0, 4),
      tickets: filteredTickets.slice(0, 4),
      invoices: filteredInvoices.slice(0, 4),
    };
  };

  const searchResults = getSearchResults();
  const hasResults = Object.values(searchResults).some(arr => arr.length > 0);

  useEffect(() => {
    if (!customerProfile?.id) return;

    const fetchCounts = async () => {
      try {
        const email = customerProfile.email || user.email;
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
        setEmailsCount(emailRequestsRes?.data?.length || 0);

        setTicketsList(ticketsData);
        setLicensesList(licensesData);
        setInvoicesList(invoicesData);

        // Deduplicate and combine domains for search
        const seenDomains = new Set();
        const combinedDomains = [];
        (domainsDataRes?.data || []).forEach(d => {
          const name = d.domain_name || d.domain || d.name;
          if (name) {
            const key = name.toLowerCase().trim();
            seenDomains.add(key);
            combinedDomains.push({ ...d, domain_name: name });
          }
        });
        (domainRequestsRes?.data || []).forEach(d => {
          const name = d.domain_name || d.domain || d.name;
          if (name) {
            const key = name.toLowerCase().trim();
            if (!seenDomains.has(key)) {
              seenDomains.add(key);
              combinedDomains.push({ ...d, domain_name: name });
            }
          }
        });
        setDomainsList(combinedDomains);

        // Deduplicate and combine hosting packages for search
        const seenHostings = new Set();
        const combinedHostings = [];
        (hostingPackagesDataRes?.data || []).forEach(h => {
          const pkgName = h.package_name || h.package_type || h.packageName;
          const domName = h.domain_name || h.domain;
          const key = `${pkgName || ''}_${domName || ''}`.toLowerCase().trim();
          if (pkgName || domName) {
            seenHostings.add(key);
            combinedHostings.push({
              ...h,
              package_type: pkgName,
              domain_name: domName
            });
          }
        });
        (hostingRequestsRes?.data || []).forEach(h => {
          const pkgName = h.package_name || h.package_type || h.packageName;
          const domName = h.domain_name || h.domain;
          const key = `${pkgName || ''}_${domName || ''}`.toLowerCase().trim();
          if (!seenHostings.has(key) && (pkgName || domName)) {
            seenHostings.add(key);
            combinedHostings.push({
              ...h,
              package_type: pkgName,
              domain_name: domName
            });
          }
        });
        setHostingPackagesList(combinedHostings);

        // Count Active products
        const activeLics = licensesData.filter(l => {
          const status = getLicenseStatus(l);
          return status === 'Active' || status === 'Expiring Soon';
        });
        setActiveProductsCount(activeLics.length);

        // Check for unpaid invoices
        const hasUnpaid = invoicesData.some(inv => 
          inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'partially_paid'
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

      } catch (error) {
        console.error('Error fetching dashboard counts:', error);
      }
    };

    fetchCounts();

    const channel = supabase
      .channel('customer-dashboard-counts')
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
        { event: '*', schema: 'public', table: 'notifications', filter: `customer_id=eq.${customerProfile.id}` },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerProfile?.id, customerProfile?.email, user?.email]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await signOut();
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    sessionStorage.clear();
    const notifMarkAllAt = localStorage.getItem('cust_notif_mark_all_at');
    const notifReadVirt = localStorage.getItem('cust_notif_read_virt');
    localStorage.clear();
    if (notifMarkAllAt) localStorage.setItem('cust_notif_mark_all_at', notifMarkAllAt);
    if (notifReadVirt) localStorage.setItem('cust_notif_read_virt', notifReadVirt);
    window.location.replace('/');
  };

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

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev =>
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  };

  const navigate = (tabId) => {
    if (tabId === 'about_website') {
      window.open('https://nextiom.com', '_blank');
      setIsMobileSidebarOpen(false);
      return;
    }
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);
  };

  const renderNav = (collapsed) => (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
      {NAV_STRUCTURE.map(item => {
        if (item.type === 'group') {
          const groupActive = item.children.some(ch => ch.id === activeTab);
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
                if (collapsed) navigate(item.children[0].id);
                else toggleMenu(item.id);
              }}
              onClick={() => {
                if (collapsed) navigate(item.children[0].id);
                else toggleMenu(item.id);
              }}
              badge={
                item.id === 'support' ? activeTicketsCount :
                item.id === 'hosting' ? hostingPackagesList.length :
                item.id === 'domains' ? domainsList.length :
                item.id === 'emails' ? emailsCount : 0
              }
              badgeColor="#16a34a"
              showDot={item.id === 'billing' && hasUnpaidInvoices && hasActiveQuotations}
              dotColor="#22c55e"
            >
              {item.children.map(child => {
                let displayCount = null;
                if (child.id === 'hosting_my') displayCount = hostingPackagesList.length;
                if (child.id === 'domains_my') displayCount = domainsList.length;
                if (child.id === 'emails_my') displayCount = emailsCount;

                return (
                  <button
                    key={child.id}
                    onClick={() => navigate(child.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm mb-0.5 transition-colors"
                    style={{
                      color: activeTab === child.id ? c.brand : c.subText,
                      backgroundColor: activeTab === child.id ? c.brandLight : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (activeTab !== child.id) e.currentTarget.style.backgroundColor = c.hover;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = activeTab === child.id ? c.brandLight : 'transparent';
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
                          backgroundColor: activeTab === child.id ? c.brand : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                          color: activeTab === child.id ? '#ffffff' : c.subText,
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
            onClick={() => navigate(item.id)}
            badge={item.id === 'jobs' ? activeJobsCount : (item.id === 'products' ? activeProductsCount : (item.id === 'announcements' ? unreadAnnouncementsCount : 0))}
            badgeColor={item.id === 'announcements' ? '#f97316' : '#16a34a'}
            badgeTextColor="#ffffff"
            isBlinking={item.id === 'jobs' &&  waitingJobsCount > 0 }
          />
        );
      })}
    </nav>
  );

  const sidebarHeader = (showCollapse, showClose) => (
    <div
      className="h-16 flex items-center px-4 flex-shrink-0"
      style={{ borderBottom: `1px solid ${c.border}` }}
    >
      {(!isSidebarCollapsed || showClose) && (
        <span style={{ color: c.brand }} className="font-bold text-xl tracking-wide select-none">
          NEXTIOM
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        {showClose && (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1.5 rounded-md"
            style={{ color: c.subText }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {showCollapse && (
          <button
            onClick={toggleSidebarCollapse}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: c.subText }}
            onMouseEnter={e => e.currentTarget.style.color = c.text}
            onMouseLeave={e => e.currentTarget.style.color = c.subText}
          >
            {isSidebarCollapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );

  const sidebarFooter = (collapsed) => (
    <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${c.border}` }}>
      <button
        onClick={handleLogout}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          collapsed && 'justify-center'
        )}
        style={{ color: c.subText }}
        title={collapsed ? 'Log Out' : undefined}
        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = c.subText; e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>Log Out</span>}
      </button>
    </div>
  );

  const renderContent = () => {
    if (!customerProfile) return null;
    const userProp = { ...user, ...customerProfile, id: customerProfile.id || user.id, email: customerProfile.email || user.email, memberSince: customerProfile.created_at };
    const theme = { isDark, c };

    // Form pages — rendered fresh each visit (no keep-alive)
    if (activeTab === 'hosting_new') return <NewHostingOrderPage onSuccess={() => setActiveTab('hosting_my')} onNavigate={setActiveTab} {...theme} />;
    if (activeTab === 'domains_new') return <NewDomainRequestPage onSuccess={() => setActiveTab('domains_my')} {...theme} />;
    if (activeTab === 'emails_new') return <NewEmailRequestPage onSuccess={() => setActiveTab('emails_my')} {...theme} />;
    if (activeTab === 'support_create') return <CreateTicketPage user={userProp} isDark={isDark} c={c} onNavigate={setActiveTab} />;

    const wrap = (id, node) => (
      <div key={id} style={{ display: activeTab === id ? 'block' : 'none' }}>{node}</div>
    );

    return (
      <>
        {mountedTabs.has('dashboard') && wrap('dashboard', <DashboardPage user={userProp} {...theme} onNavigate={navigate} />)}
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
        {mountedTabs.has('products') && wrap('products', <MyProductsPage user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('profile') && wrap('profile', <ProfilePage user={userProp} onUpdate={() => { }} {...theme} />)}
        {mountedTabs.has('notifications') && wrap('notifications', <NotificationsPage customerId={customerProfile.id} onNavigate={setActiveTab} {...theme} />)}
        {mountedTabs.has('about_company') && wrap('about_company', <CompanyInfoPage {...theme} />)}
        {mountedTabs.has('about_contact') && wrap('about_contact', <ContactDetailsPage user={userProp} {...theme} />)}
        {mountedTabs.has('agreements') && wrap('agreements', <CustomerAgreementManagement user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('knowledgebase') && wrap('knowledgebase', <KnowledgebasePage isDark={isDark} c={c} />)}
      </>
    );
  };

  if (!user) {
    window.location.replace('/');
    return (
      <div style={{ background: c.bg }} className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: c.brand }} />
      </div>
    );
  }

  return (
    <div style={{ background: c.bg }} className="min-h-screen flex font-sans">
      <Helmet><title>Customer Dashboard – Nextiom</title></Helmet>

      {/* Mobile hamburger */}
      {!isMobileSidebarOpen && (
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-md"
          style={{ background: c.card, border: `1px solid ${c.border}`, color: c.text }}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* ── Desktop Sidebar ──────────────────────── */}
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
          borderRadius: isSidebarCollapsed ? '0 24px 24px 0' : '0',
          boxShadow: isSidebarCollapsed
            ? (isDark ? '4px 0 32px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.06)' : '4px 0 32px rgba(0,0,0,0.08), inset -1px 0 0 rgba(0,0,0,0.05)')
            : 'none',
        }}
      >
        {sidebarHeader(true, false)}
        {renderNav(isSidebarCollapsed)}
        {sidebarFooter(isSidebarCollapsed)}
      </aside>

      {/* ── Mobile Sidebar ───────────────────────── */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="lg:hidden fixed inset-y-0 left-0 z-40 w-[260px] flex flex-col h-screen overflow-hidden"
              style={{ background: c.sidebar, borderRight: `1px solid ${c.border}` }}
            >
              {sidebarHeader(false, true)}
              {renderNav(false)}
              {sidebarFooter(false)}
            </motion.aside>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────── */}
      <main className="flex-1 overflow-auto h-screen flex flex-col min-w-0">
        {/* Header */}
        <div
          className="h-16 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
          style={{
            background: c.sidebar,
            borderBottom: `1px solid ${c.border}`,
            boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div className="pl-8 lg:pl-0 font-semibold truncate max-w-[120px] sm:max-w-none" style={{ color: c.text }}>
            {activeTab === 'dashboard'
              ? `${getGreeting()}, ${customerProfile?.name || user?.email || 'Customer'}`
              : getActiveLabel(activeTab)}
          </div>

          {/* Desktop Search Button */}
          <div className="hidden md:flex flex-1 max-w-sm mx-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all text-left cursor-pointer hover:opacity-85"
              style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                borderColor: c.border,
                color: c.subText,
              }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search products, domains, hosting...</span>
              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold border" style={{ borderColor: c.border, background: c.hover }}>
                ⌘K
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
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
            {/* Status button — always cositive green pulse */}
            <div className="pulse-green">
              <a
                href="https://nextiom.com/hosting-status/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 border"
                style={{
                  borderColor: 'rgba(34, 197, 94, 0.5)',
                  color: 'rgb(34, 197, 94)',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.9)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                }}
              >
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'rgb(34, 197, 94)',
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
                Status
              </a>
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

            {/* Notification bell */}
            {customerProfile?.id && (
              <NotificationBell
                userId={customerProfile.id}
                onViewAll={() => navigate('notifications')}
                onNavigate={navigate}
                isDark={isDark}
                c={c}
              />
            )}

            {/* User avatar */}
            <button
              onClick={() => navigate('profile')}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors flex-shrink-0"
              style={{ background: c.brandLight, color: c.brand }}
              title="Account Details"
            >
              {customerProfile?.name ? customerProfile.name.charAt(0).toUpperCase() : 'U'}
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
            <PortalRestrictionBanner restriction={portalRestriction} c={c} isDark={isDark} />
            {renderContent()}
          </div>
        </div>
      </main>

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
                                onClick={() => { navigate('products'); setIsSearchOpen(false); setSearchQuery(''); }}
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
                                onClick={() => { navigate('domains_my'); setIsSearchOpen(false); setSearchQuery(''); }}
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
                                onClick={() => { navigate('hosting_my'); setIsSearchOpen(false); setSearchQuery(''); }}
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
                                onClick={() => { navigate('support_tickets'); setIsSearchOpen(false); setSearchQuery(''); }}
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
                                onClick={() => { navigate('invoices'); setIsSearchOpen(false); setSearchQuery(''); }}
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

      {/* iPay Status Feedback Modal */}
      {ipayModal && (
        <>
          <div onClick={() => setIpayModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '90%', maxWidth: 450, background: c.card, border: `1px solid ${c.border}`,
            borderRadius: 16, padding: 28, zIndex: 301, display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: '50%',
              backgroundColor: ipayModal === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: ipayModal === 'success' ? '#22c55e' : '#ef4444',
              marginBottom: 16,
            }}>
              {ipayModal === 'success' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
            </div>
            
            <h3 style={{ fontSize: 18, fontWeight: 700, color: c.text, margin: '0 0 8px 0' }}>
              {ipayModal === 'success' ? 'Payment Completed' : 'Payment Canceled'}
            </h3>
            
            <p style={{ fontSize: 13, color: c.subText, margin: '0 0 24px 0', lineHeight: 1.5 }}>
              {ipayModal === 'success' 
                ? 'Thank you! Your payment has been processed successfully. Your invoice status will update automatically in a few moments.' 
                : 'The online payment transaction was canceled. If this was a mistake, please try again or contact support.'}
            </p>
            
            <button
              onClick={() => setIpayModal(null)}
              style={{
                width: '100%', padding: '11px 20px', background: ipayModal === 'success' ? '#22c55e' : c.brand,
                color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
            >
              Close
            </button>
          </div>
        </>
      )}

      {/* Welcome & Knowledgebase Introduction Pop-up Modal */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleCloseWelcomeModal(false)}
              className="absolute inset-0 backdrop-blur-md bg-black/60"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl p-6 flex flex-col items-center text-center gap-6"
              style={{
                backgroundColor: c.card,
                borderColor: c.border,
                color: c.text,
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Decorative brand gradient circle at the top */}
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${c.brand}, ${isDark ? '#f97316' : '#ea580c'})`,
                  boxShadow: `0 8px 24px rgba(232, 123, 53, 0.25)`,
                }}
              >
                <BookOpen className="w-8 h-8 text-white animate-pulse" />
              </div>
              
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-extrabold tracking-tight">
                  Welcome to Nextiom Portal!
                </h3>
                <p className="text-xs" style={{ color: c.brand, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Your Account is Ready
                </p>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: c.subText }}>
                We're excited to have you on board! To help you get started, we've created a comprehensive{' '}
                <strong style={{ color: c.text }}>Knowledgebase</strong> containing detailed setup guides, cPanel tutorials, invoice guides, and FAQs.
              </p>

              <div 
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-xs"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  borderColor: c.border,
                }}
              >
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: c.brandLight, color: c.brand }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block" style={{ color: c.text }}>Quick Access Tip</span>
                  <span style={{ color: c.subText }}>Find the <strong style={{ color: c.text }}>Knowledgebase</strong> tab in the sidebar menu to search tutorials at any time!</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col sm:flex-row gap-3 mt-2">
                <button
                  onClick={() => handleCloseWelcomeModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border text-xs font-bold transition-all"
                  style={{
                    borderColor: c.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                    color: c.text,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.07)' : '#f9f9fa';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : '#ffffff';
                  }}
                >
                  Explore Dashboard
                </button>
                <button
                  onClick={() => handleCloseWelcomeModal(true)}
                  className="flex-1 px-4 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-orange-500/10 hover:shadow-orange-500/20"
                  style={{
                    backgroundColor: c.brand,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Take Me to Knowledgebase
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomerDashboard;
