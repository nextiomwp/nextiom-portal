import React, { useState, useEffect, useRef } from 'react';
import { Users, Globe, Server, Star, Bell, Plus, LogOut, Settings, LayoutDashboard, FileText, FileCheck, MessageSquare, Package, ClipboardList, ChevronRight, Loader2, Moon, Sun, CheckCircle, Menu, Receipt, CheckSquare, Megaphone, Activity, Mail, Home, Zap, ChevronLeft, Shield, UserCog, Briefcase, ExternalLink, RefreshCw, ChevronDown, Calendar, Database, Search, X } from 'lucide-react';
import InvoicesPage from '@/pages/invoices/InvoicesPage';
import NewInvoicePage from '@/pages/invoices/NewInvoicePage';
import EditInvoicePage from '@/pages/invoices/EditInvoicePage';
import InvoiceSettingsPage from '@/pages/invoices/InvoiceSettingsPage';
import QuotationsPage from '@/pages/quotations/QuotationsPage';
import QuotationForm from '@/components/quotations/QuotationForm';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import AdminCustomerManagement from '@/components/admin/AdminCustomerManagement';
import AdminNotificationManagement from '@/components/admin/AdminNotificationManagement';
import AdminApprovedHostings from '@/components/admin/AdminApprovedHostings';
import AdminDomainManagement from '@/components/admin/AdminDomainManagement';
import AdminRequestManagement from '@/components/admin/AdminRequestManagement';
import AdminHostingManagement from '@/components/admin/AdminHostingManagement';
import AdminHostingRequestManagement from '@/components/admin/AdminHostingRequestManagement';
import AdminEmailRequestManagement from '@/components/admin/AdminEmailRequestManagement';
import AdminApprovedEmails from '@/components/admin/AdminApprovedEmails';
import AddCustomerDialog from '@/components/dialogs/AddCustomerDialog';
import AddProductDialog from '@/components/dialogs/AddProductDialog';
import AssignProductDialog from '@/components/dialogs/AssignProductDialog';
import SettingsDialog from '@/components/dialogs/SettingsDialog';
import ProductList from '@/components/dashboard/ProductList';
import EmailLogList from '@/components/dashboard/EmailLogList';
import CustomerProfileAdminView from '@/components/admin/CustomerProfileAdminView';
import { getCustomers, getProducts, getLicenses, getStorageStats, getEmailLogs, getEmailRequests, getDomainRequests, getHostingRequests, getHostingPackages, getHostingPlans, getAdminNotifications, getUnreadTicketCount, updateCustomer, addNotification, deleteCustomer, getDomains, getAllTickets } from '@/lib/storage';
import AdminTicketsPage from '@/components/admin/AdminTicketsPage';
import AdminActivityLogPage from '@/components/admin/AdminActivityLogPage';
import MaintenanceModePage from '@/components/admin/MaintenanceModePage';
import AdminJobsPage from '@/components/admin/AdminJobsPage';
import AdminAgreementManagement from '@/components/admin/AdminAgreementManagement';
import SystemSettingsPage from '@/components/admin/SystemSettingsPage';
import SmsSettingsPage from '@/components/admin/SmsSettingsPage';
import AdminAppointmentsPage from '@/components/admin/AdminAppointmentsPage';
import AdminBackupPage from '@/components/admin/AdminBackupPage';
import { TodayAppointmentBanner, AppointmentReminderPopup } from '@/components/admin/AppointmentDashboardWidgets';
import { getAllAppointments } from '@/lib/appointments';
import { getInvoices } from '@/lib/invoices';

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

const OnProgressIcon = (props) => <CustomImageIcon src="/tasks.svg" alt="Jobs" {...props} size={25} />;
const AgreementIcon = (props) => <CustomImageIcon src="/deal.svg" alt="Agreement" {...props} size={25} />;
const DomainReqIcon = (props) => <CustomImageIcon src="/internet.svg" alt="Domain Requests" {...props} size={23} />;
const EmailReIcon = (props) => <CustomImageIcon src="/email.svg" alt="Email Requests" {...props} size={29} />;
const HostingReIcon = (props) => <CustomImageIcon src="/hostingRe.svg" alt="Hosting Requests" {...props} size={25} />;

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: Home, section: 'top' },
  { section: 'divider' },
  { section: 'header', label: 'CUSTOMERS' },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'logs', label: 'Support Tickets', icon: MessageSquare, badgeType: 'orange' },
  { id: 'jobs', label: 'Jobs', icon: OnProgressIcon },
  { id: 'notifications', label: 'Announcements', icon: Megaphone },
  { section: 'header', label: 'SERVICES' },
  // { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'hosting', label: 'Hosting', icon: Server },
  { id: 'products', label: 'Products', icon: Package },
  { section: 'header', label: 'REQUESTS' },
  { id: 'domainsRequests', label: 'Domain Requests', icon: DomainReqIcon, badgeType: 'orange' },
  { id: 'hostingRequests', label: 'Hosting Requests', icon: HostingReIcon, badgeType: 'orange' },
  { id: 'emailRequests', label: 'Email Requests', icon: EmailReIcon, badgeType: 'orange' },
  { section: 'header', label: 'ACTIVE SERVICES' },
  { id: 'approvedHostings', label: 'Active Domains', icon: CheckCircle, badgeType: 'green' },
  { id: 'activeHosting', label: 'Active Hosting', icon: CheckSquare, badgeType: 'green' },
  { id: 'approvedEmailsActive', label: 'Active Emails', icon: Mail, badgeType: 'green' },
  { section: 'header', label: 'BILLING' },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'agreements', label: 'Agreements', icon: AgreementIcon },
  { section: 'header', label: 'SYSTEM' },
  { id: 'maintenance', label: 'Maintenance', icon: Shield },
  { id: 'activityLog', label: 'Activity Logs', icon: Activity },
  { id: 'backup', label: 'Backup & Restore', icon: Database },
  // { id: 'adminManagement', label: 'Admin Management', icon: Shield },
  { id: 'systemSettings', label: 'System Settings', icon: Settings },
  { id: 'smsSettings', label: 'SMS Settings', icon: MessageSquare },
];

const ADMIN_INTERNAL_NOTIFICATION_TYPES = new Set([
  'admin_login',
  'admin_activity',
  'product_assigned',
  'delete',
  'request_updated',
  'customer_added',
  'customer_updated',
  'product_added',
  'product_updated',
  'license_updated',
  'ticket_closed',
  'portal_pause',
]);

const isAdminInternalNotification = (notification) => {
  const type = String(notification?.type || '').toLowerCase();
  if (ADMIN_INTERNAL_NOTIFICATION_TYPES.has(type)) return true;

  const text = `${notification?.title || ''} ${notification?.message || ''}`.toLowerCase();
  return text.startsWith('admin ') || text.includes(' administrator ');
};

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const play = () => {
      // Play a beautiful, modern double-tone chime
      const playTone = (freq, time, duration, volume) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(time);
        osc.stop(time + duration);
      };
      
      const now = ctx.currentTime;
      // Premium soft chime sound (C5 then E5)
      playTone(523.25, now, 0.4, 0.15);
      playTone(659.25, now + 0.10, 0.5, 0.15);
      
      // Close the context to release hardware resources and prevent the maximum contexts limit error
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 1000);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch((err) => {
        console.warn('Failed to resume AudioContext for notification sound:', err);
        ctx.close().catch(() => {});
      });
    } else {
      play();
    }
  } catch (err) {
    console.error('Failed to play notification sound:', err);
  }
};

const getInvoiceNoFromTitle = (title) => {
  if (!title) return null;
  const match = title.match(/(?:Payment Submitted|Payment Info Updated):\s*([A-Za-z0-9-]+)/i);
  if (match) return match[1];
  const genMatch = title.match(/(INV-[A-Za-z0-9-]+)/i);
  return genMatch ? genMatch[1] : null;
};

function Dashboard({ onLogout }) {
  const [active, setActive] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && (tab === 'appointments' || NAV.some(n => n.id === tab))) {
        return tab;
      }
    }
    return 'overview';
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailRequests, setEmailRequests] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0, totalDomains: 0, activeMemberships: 0, expiringSoon: 0, expired: 0 });
  const [requests, setRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [hostingPlans, setHostingPlans] = useState([]);
  const [activeEmailsCount, setActiveEmailsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1024px)').matches;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0); // 0 = off, seconds
  const [showAutoRefreshMenu, setShowAutoRefreshMenu] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const autoRefreshMenuRef = useRef(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAssignProductOpen, setIsAssignProductOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [markedReadAt, setMarkedReadAt] = useState(() => localStorage.getItem('adminNotifReadAt'));
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminNotifReadIds') || '[]'); } catch { return []; }
  });

  const readNotifIdsRef = useRef(readNotifIds);
  readNotifIdsRef.current = readNotifIds;
  const knownIdsRef = useRef(new Set());
  const loadDataRef = useRef();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = user.user_metadata || {};
      const metaAt = meta.admin_notif_read_at;
      const metaIds = meta.admin_notif_read_ids || [];
      if (metaAt && (!localStorage.getItem('adminNotifReadAt') || metaAt > localStorage.getItem('adminNotifReadAt'))) {
        localStorage.setItem('adminNotifReadAt', metaAt);
        setMarkedReadAt(metaAt);
      }
      if (metaIds.length) {
        setReadNotifIds(prev => {
          const merged = [...new Set([...prev, ...metaIds])];
          localStorage.setItem('adminNotifReadIds', JSON.stringify(merged));
          return merged;
        });
      }
    });
  }, []);
  const notifRef = useRef(null);
  const [invoiceView, setInvoiceView] = useState('list');
  const [editInvoiceId, setEditInvoiceId] = useState(null);
  const [highlightInvoiceNo, setHighlightInvoiceNo] = useState(null);
  const [highlightJobId, setHighlightJobId] = useState(null);
  const [highlightReqId, setHighlightReqId] = useState(null);
  const [quotationView, setQuotationView] = useState('list');
  const [editQuotationId, setEditQuotationId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [unreadTicketCount, setUnreadTicketCount] = useState(0);
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);

  // Search and deep-link states
  const [domains, setDomains] = useState([]);
  const [hostingPackages, setHostingPackages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [customerProfileTab, setCustomerProfileTab] = useState('products');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const searchBarRef = useRef(null);

  useEffect(() => {
    if (active !== 'invoices') { setInvoiceView('list'); setEditInvoiceId(null); }
    if (active !== 'quotations') { setQuotationView('list'); setEditQuotationId(null); }
    if (active !== 'customerProfile') setSelectedCustomer(null);
    if (active === 'invoices') markInvoicesRead();
    if (active !== 'logs') setSelectedTicketId(null);
  }, [active]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBadgeColor = (type) => {
    switch (type) {
      case 'Customer': return '#60a5fa';
      case 'Product': return '#a78bfa';
      case 'License': return '#c084fc';
      case 'Domain': return '#34d399';
      case 'Domain Request': return '#fbbf24';
      case 'Hosting': return '#10b981';
      case 'Hosting Request': return '#f59e0b';
      case 'Email': return '#f472b6';
      case 'Ticket': return '#f87171';
      case 'Invoice': return '#2dd4bf';
      default: return '#9ca3af';
    }
  };

  const getSearchResults = (query) => {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const results = [];

    // 1. Customers
    customers.forEach(cust => {
      const name = cust.name || '';
      const email = cust.email || '';
      const company = cust.company || '';
      const phone = cust.phone || '';
      if (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        company.toLowerCase().includes(q) ||
        phone.includes(q)
      ) {
        results.push({
          type: 'Customer',
          title: name,
          subtitle: `${email} ${company ? `· ${company}` : ''}`,
          onClick: () => {
            setSelectedCustomer(cust);
            setCustomerProfileTab('products');
            navigateTo('customerProfile');
          }
        });
      }
    });

    // 2. Products
    products.forEach(prod => {
      const name = prod.name || '';
      const desc = prod.description || '';
      const category = prod.category || '';
      if (
        name.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'Product',
          title: name,
          subtitle: `${category ? `${category} · ` : ''}Rs. ${prod.price || 0}`,
          onClick: () => {
            navigateTo('products');
          }
        });
      }
    });

    // 3. Assigned Products (Licenses)
    licenses.forEach(lic => {
      const key = lic.license_key || '';
      const prodName = lic.name || lic.products?.name || '';
      if (key.toLowerCase().includes(q) || prodName.toLowerCase().includes(q)) {
        const cust = customers.find(c => c.id === lic.customer_id);
        const custName = cust ? cust.name : 'Unknown Customer';
        results.push({
          type: 'License',
          title: prodName,
          subtitle: `Key: ${key.slice(0, 12)}... · Customer: ${custName}`,
          onClick: () => {
            if (cust) {
              setSelectedCustomer(cust);
              setCustomerProfileTab('products');
              navigateTo('customerProfile');
            } else {
              navigateTo('products');
            }
          }
        });
      }
    });

    // 4. Domains (Active Domains)
    domains.forEach(dom => {
      const name = dom.domain_name || '';
      const registrar = dom.registrar || '';
      if (name.toLowerCase().includes(q) || registrar.toLowerCase().includes(q)) {
        const cust = customers.find(c => c.id === dom.customer_id);
        const custName = cust ? cust.name : 'Unknown Customer';
        results.push({
          type: 'Domain',
          title: name,
          subtitle: `Active Domain · Customer: ${custName}`,
          onClick: () => {
            if (cust) {
              setSelectedCustomer(cust);
              setCustomerProfileTab('domains');
              navigateTo('customerProfile');
            } else {
              navigateTo('approvedHostings');
            }
          }
        });
      }
    });

    // 5. Domain Requests
    requests.forEach(req => {
      if (req.source === 'domain') {
        const name = req.domain_name || '';
        if (name.toLowerCase().includes(q)) {
          const cust = customers.find(c => c.id === req.customer_id);
          const custName = cust ? cust.name : req.n || 'Unknown Customer';
          results.push({
            type: 'Domain Request',
            title: name,
            subtitle: `Status: ${req.status || 'Pending'} · Customer: ${custName}`,
            onClick: () => {
              if (cust) {
                setSelectedCustomer(cust);
                setCustomerProfileTab('domains');
                navigateTo('customerProfile');
              } else {
                navigateTo('domainsRequests');
              }
            }
          });
        }
      }
    });

    // 6. Hosting Packages (Active hosting)
    hostingPackages.forEach(pkg => {
      const dom = pkg.domain || '';
      const plan = pkg.plan_name || '';
      const type = pkg.hosting_type || '';
      if (dom.toLowerCase().includes(q) || plan.toLowerCase().includes(q) || type.toLowerCase().includes(q)) {
        const cust = customers.find(c => c.id === pkg.customer_id);
        const custName = cust ? cust.name : 'Unknown Customer';
        results.push({
          type: 'Hosting',
          title: dom,
          subtitle: `${plan} (${type}) · Customer: ${custName}`,
          onClick: () => {
            if (cust) {
              setSelectedCustomer(cust);
              setCustomerProfileTab('hosting');
              navigateTo('customerProfile');
            } else {
              navigateTo('activeHosting');
            }
          }
        });
      }
    });

    // 7. Hosting Requests
    requests.forEach(req => {
      if (req.source === 'hosting') {
        const dom = req.domain_name || '';
        const plan = req.plan_name || '';
        if (dom.toLowerCase().includes(q) || plan.toLowerCase().includes(q)) {
          const cust = customers.find(c => c.id === req.customer_id);
          const custName = cust ? cust.name : req.n || 'Unknown Customer';
          results.push({
            type: 'Hosting Request',
            title: dom || plan,
            subtitle: `Status: ${req.status || 'Pending'} · Customer: ${custName}`,
            onClick: () => {
              if (cust) {
                setSelectedCustomer(cust);
                setCustomerProfileTab('hosting');
                navigateTo('customerProfile');
              } else {
                navigateTo('hostingRequests');
              }
            }
          });
        }
      }
    });

    // 8. Email Requests
    emailRequests.forEach(req => {
      const email = req.email_address || req.email || '';
      if (email.toLowerCase().includes(q)) {
        const cust = customers.find(c => c.id === req.customer_id);
        const custName = cust ? cust.name : 'Unknown Customer';
        results.push({
          type: 'Email',
          title: email,
          subtitle: `Status: ${req.status || 'Active'} · Customer: ${custName}`,
          onClick: () => {
            if (cust) {
              setSelectedCustomer(cust);
              setCustomerProfileTab('emails');
              navigateTo('customerProfile');
            } else {
              navigateTo('emailRequests');
            }
          }
        });
      }
    });

    // 9. Tickets
    tickets.forEach(ticket => {
      const subject = ticket.subject || '';
      const desc = ticket.description || '';
      const tId = String(ticket.id || '');
      if (subject.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || tId.toLowerCase().includes(q)) {
        const cust = customers.find(c => c.id === ticket.customer_id);
        const custName = cust ? cust.name : 'Unknown Customer';
        results.push({
          type: 'Ticket',
          title: subject,
          subtitle: `Ticket #${tId.slice(0, 8)}... · Customer: ${custName}`,
          onClick: () => {
            setSelectedTicketId(ticket.id);
            navigateTo('logs');
          }
        });
      }
    });

    // 10. Invoices
    invoices.forEach(inv => {
      const invNo = inv.invoice_no || '';
      const client = inv.client_name || '';
      const email = inv.client_email || '';
      if (invNo.toLowerCase().includes(q) || client.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
        results.push({
          type: 'Invoice',
          title: `Invoice ${invNo}`,
          subtitle: `Client: ${client} · Total: ${inv.currency} ${inv.total} (${inv.status})`,
          onClick: () => {
            setEditInvoiceId(inv.id);
            setInvoiceView('edit');
            navigateTo('invoices');
          }
        });
      }
    });

    return results.slice(0, 15);
  };
  const { toast } = useToast();
  const { signOut } = useAuth();

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const handleChange = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) setIsMobileSidebarOpen(false);
    };

    handleChange(media);
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const navigateTo = (tabId) => {
    setActive(tabId);
    setIsMobileSidebarOpen(false);
  };

  const c = isDark
    ? { bg: '#15161A', sidebar: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0', card: '#1C1E24', panel2: '#22252C', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)' }
    : { bg: '#f8f8f7', sidebar: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0', text: '#1a1a1a', subText: '#888', card: '#fff', panel2: '#f5f5f5', hover: '#f5f5f5', brand: 'var(--brand-color)' };

  useEffect(() => {
    loadData();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      addNotification({
        customer_id: null,
        type: 'admin_login',
        title: `Admin Login`,
        message: `Admin signed in as ${user.email}`,
      }).catch(() => { });
    });
  }, []);

  useEffect(() => {
    console.log('[AdminRealtime] Setting up realtime subscription for dashboard...');
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('[AdminRealtime] Received notifications change:', payload);
          // If it's a notification for admins (customer_id is null)
          if (!payload.new || payload.new.customer_id === null) {
            loadDataRef.current?.(false, true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload) => {
          console.log('[AdminRealtime] Received customers change:', payload);
          loadDataRef.current?.(false, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domain_requests' },
        (payload) => {
          console.log('[AdminRealtime] Received domain_requests change:', payload);
          loadDataRef.current?.(false, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hosting_requests' },
        (payload) => {
          console.log('[AdminRealtime] Received hosting_requests change:', payload);
          loadDataRef.current?.(false, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_requests' },
        (payload) => {
          console.log('[AdminRealtime] Received email_requests change:', payload);
          loadDataRef.current?.(false, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('[AdminRealtime] Received appointments change:', payload);
          loadDataRef.current?.(false, true);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('[AdminRealtime] Subscription error:', err);
        } else {
          console.log('[AdminRealtime] Subscription status:', status);
        }
      });

    // Polling fallback to ensure dashboard stays in sync even if websocket drops
    const interval = setInterval(() => {
      console.log('[AdminRealtime] Running background polling refresh...');
      loadDataRef.current?.(false, true);
    }, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);


  useEffect(() => {
    document.documentElement.classList.toggle('dashboard-dark', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== active) {
        url.searchParams.set('tab', active);
        window.history.pushState({}, '', url.toString());
      }
    }
  }, [active]);

  const loadData = async (isManualRefresh = false, isBackground = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else if (!isBackground) {
      setIsLoading(true);
    }
    try {
      const [cus, prd, lic, sts, lgs, emailReqs, domReq, hostReq, hostPkg, adminN, hostPlans, doms, tkts, invs] = await Promise.all([
        getCustomers(), getProducts(), getLicenses(), getStorageStats(), getEmailLogs(), getEmailRequests(), getDomainRequests(), getHostingRequests(), getHostingPackages(), getAdminNotifications(), getHostingPlans(),
        getDomains().catch(() => []), getAllTickets().catch(() => []), getInvoices().catch(() => [])
      ]);
      
      const domainReqRows = (domReq || []).map(r => ({
        ...r,
        source: 'domain',
        reqType: 'Domain request',
        n: r.customers?.name || 'Unknown',
        detailsLabel: r.domain_name || '-'
      }));
      const hostingReqRows = (hostReq || []).map(r => ({
        ...r,
        source: 'hosting',
        reqType: 'Hosting request',
        n: r.customers?.name || 'Unknown',
        detailsLabel: r.plan_name || r.package_type?.split('|')[0]?.trim() || '-'
      }));

      const emailReqRows = (emailReqs || []).map(r => ({
        ...r,
        source: 'email',
        reqType: 'Email request',
        n: r.customers?.name || 'Unknown',
        detailsLabel: r.email || '-'
      }));
      const allReq = [...domainReqRows, ...hostingReqRows, ...emailReqRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const pendingReqRows = allReq.filter(r => String(r.status || '').toLowerCase() === 'pending');

      // Check for new unread notifications/requests/customers and play sound
      const fetchedIds = new Set([
        ...(cus || []).map(c => 'cust_' + c.id),
        ...(allReq || []).map(r => r.id),
        ...(adminN || []).map(n => 'notif_' + n.id)
      ]);

      if (knownIdsRef.current.size > 0) {
        let hasNewUnread = false;

        // check pending customers
        for (const c of (cus || [])) {
          if (c.status === 'pending' && !knownIdsRef.current.has('cust_' + c.id) && !readNotifIdsRef.current.includes('cust_' + c.id)) {
            hasNewUnread = true;
            break;
          }
        }

        // check pending requests
        if (!hasNewUnread) {
          for (const r of pendingReqRows) {
            if (r.id && !knownIdsRef.current.has(r.id) && !readNotifIdsRef.current.includes(r.id)) {
              hasNewUnread = true;
              break;
            }
          }
        }

        // check admin notifications
        if (!hasNewUnread) {
          const adminNotifsForDropdown = (adminN || []).filter(n => !isAdminInternalNotification(n));
          for (const n of adminNotifsForDropdown) {
            if (n.id && !knownIdsRef.current.has('notif_' + n.id) && !readNotifIdsRef.current.includes('notif_' + n.id)) {
              hasNewUnread = true;
              break;
            }
          }
        }

        if (hasNewUnread) {
          playNotificationSound();
        }
      }

      // Update the known IDs
      for (const id of fetchedIds) {
        if (id) knownIdsRef.current.add(id);
      }

      setAdminNotifs(adminN || []);
      const utc = await getUnreadTicketCount().catch(() => 0);
      setUnreadTicketCount(utc);

      const allApts = await getAllAppointments().catch(() => []);
      const pendingApts = allApts.filter(a => a.status === 'pending' && !a.is_fake).length;
      setPendingAppointmentsCount(pendingApts);
      setCustomers(cus || []); setProducts(prd || []); setLicenses(lic || []);
      setStats(sts || {}); setEmailLogs(lgs || []);
      setEmailRequests(emailReqs || []);
      setRequests(allReq);
      setPendingRequests(pendingReqRows);
      setPendingRequestsCount(pendingReqRows.length);
      setHostingPlans(hostPlans || []);
      setDomains(doms || []);
      setHostingPackages(hostPkg || []);
      setTickets(tkts || []);
      setInvoices(invs || []);
      const approvedEmailStatuses = new Set(['approved', 'active', 'completed', 'expired']);
      const activeEmails = (emailReqs || []).filter(r => approvedEmailStatuses.has(String(r.status || '').toLowerCase()));
      setActiveEmailsCount(activeEmails.length);
      // Bump refreshKey so child components that accept it re-render
      setRefreshKey(k => k + 1);
      const now = new Date();
      setLastRefreshed(now);
      if (isManualRefresh) {
        toast({
          title: '✓ Dashboard data refreshed successfully',
          description: `Last updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  loadDataRef.current = loadData;

  const pendingCustomers = customers.filter(c => c.status === 'pending');

  const handleMarkAllRead = () => {
    const allIds = [
      ...pendingRequests.map(r => r.id),
      ...pendingCustomers.map(c => 'cust_' + c.id),
      ...adminNotifsForDropdown.map(n => 'notif_' + n.id)
    ].filter(Boolean);
    const next = [...new Set([...readNotifIds, ...allIds])];
    setReadNotifIds(next);
    localStorage.setItem('adminNotifReadIds', JSON.stringify(next));
    const now = new Date().toISOString();
    localStorage.setItem('adminNotifReadAt', now);
    setMarkedReadAt(now);
    setIsNotificationsOpen(false);
    // Cap stored IDs at 200 to prevent JWT bloat (>8KB header → nginx 400)
    const MAX_STORED_IDS = 200;
    const cappedNext = next.slice(-MAX_STORED_IDS);
    supabase.auth.updateUser({ data: { admin_notif_read_at: now, admin_notif_read_ids: cappedNext } });
  };

  const markNotifRead = (id) => {
    if (!id || readNotifIds.includes(id)) return;
    const next = [...readNotifIds, id];
    setReadNotifIds(next);
    localStorage.setItem('adminNotifReadIds', JSON.stringify(next));
    // Cap stored IDs at 200 to prevent JWT bloat (>8KB header → nginx 400)
    const MAX_STORED_IDS = 200;
    const cappedNext = next.slice(-MAX_STORED_IDS);
    supabase.auth.updateUser({ data: { admin_notif_read_ids: cappedNext } });
  };

  // Show only customer/system-facing admin notifications in dropdown
  const allAdminNotifs = (adminNotifs || []);
  // Keep internal admin actions in Activity Logs, not in admin notification UI
  const adminNotifsForDropdown = allAdminNotifs.filter(n =>
    !isAdminInternalNotification(n)
  );
  const unreadCount = [
    ...pendingRequests.filter(r => r.id && !readNotifIds.includes(r.id)),
    ...pendingCustomers.filter(c => c.id && !readNotifIds.includes('cust_' + c.id)),
    ...adminNotifsForDropdown.filter(n => n.id && !readNotifIds.includes('notif_' + n.id)),
  ].length;

  const markInvoicesRead = () => {
    const invoiceNotifs = allAdminNotifs.filter(n => n.type === 'payment_submitted');
    const ids = invoiceNotifs.map(n => 'notif_' + n.id).filter(Boolean);
    if (!ids.length) return;
    const next = [...new Set([...readNotifIds, ...ids])];
    setReadNotifIds(next);
    localStorage.setItem('adminNotifReadIds', JSON.stringify(next));
    // Cap stored IDs at 200 to prevent JWT bloat (>8KB header → nginx 400)
    const MAX_STORED_IDS = 200;
    const cappedNext = next.slice(-MAX_STORED_IDS);
    supabase.auth.updateUser({ data: { admin_notif_read_ids: cappedNext } });
  };

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNotificationsOpen]);

  // Close auto-refresh menu on outside click
  useEffect(() => {
    if (!showAutoRefreshMenu) return;
    const handler = (e) => {
      if (autoRefreshMenuRef.current && !autoRefreshMenuRef.current.contains(e.target)) {
        setShowAutoRefreshMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAutoRefreshMenu]);

  // Auto-refresh ticker
  useEffect(() => {
    if (!autoRefreshInterval) return;
    const id = setInterval(() => {
      loadData(false, true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(id);
  }, [autoRefreshInterval]);

  const handleLogout = async () => {
    await signOut();
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    const notifReadAt = localStorage.getItem('adminNotifReadAt');
    const notifReadIds = localStorage.getItem('adminNotifReadIds');
    const invoiceTemplates = localStorage.getItem('nxt_invoice_templates');
    sessionStorage.clear(); localStorage.clear();
    if (notifReadAt) localStorage.setItem('adminNotifReadAt', notifReadAt);
    if (notifReadIds) localStorage.setItem('adminNotifReadIds', notifReadIds);
    if (invoiceTemplates) localStorage.setItem('nxt_invoice_templates', invoiceTemplates);
    window.location.replace('/');
  };

  const handleConfirmCustomer = async (cu) => {
    try {
      await updateCustomer(cu.id, { status: 'active' });
      await addNotification({
        customer_id: cu.id,
        type: 'account_confirmed',
        title: 'Account Confirmed',
        message: 'Your account has been confirmed. You can now sign in to the portal.',
      });
      toast({ title: 'Confirmed', description: `${cu.name}'s account has been confirmed.` });
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to confirm account.', variant: 'destructive' });
    }
  };

  const handleRejectCustomer = async (cu) => {
    try {
      await deleteCustomer(cu.id);
      toast({ title: 'Rejected & Deleted', description: `${cu.name}'s account has been rejected and deleted.` });
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to reject and delete account.', variant: 'destructive' });
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
    switch (active) {
      case 'overview': return <OverviewContent stats={stats} customers={customers} requests={requests} hostingPlans={hostingPlans} pendingRequestsCount={pendingRequestsCount} onNavigate={navigateTo} onViewCustomer={cu => { setSelectedCustomer(cu); navigateTo('customerProfile'); }} onConfirmCustomer={handleConfirmCustomer} onRejectCustomer={handleRejectCustomer} c={c} isDark={isDark} isMobile={isMobile} />;
      case 'adminProfile': return <AdminProfileContent c={c} isDark={isDark} />;
      case 'customerProfile': return selectedCustomer ? <CustomerProfileAdminView customer={selectedCustomer} onBack={() => navigateTo('overview')} isDark={isDark} onNavigate={navigateTo} initialTab={customerProfileTab} /> : null;
      case 'adminNotifications': return (
        <AllAdminNotificationsPage 
          notifications={adminNotifs} 
          requests={requests} 
          customers={customers} 
          onNavigate={navigateTo} 
          c={c} 
          isDark={isDark} 
          isMobile={isMobile} 
          markNotifRead={markNotifRead}
          setHighlightInvoiceNo={setHighlightInvoiceNo}
          setInvoiceView={setInvoiceView}
          setEditInvoiceId={setEditInvoiceId}
          setHighlightJobId={setHighlightJobId}
          setHighlightReqId={setHighlightReqId}
        />
      );
      case 'customers': return <AdminCustomerManagement key={refreshKey} products={products} onSuccess={loadData} isDark={isDark} onNavigate={navigateTo} />;
      case 'domains': return <AdminDomainManagement key={refreshKey} isDark={isDark} />;
      case 'approvedHostings': return <AdminDomainManagement key={refreshKey} isDark={isDark} />;
      case 'hosting': return <AdminHostingManagement key={refreshKey} isDark={isDark} isMobile={isMobile} />;
      case 'hostingRequests': return <AdminHostingRequestManagement key={refreshKey} isDark={isDark} />;
      case 'domainsRequests': return <AdminRequestManagement key={refreshKey} isDark={isDark} />;
      case 'products': return <ProductList key={refreshKey} products={products} licenses={licenses} customers={customers} onUpdate={loadData} isDark={isDark} c={c} />;
      case 'notifications': return <AdminNotificationManagement key={refreshKey} isDark={isDark} isMobile={isMobile} />;
      case 'logs': return <AdminTicketsPage key={refreshKey} c={c} isDark={isDark} isMobile={isMobile} initialTicketId={selectedTicketId} />;
      case 'appointments': return <AdminAppointmentsPage key={refreshKey} c={c} isDark={isDark} isMobile={isMobile} />;
      case 'jobs': return (
        <AdminJobsPage 
          key={refreshKey} 
          c={c} 
          isDark={isDark} 
          isMobile={isMobile} 
          highlightJobId={highlightJobId}
          highlightReqId={highlightReqId}
          clearHighlightJobId={() => {
            setHighlightJobId(null);
            setHighlightReqId(null);
          }}
        />
      );
      case 'invoices': {
        const goList = () => { setEditInvoiceId(null); setInvoiceView('list'); };
        if (invoiceView === 'new') return <NewInvoicePage c={c} isDark={isDark} onBack={goList} />;
        if (invoiceView === 'edit' && editInvoiceId) return <EditInvoicePage c={c} isDark={isDark} invoiceId={editInvoiceId} onBack={goList} />;
        if (invoiceView === 'settings') return <InvoiceSettingsPage c={c} isDark={isDark} onBack={goList} />;
        return (
          <InvoicesPage 
            key={refreshKey} 
            c={c} 
            isDark={isDark} 
            isMobile={isMobile}
            highlightInvoiceNo={highlightInvoiceNo}
            clearHighlightInvoiceNo={() => setHighlightInvoiceNo(null)}
            onNew={() => setInvoiceView('new')} 
            onEdit={id => { setEditInvoiceId(id); setInvoiceView('edit'); }} 
            onSettings={() => setInvoiceView('settings')} 
          />
        );
      }
      case 'quotations': {
        const goList = () => { setEditQuotationId(null); setQuotationView('list'); };
        if (quotationView === 'new') return <QuotationForm c={c} isDark={isDark} onBack={goList} />;
        if (quotationView === 'edit' && editQuotationId) return <QuotationForm c={c} isDark={isDark} existingId={editQuotationId} onBack={goList} />;
        return <QuotationsPage key={refreshKey} c={c} isDark={isDark} onNew={() => setQuotationView('new')} onEdit={id => { setEditQuotationId(id); setQuotationView('edit'); }} />;
      }
      case 'maintenance': return <MaintenanceModePage key={refreshKey} isDark={isDark} />;
      case 'activityLog': return <AdminActivityLogPage key={refreshKey} isDark={isDark} />;
      case 'backup': return <AdminBackupPage key={refreshKey} isDark={isDark} />;
      case 'agreements': return <AdminAgreementManagement isDark={isDark} />;
      case 'emailRequests': return <AdminEmailRequestManagement key={refreshKey} isDark={isDark} />;
      case 'approvedEmailsActive': return <AdminApprovedEmails key={refreshKey} isDark={isDark} />;
      case 'activeHosting': return <AdminApprovedHostings key={refreshKey} isDark={isDark} />;
      case 'adminManagement': return <div style={{ padding: 32, color: c.subText, textAlign: 'center', fontSize: 13 }}>Admin management page coming soon.</div>;
      case 'systemSettings': return <SystemSettingsPage key={refreshKey} isDark={isDark} />;
      case 'smsSettings': return <SmsSettingsPage key={refreshKey} isDark={isDark} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', background: isDark ? '#0f1013' : '#f0f0f2', color: c.text, fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden', position: 'relative' }}>
      {/* Background Glassmorphism Gradients */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '45%', height: '45%', borderRadius: '50%', background: `${c.brand}15`, filter: 'blur(110px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '55%', height: '55%', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', filter: 'blur(130px)', zIndex: 0, pointerEvents: 'none' }} />

      {!isMobile && (
        <div
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          style={{
            width: sidebarOpen ? 240 : 80,
            background: isDark
              ? (isSidebarHovered ? 'rgba(28, 30, 36, 0.75)' : 'rgba(28, 30, 36, 0.55)')
              : (isSidebarHovered ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.55)'),
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRight: `1px solid ${isDark ? (isSidebarHovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)') : (isSidebarHovered ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)')}`,
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.25s ease',
            zIndex: 10,
            flexShrink: 0,
            boxShadow: isSidebarHovered ? '4px 0 24px rgba(0,0,0,0.12)' : 'none'
          }}
        >
          <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: c.brand, fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{sidebarOpen ? 'NEXTIOM' : 'ex'}</div>
              {sidebarOpen && <span style={{ color: c.subText, fontSize: 14 }}>Admin</span>}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              onMouseEnter={() => setIsToggleHovered(true)}
              onMouseLeave={() => setIsToggleHovered(false)}
              style={{
                background: isToggleHovered ? c.hover : 'none',
                border: 'none',
                color: isToggleHovered ? c.brand : c.subText,
                cursor: 'pointer',
                display: 'flex',
                padding: 4,
                borderRadius: 6,
                transition: 'all 0.2s'
              }}
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
            {NAV.map((item, i) => {
              if (item.section === 'divider') return <div key={`div-${i}`} style={{ height: 12 }} />;
              if (item.section === 'header') {
                if (!sidebarOpen) return <div key={`h-${i}`} style={{ height: 4 }} />;
                return <div key={`h-${i}`} style={{ fontSize: 10, color: 'var(--brand-color)', padding: '0 12px 8px', fontWeight: 700, letterSpacing: 1, marginTop: i > 0 ? 4 : 0 }}>{item.label}</div>;
              }
              const isItem = item;
              let badge = 0;
              let dot = false;
              let badgeColor = c.brand;
              if (isItem.badgeType === 'orange' || isItem.id === 'logs') {
                if (isItem.id === 'logs') { badge = unreadTicketCount; badgeColor = c.brand; }
                else if (isItem.id === 'domainsRequests') { badge = pendingRequests.filter(r => r.source === 'domain').length; }
                else if (isItem.id === 'hostingRequests') { badge = pendingRequests.filter(r => r.source === 'hosting').length; }
                else if (isItem.id === 'emailRequests') {
                  badge = (emailRequests || []).filter(e => String(e.status || '').toLowerCase() === 'pending').length;
                }
              }
              if (isItem.badgeType === 'green') {
                badgeColor = '#16a34a';
                if (isItem.id === 'approvedHostings') { badge = requests.filter(r => r.source === 'domain' && (String(r.status).toLowerCase() === 'approved' || String(r.status).toLowerCase() === 'expired')).length; }
                else if (isItem.id === 'activeHosting') { badge = requests.filter(r => r.source === 'hosting' && (String(r.status || '').toLowerCase() === 'approved' || String(r.status || '').toLowerCase() === 'expired')).length; }
                else if (isItem.id === 'approvedEmailsActive') { badge = activeEmailsCount; }
              }
              if (isItem.id === 'invoices') {
                dot = allAdminNotifs.filter(n => n.type === 'payment_submitted' && !readNotifIds.includes('notif_' + n.id)).length > 0;
              }
              return <NavItem key={isItem.id} item={isItem} active={active} setActive={setActive} open={sidebarOpen} c={c} badge={badge} badgeColor={badgeColor} dot={dot} />;
            })}
          </div>
          <div style={{ padding: '16px 12px', borderTop: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 12, padding: sidebarOpen ? '12px' : '12px 0', background: c.bg, borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>A</div>
              {sidebarOpen && <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Admin</div>
                <div style={{ fontSize: 11, color: c.subText, textOverflow: 'ellipsis', overflow: 'hidden' }}>info@nextiom.com</div>
              </div>}
            </div>
            <div style={{ display: 'flex', flexDirection: sidebarOpen ? 'row' : 'column', gap: 8, marginTop: 12 }}>
              <button onClick={() => setActive('systemSettings')} style={{ display: 'flex', justifyContent: 'center', background: c.hover, border: 'none', color: c.text, padding: 8, borderRadius: 8, cursor: 'pointer', flex: 1 }} title="System Settings">
                <Settings size={16} />
              </button>
              <button onClick={handleLogout} style={{ display: 'flex', justifyContent: 'center', background: c.hover, border: 'none', color: c.brand, padding: 8, borderRadius: 8, cursor: 'pointer', flex: 1 }}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {isMobile && isMobileSidebarOpen && (
        <>
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 29, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'fixed', inset: '0 auto 0 0', width: 288, maxWidth: '88vw',
            background: isDark ? 'rgba(28, 30, 36, 0.65)' : 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            display: 'flex', flexDirection: 'column', zIndex: 30,
            boxShadow: '8px 0 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: c.brand, fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>NEXTIOM</div>
                <span style={{ color: c.subText, fontSize: 14 }}>Admin</span>
              </div>
              <button onClick={() => setIsMobileSidebarOpen(false)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', display: 'flex', padding: 2 }}>
                <ChevronLeft size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
              {NAV.map((item, i) => {
                if (item.section === 'divider') return <div key={`mdiv-${i}`} style={{ height: 12 }} />;
                if (item.section === 'header') return <div key={`mh-${i}`} style={{ fontSize: 10, color: 'var(--brand-color)', padding: '0 12px 8px', fontWeight: 700, letterSpacing: 1, marginTop: i > 0 ? 4 : 0 }}>{item.label}</div>;
                let badge = 0;
                let dot = false;
                let badgeColor = c.brand;
                if (item.badgeType === 'orange' || item.id === 'logs') {
                  if (item.id === 'logs') { badge = unreadTicketCount; badgeColor = c.brand; }
                  else if (item.id === 'domainsRequests') { badge = pendingRequests.filter(r => r.source === 'domain').length; }
                  else if (item.id === 'hostingRequests') { badge = pendingRequests.filter(r => r.source === 'hosting').length; }
                  else if (item.id === 'emailRequests') { badge = (emailRequests || []).filter(e => String(e.status || '').toLowerCase() === 'pending').length; }
                }
                if (item.badgeType === 'green') {
                  badgeColor = '#16a34a';
                  if (item.id === 'approvedHostings') { badge = requests.filter(r => r.source === 'domain' && (String(r.status).toLowerCase() === 'approved' || String(r.status).toLowerCase() === 'expired')).length; }
                  else if (item.id === 'activeHosting') { badge = requests.filter(r => r.source === 'hosting' && (String(r.status || '').toLowerCase() === 'approved' || String(r.status || '').toLowerCase() === 'expired')).length; }
                  else if (item.id === 'approvedEmailsActive') { badge = activeEmailsCount; }
                }
                if (item.id === 'invoices') {
                  dot = allAdminNotifs.filter(n => n.type === 'payment_submitted' && !readNotifIds.includes('notif_' + n.id)).length > 0;
                }
                return <NavItem key={item.id} item={item} active={active} setActive={navigateTo} open={true} c={c} badge={badge} badgeColor={badgeColor} dot={dot} onSelectMobile={() => setIsMobileSidebarOpen(false)} />;
              })}
            </div>
            <div style={{ padding: '16px 12px', borderTop: `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: c.bg, borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>A</div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Admin</div>
                  <div style={{ fontSize: 11, color: c.subText, textOverflow: 'ellipsis', overflow: 'hidden' }}>info@nextiom.com</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => navigateTo('systemSettings')} style={{ display: 'flex', justifyContent: 'center', background: c.hover, border: 'none', color: c.text, padding: 8, borderRadius: 8, cursor: 'pointer', flex: 1 }} title="System Settings">
                  <Settings size={16} />
                </button>
                <button onClick={handleLogout} style={{ display: 'flex', justifyContent: 'center', background: c.hover, border: 'none', color: c.brand, padding: 8, borderRadius: 8, cursor: 'pointer', flex: 1 }}>
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1 }} className={isDark ? 'dashboard-dark' : ''}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: isMobile ? '12px 16px' : '20px 32px',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          background: isDark ? 'rgba(21, 22, 26, 0.35)' : 'rgba(248, 248, 247, 0.35)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          position: 'relative',
          zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button onClick={() => (isMobile ? setIsMobileSidebarOpen(true) : setSidebarOpen(!sidebarOpen))} style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Menu size={20} />
            </button>
            <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {active === 'appointments' ? 'Appointments' : (NAV.find(n => n.id === active)?.label || 'Dashboard')}
            </div>
          </div>

          {/* Middle Search Bar */}
          {!isMobile && (
            <div ref={searchBarRef} style={{
              flex: 1,
              maxWidth: 400,
              position: 'relative',
              zIndex: 50
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                borderRadius: '50px',
                padding: '4px 16px',
                transition: 'all 0.25s ease',
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = c.brand;
                e.currentTarget.style.boxShadow = `0 0 10px rgba(232, 123, 53, 0.2)`;
                setIsSearchFocused(true);
              }}
              >
                <Search size={16} style={{ color: c.subText, marginRight: 8, flexShrink: 0 }} />
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search anywhere..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: c.text,
                    fontSize: 13,
                    width: '100%',
                    outline: 'none',
                    padding: '4px 0',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: c.subText,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {searchQuery.trim().length >= 2 && isSearchFocused && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  background: c.card,
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: 12,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                  maxHeight: 350,
                  overflowY: 'auto',
                  zIndex: 100,
                  marginTop: 4,
                  padding: '6px 0'
                }}>
                  {getSearchResults(searchQuery).length === 0 ? (
                    <div style={{ padding: '12px 16px', color: c.subText, fontSize: 13, textAlign: 'center' }}>
                      No matches found for "{searchQuery}"
                    </div>
                  ) : (
                    getSearchResults(searchQuery).map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          result.onClick();
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          transition: 'background 0.15s ease',
                          borderBottom: idx < getSearchResults(searchQuery).length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}` : 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{result.title}</span>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: getBadgeColor(result.type) + '22',
                            color: getBadgeColor(result.type),
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}>
                            {result.type}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: c.subText }}>{result.subtitle}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: isMobile ? 'auto' : '0' }}>

            {/* ── Refresh Button + Auto-refresh ── */}
            <div ref={autoRefreshMenuRef} style={{ display: 'flex', alignItems: 'center', gap: 0, position: isMobile ? 'static' : 'relative' }}>
              {/* Main pill wrapper — glowing neon border */}
              <div style={{
                display: 'flex', alignItems: 'stretch',
                borderRadius: 50,
                background: isDark
                  ? 'linear-gradient(135deg, #2a1f14 0%, #1e1810 50%, #2a1f14 100%)'
                  : 'linear-gradient(135deg, #fff5ee 0%, #fde9d5 50%, #fff5ee 100%)',
                boxShadow: isRefreshing
                  ? `0 0 0 1.5px ${c.brand}, 0 0 14px 4px rgba(232,123,53,0.55), 0 0 28px 8px rgba(232,123,53,0.25), inset 0 1px 0 rgba(255,255,255,0.06)`
                  : isDark
                    ? `0 0 0 1.5px rgba(232,123,53,0.65), 0 0 10px 2px rgba(232,123,53,0.30), 0 0 22px 6px rgba(232,123,53,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`
                    : `0 0 0 1.5px rgba(232,123,53,0.50), 0 0 8px 2px rgba(232,123,53,0.20), inset 0 1px 0 rgba(255,255,255,0.5)`,
                transition: 'box-shadow 0.3s ease',
                overflow: 'hidden',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                opacity: isRefreshing ? 0.82 : 1,
              }}>
                {/* Left: icon + label */}
                <button
                  id="admin-refresh-btn"
                  title="Refresh Dashboard Data"
                  onClick={() => loadData(true)}
                  disabled={isRefreshing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 7,
                    background: 'transparent',
                    border: 'none',
                    color: c.brand,
                    padding: isMobile ? '8px 12px' : '8px 16px 8px 18px',
                    fontSize: 13, fontWeight: 700,
                    cursor: isRefreshing ? 'not-allowed' : 'pointer',
                    letterSpacing: 0.3,
                    whiteSpace: 'nowrap',
                    textShadow: isDark ? `0 0 8px rgba(232,123,53,0.7)` : 'none',
                  }}
                >
                  <RefreshCw
                    size={15}
                    style={{
                      filter: isDark ? `drop-shadow(0 0 4px rgba(232,123,53,0.8))` : 'none',
                      animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none',
                      flexShrink: 0,
                    }}
                  />
                  {!isMobile && (
                    <span style={{ textShadow: isDark ? `0 0 10px rgba(232,123,53,0.6)` : 'none' }}>
                      {isRefreshing ? 'Refreshing…' : 'Refresh'}
                    </span>
                  )}
                </button>

                {/* Divider */}
                <div style={{
                  width: 1,
                  margin: '7px 0',
                  background: isDark ? 'rgba(232,123,53,0.40)' : 'rgba(232,123,53,0.30)',
                  boxShadow: isDark ? '0 0 4px rgba(232,123,53,0.5)' : 'none',
                  flexShrink: 0,
                }} />

                {/* Right: chevron */}
                <button
                  id="admin-auto-refresh-toggle"
                  title={autoRefreshInterval ? `Auto-refresh: every ${autoRefreshInterval >= 60 ? autoRefreshInterval / 60 + ' min' : autoRefreshInterval + 's'}` : 'Set auto-refresh'}
                  onClick={() => setShowAutoRefreshMenu(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: autoRefreshInterval
                      ? (isDark ? 'rgba(232,123,53,0.18)' : 'rgba(232,123,53,0.12)')
                      : 'transparent',
                    border: 'none',
                    color: c.brand,
                    padding: '8px 13px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    filter: isDark ? `drop-shadow(0 0 3px rgba(232,123,53,0.5))` : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(232,123,53,0.20)' : 'var(--brand-color-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = autoRefreshInterval ? (isDark ? 'rgba(232,123,53,0.18)' : 'rgba(232,123,53,0.12)') : 'transparent'}
                >
                  <ChevronDown size={13} style={{ transform: showAutoRefreshMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }} />
                </button>
              </div>

              {/* Auto-refresh dropdown */}
              {showAutoRefreshMenu && (
                <div style={{
                  position: 'absolute', top: 42,
                  right: isMobile ? 16 : 0,
                  width: isMobile ? 'calc(100vw - 32px)' : 210,
                  maxWidth: 210,
                  background: c.card,
                  border: `1px solid ${c.borderStrong || c.border}`,
                  borderRadius: 10,
                  boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.45)' : '0 8px 32px rgba(0,0,0,0.12)',
                  zIndex: 60,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8 }}>Auto-Refresh</div>
                  {[
                    { label: 'Off', value: 0 },
                    { label: 'Every 30 Seconds', value: 30 },
                    { label: 'Every 1 Minute', value: 60 },
                    { label: 'Every 5 Minutes', value: 300 },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setAutoRefreshInterval(opt.value); setShowAutoRefreshMenu(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '9px 14px',
                        background: autoRefreshInterval === opt.value
                          ? (isDark ? 'rgba(232,123,53,0.14)' : 'var(--brand-color-light)')
                          : 'transparent',
                        border: 'none',
                        color: autoRefreshInterval === opt.value ? c.brand : c.text,
                        fontSize: 13, fontWeight: autoRefreshInterval === opt.value ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = autoRefreshInterval === opt.value ? (isDark ? 'rgba(232,123,53,0.14)' : 'var(--brand-color-light)') : 'transparent'}
                    >
                      <span>{opt.label}</span>
                      {autoRefreshInterval === opt.value && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.brand, display: 'inline-block' }} />
                      )}
                    </button>
                  ))}
                  {lastRefreshed && (
                    <div style={{ padding: '7px 14px 10px', fontSize: 11, color: c.subText, borderTop: `1px solid ${c.border}`, marginTop: 4 }}>
                      Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/*             {/* Desktop Appointment Button */}
            <button
              onClick={() => navigateTo(active === 'appointments' ? 'overview' : 'appointments')}
              className="hidden md:flex w-10 h-10 rounded-xl transition-all items-center justify-center cursor-pointer flex-shrink-0 relative"
              title={active === 'appointments' ? 'Back to Dashboard' : 'Appointments'}
              style={{
                background: active === 'appointments'
                  ? `linear-gradient(135deg, ${c.brand || '#E87B35'} 0%, #D8631F 100%)`
                  : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                color: active === 'appointments' ? '#fff' : c.subText,
                border: active === 'appointments'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : `1px solid ${c.border}`,
                boxShadow: active === 'appointments'
                  ? `0 4px 14px rgba(232, 123, 53, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                  : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                if (active === 'appointments') {
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
                if (active === 'appointments') {
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
              {pendingAppointmentsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white border border-white dark:border-gray-900">
                  {pendingAppointmentsCount}
                </span>
              )}
            </button>
 
            {/* Mobile Appointments Button */}
            <button
              onClick={() => navigateTo(active === 'appointments' ? 'overview' : 'appointments')}
              className="md:hidden p-2 rounded-full transition-colors relative"
              style={{ 
                color: active === 'appointments' ? c.brand : c.subText, 
                background: 'transparent' 
              }}
              title="Appointments"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = c.hover}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Calendar className="w-4.5 h-4.5" />
              {pendingAppointmentsCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white border border-white dark:border-gray-900">
                  {pendingAppointmentsCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsDark(!isDark)} style={{ background: c.card, border: `1px solid ${c.border}`, color: c.text, padding: 8, borderRadius: 8, cursor: 'pointer' }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div ref={notifRef} style={{ position: isMobile ? 'static' : 'relative' }}>
              <div onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} style={{ border: `1px solid ${c.border}`, background: c.card, width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Bell size={16} style={{ color: unreadCount > 0 ? c.brand : c.subText }} />
                {unreadCount > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, background: c.brand, borderRadius: 8, fontSize: 10, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</div>}
              </div>
              {isNotificationsOpen && (
                <div style={{
                  position: 'absolute', top: 44,
                  right: isMobile ? 16 : 0,
                  width: isMobile ? 'calc(100vw - 32px)' : 320,
                  maxWidth: 320,
                  background: c.card,
                  border: `1px solid ${c.borderStrong}`,
                  borderRadius: 12,
                  boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.08)',
                  zIndex: 50, display: 'flex', flexDirection: 'column', maxHeight: 420
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontWeight: 600, color: c.text }}>Notifications</span>
                    {unreadCount > 0 && <span style={{ fontSize: 11, background: c.brand, color: '#fff', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>{unreadCount} new</span>}
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {(() => {
                      const merged = [
                        ...pendingCustomers.map(cu => ({ kind: 'customer', id: cu.id, key: 'cust_' + cu.id, date: cu.created_at, data: cu })),
                        ...pendingRequests.map(r => ({ kind: 'request', id: r.id, key: r.id, date: r.created_at, data: r })),
                        ...adminNotifsForDropdown.map(n => ({ kind: 'notification', id: n.id, key: 'notif_' + n.id, date: n.created_at, data: n })),
                      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 16);

                      if (!merged.length) return <div style={{ padding: '16px', fontSize: 13, color: c.subText, textAlign: 'center' }}>No notifications</div>;

                      return merged.map((item, i) => {
                        const isUnread = item.key && !readNotifIds.includes(item.key);
                        const rowStyle = { padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer', background: isUnread ? (isDark ? 'var(--brand-color-light)' : 'rgba(232,123,53,0.07)') : 'transparent', transition: 'background 0.15s' };
                        const dot = isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.brand, flexShrink: 0 }} />;
                        const titleStyle = { fontSize: 13, fontWeight: isUnread ? 600 : 500, color: c.text };
                        const subStyle = { fontSize: 12, color: c.subText, paddingLeft: isUnread ? 13 : 0 };
                        const dateStyle = { fontSize: 11, color: c.subText, paddingLeft: isUnread ? 13 : 0 };
                        const dateStr = item.date ? new Date(item.date).toLocaleDateString() : '';

                        if (item.kind === 'customer') {
                          const cu = item.data;
                          return (
                            <div key={'pc' + (cu.id || i)} style={rowStyle}
                              onClick={() => { markNotifRead(item.key); setActive('customers'); setIsNotificationsOpen(false); }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {dot}
                                <span style={titleStyle}>New Registration: {cu.name}</span>
                              </div>
                              <div style={subStyle}>{cu.email} — awaiting approval</div>
                              <div style={dateStyle}>{dateStr}</div>
                            </div>
                          );
                        }
                        if (item.kind === 'request') {
                          const r = item.data;
                          return (
                            <div key={'rq' + (r.id || i)} style={rowStyle}
                              onClick={() => { markNotifRead(item.key); setActive(r.source === 'domain' ? 'domainsRequests' : r.source === 'email' ? 'emailRequests' : 'hostingRequests'); setIsNotificationsOpen(false); }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {dot}
                                <span style={titleStyle}>{r.n} — {r.reqType}</span>
                              </div>
                              <div style={subStyle}>{dateStr}</div>
                            </div>
                          );
                        }
                        const n = item.data;
                        const isPayment = n.type === 'payment_submitted';
                        const isJobSubmission = String(n.type || '').startsWith('job_detail_submission:');
                        const isAgreementSigned = String(n.type || '').startsWith('agreement_signed:');
                        return (
                          <div key={'notif' + (n.id || i)} style={rowStyle}
                            onClick={() => {
                              markNotifRead(item.key);
                              const isEmailRequest = n.type === 'email_request' || String(n.title || '').toLowerCase().includes('email request') || String(n.title || '').toLowerCase().includes('email');
                              const isTicket = n.type === 'ticket' || String(n.type).startsWith('ticket:') || String(n.title || '').toLowerCase().includes('ticket');
                              const isQuotation = n.type === 'quotation' || String(n.title || '').toLowerCase().includes('quotation');
                              const isAppointment = n.type === 'appointment_request' || String(n.type || '').startsWith('appointment');
                              if (isPayment) {
                                const invNo = getInvoiceNoFromTitle(n.title);
                                if (invNo) {
                                  setHighlightInvoiceNo(invNo);
                                }
                                setInvoiceView('list');
                                setEditInvoiceId(null);
                              }
                              if (isJobSubmission) {
                                const parts = String(n.type).split(':');
                                setHighlightJobId(parts[1] || null);
                                setHighlightReqId(parts[2] || null);
                              }
                              if (isTicket) {
                                const tktId = String(n.type).startsWith('ticket:') ? String(n.type).split(':')[1] : null;
                                if (tktId) {
                                  sessionStorage.setItem('admin_auto_select_ticket_id', tktId);
                                }
                              }
                              if (isAppointment) {
                                const parts = String(n.type).split(':');
                                const aptId = parts[1] || null;
                                if (aptId) {
                                  sessionStorage.setItem('admin_highlight_appointment_id', aptId);
                                }
                              }
                              if (isAgreementSigned) {
                                const agId = String(n.type).split(':')[1] || null;
                                if (agId) {
                                  sessionStorage.setItem('admin_highlight_agreement_id', agId);
                                }
                              }
                              setActive(
                                isTicket ? 'logs' : 
                                isEmailRequest ? 'emailRequests' : 
                                isPayment ? 'invoices' : 
                                isQuotation ? 'quotations' : 
                                isJobSubmission ? 'jobs' :
                                isAppointment ? 'appointments' :
                                isAgreementSigned ? 'agreements' :
                                'adminNotifications'
                              );
                              setIsNotificationsOpen(false);
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {dot}
                              <span style={titleStyle}>{n.title || 'Notification'}</span>
                            </div>
                            <div style={subStyle}>{n.message || dateStr}</div>
                            <div style={dateStyle}>{dateStr}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={handleMarkAllRead} style={{ fontSize: 12, color: c.subText, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Mark all as read</button>
                    <button onClick={() => { setActive('adminNotifications'); setIsNotificationsOpen(false); }} style={{ fontSize: 12, color: c.brand, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
                  </div>
                </div>
              )}
            </div>
            <div onClick={() => navigateTo('adminProfile')} style={{ background: c.brand, width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', cursor: 'pointer', flexShrink: 0 }} title="Admin Profile">A</div>
            {active === 'products' && (
              <button onClick={() => setIsAddProductOpen(true)} style={{ background: c.brand, color: '#fff', border: 'none', padding: isMobile ? '8px 10px' : '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Plus size={16} />{!isMobile && ' Product'}
              </button>
            )}
            <button onClick={() => setIsAddCustomerOpen(true)} style={{ background: c.sidebar, color: c.text, border: `1px solid ${c.border}`, padding: isMobile ? '8px 10px' : '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Plus size={16} />{!isMobile && ' Add Customer'}
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: active === 'logs' ? 'hidden' : 'auto',
          padding: active === 'logs' ? (isMobile ? '0 16px 16px' : '0 32px 32px') : (isMobile ? '0 16px 20px' : '16px 32px 32px'),
          display: active === 'logs' ? 'flex' : 'block',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {active === 'overview' && (
            <TodayAppointmentBanner
              c={c}
              isDark={isDark}
              onViewAppointments={() => navigateTo('appointments')}
            />
          )}
          {renderContent()}
        </div>
      </div>
      <AddCustomerDialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} onSuccess={loadData} />
      <AddProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} onSuccess={loadData} isDark={isDark} c={c} />
      <AssignProductDialog open={isAssignProductOpen} onOpenChange={setIsAssignProductOpen} customers={customers} products={products} onSuccess={loadData} c={c} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} onUpdate={loadData} isDark={isDark} />
      <AppointmentReminderPopup c={c} isDark={isDark} />
    </div>
  );
}

function NavItem({ item, active, setActive, open, c, badge = 0, badgeColor, dot = false, onSelectMobile }) {
  const isActive = active === item.id;
  const bc = badgeColor || c.brand;
  const [isHovered, setIsHovered] = useState(false);
  const color = isActive ? c.text : (isHovered ? c.text : c.subText);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { setActive(item.id); if (onSelectMobile) onSelectMobile(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActive(item.id);
          if (onSelectMobile) onSelectMobile();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
        padding: open ? '10px 12px' : '10px 0',
        width: '100%',
        background: isActive ? c.hover : (isHovered ? c.hover : 'transparent'),
        borderRadius: 8,
        cursor: 'pointer',
        borderLeft: isActive ? `3px solid ${c.brand}` : '3px solid transparent',
        marginBottom: 4,
        transition: 'all 0.15s ease',
        outline: 'none',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{ position: 'relative', flexShrink: 0, marginLeft: open ? 0 : -3 }}>
          <item.icon size={18} color={isActive ? c.brand : (isHovered ? c.brand : c.subText)} />
          {badge > 0 && <span style={{ position: 'absolute', top: -5, right: -6, width: 14, height: 14, background: bc, borderRadius: '50%', fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{badge > 9 ? '9+' : badge}</span>}
          {dot && badge === 0 && <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: c.brand, borderRadius: '50%', border: `2px solid ${c.sidebar}` }} />}
        </div>
        {open && <span style={{ fontSize: 14, color, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
      </div>

      {open && (
        <a
          href={`/admin-dashboard?tab=${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`Open ${item.label} in new tab`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: c.subText,
            opacity: isHovered ? 0.6 : 0,
            transition: 'opacity 0.2s, color 0.2s',
            padding: 4,
            borderRadius: 4,
            marginLeft: 8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = c.brand;
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = c.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = c.subText;
            e.currentTarget.style.opacity = '0.6';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

const AVATAR_COLORS = ['var(--brand-color)', '#e85d5d', '#378ADD', '#639922', '#BA7517', '#8b5cf6'];
const avatarColor = str => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const timeAgo = d => { const days = Math.floor((Date.now() - new Date(d)) / 86400000); if (days < 1) return 'Today'; if (days < 7) return `${days}d ago`; return `${Math.floor(days / 7)}w ago`; };

function MiniSparkline({ value, color }) {
  const s = value || 3;
  const pts = Array.from({ length: 12 }, (_, i) => 0.15 + i / 11 * 0.55 + Math.sin(i * 1.9 + s) * 0.12 + Math.sin(i * 0.8) * 0.08);
  const mn = Math.min(...pts), rng = (Math.max(...pts) - mn) || 1;
  const W = 80, H = 28;
  const coords = pts.map((v, i) => `${(i / 11) * W},${H - ((v - mn) / rng) * (H - 4) + 2}`).join(' ');
  return <svg width={W} height={H} style={{ display: 'block' }}><polyline points={coords} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function OverviewContent({ stats, customers, requests, hostingPlans, pendingRequestsCount, onNavigate, onViewCustomer, onConfirmCustomer, onRejectCustomer, c, isDark, isMobile = false }) {
  const approvedDomains = requests.filter(r => r.source === 'domain' && (String(r.status || '').toLowerCase() === 'approved' || String(r.status || '').toLowerCase() === 'expired')).length;
  const pendingCustomers = customers.filter(cu => String(cu.status || '').toLowerCase() === 'pending');
  const initials = name => (name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

  const statCards = [
    { label: 'Total customers', value: customers.length || 0, icon: <Users size={18} color={c.brand} />, sub: '↑ +12 this month', subColor: '#639922', bg: isDark ? '#3d2518' : '#fff5ee', sparkColor: c.brand },
    { label: 'Domains', value: approvedDomains, icon: <CheckCircle size={18} color="#378ADD" />, sub: `${stats.expiringSoon || 0} expiring soon`, subColor: '#378ADD', bg: isDark ? '#1a2736' : '#e6f1fb', sparkColor: '#378ADD' },
    { label: 'Hosting packages', value: hostingPlans.length || 0, icon: <Server size={18} color="#639922" />, sub: 'All active', subColor: '#639922', bg: isDark ? '#1e2e1e' : '#eaf3de', sparkColor: '#639922' },
    { label: 'Pending requests', value: pendingRequestsCount || 0, icon: <Star size={18} color="#BA7517" />, sub: 'Needs review', subColor: '#BA7517', bg: isDark ? '#382512' : '#faeeda', sparkColor: '#BA7517' },
  ];

  return (
    <div>
      <style>{`
        .overview-stats-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (min-width: 640px) {
          .overview-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .overview-stats-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        .overview-main-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .overview-main-grid {
            grid-template-columns: 2fr 1fr;
          }
        }

        .pending-customers-table-wrapper {
          display: block;
          overflow-y: auto;
          overflow-x: auto;
          max-height: 320px;
          margin-top: 8px;
        }
        .pending-customers-cards-wrapper {
          display: none;
          overflow-y: auto;
          max-height: 360px;
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .pending-customers-table-wrapper {
            display: none;
          }
          .pending-customers-cards-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>

      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, marginBottom: 4 }}>Good day, Admin</h1>
        <p style={{ fontSize: isMobile ? 12 : 14, color: c.subText }}>Here's what's happening with your portal today.</p>
      </div>

      <div className="overview-stats-grid">
        {statCards.map(s => (
          <div key={s.label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: c.subText }}>{s.label}</div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: s.subColor, fontWeight: 500, marginTop: 8 }}>{s.sub}</div>
              </div>
              <MiniSparkline value={s.value} color={s.sparkColor} />
            </div>
          </div>
        ))}
      </div>

      <div className="overview-main-grid">
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: isMobile ? 16 : 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'flex-start', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Pending Customers</div>
              <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>Awaiting admin confirmation</div>
            </div>
            <button onClick={() => onNavigate('customers')} style={{ color: c.brand, background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>View all →</button>
          </div>

          {/* Desktop Table View */}
          <div className="pending-customers-table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: c.card, zIndex: 1 }}>
                <tr style={{ color: c.subText, fontSize: 11, letterSpacing: '0.05em' }}>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'left', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'left', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'left', textTransform: 'uppercase' }}>Verification</th>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'left', textTransform: 'uppercase' }}>Joined</th>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'right', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingCustomers.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: c.subText }}>No pending customers</td></tr>
                )}
                {pendingCustomers.map((cu, i) => {
                  const col = avatarColor(cu.name);
                  return (
                    <tr key={cu.id || i} style={{ borderTop: `1px solid ${c.border}` }}>
                      <td style={{ padding: '10px 0', cursor: 'pointer' }} onClick={() => onViewCustomer(cu)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(cu.name)}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{cu.name}</div>
                            <div style={{ fontSize: 11, color: c.subText }}>{cu.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 0', fontSize: 13, color: c.subText }}>{cu.phone || '—'}</td>
                      <td style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            width: 'fit-content',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 600,
                            background: cu.email_otp_verified ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: cu.email_otp_verified ? '#10b981' : '#ef4444',
                            border: `1px solid ${cu.email_otp_verified ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                          }}>
                            Email: {cu.email_otp_verified ? 'Verified' : 'Pending'}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            width: 'fit-content',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 600,
                            background: cu.phone_otp_verified ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: cu.phone_otp_verified ? '#10b981' : '#ef4444',
                            border: `1px solid ${cu.phone_otp_verified ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                          }}>
                            Mobile: {cu.phone_otp_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 0', fontSize: 12, color: c.subText }}>{cu.created_at ? timeAgo(cu.created_at) : '—'}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button onClick={() => onConfirmCustomer(cu)} style={{ background: 'rgba(99,153,34,0.15)', color: '#639922', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                          <button onClick={() => onRejectCustomer(cu)} style={{ background: 'rgba(229,57,53,0.12)', color: '#e53935', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="pending-customers-cards-wrapper">
            {pendingCustomers.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: c.subText }}>No pending customers</div>
            )}
            {pendingCustomers.map((cu, i) => {
              const col = avatarColor(cu.name);
              return (
                <div key={cu.id || i} style={{
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => onViewCustomer(cu)}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(cu.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{cu.name}</div>
                      <div style={{ fontSize: 11, color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cu.email}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: c.subText, justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, padding: '8px 0' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: c.subText, opacity: 0.7 }}>Phone</div>
                      <div style={{ color: c.text, fontSize: 12, marginTop: 2 }}>{cu.phone || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: c.subText, opacity: 0.7 }}>Joined</div>
                      <div style={{ color: c.text, fontSize: 12, marginTop: 2 }}>{cu.created_at ? timeAgo(cu.created_at) : '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        width: 'fit-content',
                        padding: '1px 5px',
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 600,
                        background: cu.email_otp_verified ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: cu.email_otp_verified ? '#10b981' : '#ef4444',
                        border: `1px solid ${cu.email_otp_verified ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                      }}>
                        Email: {cu.email_otp_verified ? 'Verified' : 'Pending'}
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        width: 'fit-content',
                        padding: '1px 5px',
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 600,
                        background: cu.phone_otp_verified ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: cu.phone_otp_verified ? '#10b981' : '#ef4444',
                        border: `1px solid ${cu.phone_otp_verified ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                      }}>
                        Mobile: {cu.phone_otp_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => onConfirmCustomer(cu)} style={{ background: 'rgba(99,153,34,0.15)', color: '#639922', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                      <button onClick={() => onRejectCustomer(cu)} style={{ background: 'rgba(229,57,53,0.12)', color: '#e53935', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>New requests</div>
                <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>Awaiting your review</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              {requests.slice(0, 4).map((r, i) => {
                const col = avatarColor(r.n);
                const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                
                let targetTab = 'domainsRequests';
                let badgeLabel = 'Domain';
                let badgeBg = 'rgba(99,153,34,0.15)';
                let badgeColor = '#639922';

                if (r.source === 'hosting') {
                  targetTab = 'hostingRequests';
                  badgeLabel = 'Hosting';
                  badgeBg = 'rgba(55,138,221,0.15)';
                  badgeColor = '#5b9aff';
                } else if (r.source === 'email') {
                  targetTab = 'emailRequests';
                  badgeLabel = 'Email';
                  badgeBg = 'var(--brand-color-light)';
                  badgeColor = 'var(--brand-color)';
                }

                return (
                  <div key={r.id || i} onClick={() => onNavigate(targetTab)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${c.border}`, cursor: 'pointer' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(r.n)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.n}</div>
                      <div style={{ fontSize: 11, color: c.subText }}>{r.reqType}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ background: badgeBg, color: badgeColor, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>{badgeLabel}</span>
                      <span style={{ fontSize: 11, color: c.subText, minWidth: 40, textAlign: 'right' }}>{date}</span>
                    </div>
                  </div>
                );
              })}
              {requests.length === 0 && <div style={{ fontSize: 13, color: c.subText }}>No new requests</div>}
            </div>
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: c.text }}>Hosting plans</div>
            {(() => {
              const COLORS = [c.brand, '#378ADD', '#639922', '#a855f7', '#f59e0b', '#ec4899'];
              const counts = {};
              hostingPlans.forEach(p => {
                const t = p.hosting_type || 'Other';
                counts[t] = (counts[t] || 0) + 1;
              });
              const entries = Object.entries(counts);
              const total = hostingPlans.length || 1;
              if (!entries.length) return <div style={{ color: c.subText, fontSize: 13 }}>No plans yet</div>;
              return entries.map(([name, val], i) => {
                const short = name.replace(' Hosting', '').replace(' Server', '');
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 64, fontSize: 13, color: c.text, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{short}</div>
                    <div style={{ flex: 1, height: 6, background: isDark ? 'rgba(255,255,255,0.07)' : '#ebebeb', borderRadius: 3 }}>
                      <div style={{ width: `${Math.round((val / total) * 100)}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ width: 38, fontSize: 12, color: c.subText, textAlign: 'right', flexShrink: 0 }}>{val} <span style={{ opacity: 0.6 }}>({Math.round((val / total) * 100)}%)</span></div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminProfileContent({ c, isDark }) {
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: c.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 24, flexShrink: 0 }}>A</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.text }}>Admin</div>
            <div style={{ fontSize: 13, color: c.subText }}>Super Administrator</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {[{ label: 'Email', value: 'info@nextiom.com' }, { label: 'Role', value: 'Super Admin' }, { label: 'Portal', value: 'Nextiom Admin' }, { label: 'Status', value: 'Active' }].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</div>
              <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 12px', color: c.text, fontSize: 14 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AllAdminNotificationsPage({ notifications, requests, customers, onNavigate, c, isDark, isMobile = false, markNotifRead, setHighlightInvoiceNo, setInvoiceView, setEditInvoiceId, setHighlightJobId, setHighlightReqId }) {
  const pendingReqs = requests.filter(r => String(r.status || '').toLowerCase() === 'pending');
  const recentCustomers = customers.filter(c => c.status === 'pending').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Keep internal admin actions in Activity Logs, not in admin notification UI
  const filteredNotifications = (notifications || []).filter(n =>
    !isAdminInternalNotification(n)
  );

  const allItems = [
    ...pendingReqs.map(r => ({ type: 'request', source: r.source, title: `${r.n} — ${r.reqType}`, sub: r.source === 'domain' ? 'Domain Request' : r.source === 'email' ? 'Email Request' : 'Hosting Request', date: r.created_at, id: r.id })),
    ...recentCustomers.map(cu => ({ type: 'customer', title: `New Customer: ${cu.name}`, sub: cu.email || '', date: cu.created_at, id: cu.id, customer: cu })),
    ...filteredNotifications.map(n => ({ type: 'notification', title: n.title || 'Notification', sub: n.message || '', date: n.created_at, id: n.id, nType: n.type })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const typeColor = t => t === 'request' ? '#8b5cf6' : t === 'customer' ? '#639922' : '#378ADD';
  const typeLabel = item => item.type === 'request' ? (item.source === 'domain' ? 'Domain' : item.source === 'email' ? 'Email' : 'Hosting') : item.type === 'customer' ? 'New User' : 'Notification';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => onNavigate('overview')} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', fontSize: 13 }}>← Back</button>
        <div>
          <h2 style={{ fontSize: 20, fontW: 700, margin: 0, color: c.text }}>All Notifications</h2>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 2 }}>Pending requests, new customers, and system notifications</p>
        </div>
      </div>


      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{allItems.length} items</span>
        </div>
        {allItems.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: c.subText, fontSize: 13 }}>No notifications</div>}
        {allItems.map((item, i) => {
          const nType = String(item.nType || '').toLowerCase();
          const titleLower = String(item.title || '').toLowerCase();
          const isEmailRequest = nType === 'email_request' || titleLower.includes('email request') || titleLower.includes('email');
          const isTicket = nType === 'ticket' || titleLower.includes('ticket');
          const isPayment = nType === 'payment_submitted' || titleLower.includes('payment');
          const isQuotation = nType === 'quotation' || titleLower.includes('quotation');
          const isJobSubmission = nType.startsWith('job_detail_submission:');
          const isAgreementSigned = nType.startsWith('agreement_signed:');

          const isClickable = item.type !== 'notification' || isEmailRequest || isTicket || isPayment || isQuotation || isJobSubmission || isAgreementSigned;

          return (
            <div key={item.id + i} 
              onClick={() => { 
                if (item.type === 'request') {
                  if (markNotifRead) markNotifRead(item.id);
                  onNavigate(item.source === 'domain' ? 'domainsRequests' : item.source === 'email' ? 'emailRequests' : 'hostingRequests'); 
                } else if (item.type === 'customer') {
                  if (markNotifRead) markNotifRead('cust_' + item.id);
                  onNavigate('customers'); 
                } else if (item.type === 'notification' && isClickable) {
                  if (markNotifRead) markNotifRead('notif_' + item.id);
                  if (isPayment) {
                    const invNo = getInvoiceNoFromTitle(item.title);
                    if (invNo) {
                      setHighlightInvoiceNo(invNo);
                    }
                    setInvoiceView('list');
                    setEditInvoiceId(null);
                  }
                  if (isJobSubmission) {
                    const parts = String(item.nType).split(':');
                    setHighlightJobId(parts[1] || null);
                    setHighlightReqId(parts[2] || null);
                  }
                  if (isAgreementSigned) {
                    const agId = String(item.nType).split(':')[1] || null;
                    if (agId) {
                      sessionStorage.setItem('admin_highlight_agreement_id', agId);
                    }
                  }
                  onNavigate(
                    isTicket ? 'logs' : 
                    isEmailRequest ? 'emailRequests' : 
                    isPayment ? 'invoices' : 
                    isQuotation ? 'quotations' : 
                    isJobSubmission ? 'jobs' :
                    isAgreementSigned ? 'agreements' :
                    'adminNotifications'
                  );
                }
              }} 
              style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 14, cursor: isClickable ? 'pointer' : 'default', transition: 'background 0.1s', flexWrap: isMobile ? 'wrap' : 'nowrap' }} 
              onMouseEnter={e => e.currentTarget.style.background = c.hover} 
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: typeColor(item.type) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={16} color={typeColor(item.type)} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: c.subText, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ background: typeColor(item.type) + '22', color: typeColor(item.type), fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{typeLabel(item)}</span>
                <span style={{ fontSize: 11, color: c.subText }}>{item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
