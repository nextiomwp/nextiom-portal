import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LogOut, Clock, AlertTriangle, LayoutDashboard, Globe, Server, Mail,
  ShoppingCart, MessageSquare, Package, User, Loader2, Menu, X,
  CreditCard, FileText, Info, BellOff, Briefcase,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { clearCustomerNotifications } from '@/lib/storage';

import { getCustomerJobs } from '@/lib/jobs';
import { getTicketsByCustomer } from '@/lib/storage';

// Re-use real customer components
import DashboardPage from '@/components/customer/DashboardPage';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import NotificationBell from '@/components/notifications/NotificationBell';
import MyDomainsPage from '@/components/customer/MyDomainsPage';
import MyHostingPackagesPage from '@/components/customer/MyHostingPackagesPage';
import MyEmailsPage from '@/components/customer/MyEmailsPage';
import MyServicesPage from '@/components/customer/MyServicesPage';
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
import useDisableRightClick from '@/hooks/useDisableRightClick';

const OnProgressIcon = ({ size, className, style, color }) => {
  const sizePx = size ? `${size}px` : undefined;
  const iconColor = color || style?.color || '';
  const colorStr = String(iconColor).toLowerCase();

  // Color matching filters
  let imgFilter = 'brightness(0) saturate(100%) invert(60%)'; // default inactive gray
  if (colorStr.includes('e87b35')) {
    // Brand Orange (#E87B35) filter
    imgFilter = 'brightness(0) saturate(100%) invert(56%) sepia(56%) saturate(1487%) hue-rotate(345deg) brightness(97%) contrast(92%)';
  } else if (colorStr.includes('888')) {
    imgFilter = 'brightness(0) saturate(100%) invert(53%)';
  } else if (colorStr.includes('a0a0a0')) {
    imgFilter = 'brightness(0) saturate(100%) invert(63%)';
  } else if (colorStr.includes('fff') || colorStr.includes('rgb(255, 255, 255)')) {
    imgFilter = 'brightness(0) saturate(100%) invert(100%)';
  }

  return (
    <img
      src="/on-progress.png"
      alt="Jobs"
      className={className}
      style={{
        width: sizePx || '20px',
        height: sizePx || '20px',
        objectFit: 'contain',
        ...style,
        filter: imgFilter
      }}
    />
  );
};

const c = {
  bg: '#15161A', sidebar: '#1C1E24', border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0',
  card: '#1C1E24', panel2: '#22252C', hover: 'rgba(255,255,255,0.04)',
  brand: '#E87B35', brandLight: 'rgba(232,123,53,0.15)',
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
    ],
  },
  {
    id: 'billing', label: 'Billing', icon: CreditCard, type: 'group',
    children: [
      { id: 'invoices', label: 'Invoices' },
      { id: 'quotations', label: 'Quotations' },
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
  { id: 'profile', label: 'Account Details', icon: User, type: 'item' },
  {
    id: 'about', label: 'About Us', icon: Info, type: 'group',
    children: [
      { id: 'about_company', label: 'Company Info' },
      { id: 'about_contact', label: 'Contact Details' },
      { id: 'about_website', label: 'Our Website' },
    ],
  },
];

const KEEP_ALIVE_TABS = ['dashboard', 'hosting_my', 'domains_my', 'emails_my', 'services', 'invoices', 'quotations', 'support_tickets', 'jobs', 'products', 'profile', 'notifications', 'about_company', 'about_contact'];

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [startTime] = useState(() => Date.now());

  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [waitingJobsCount, setWaitingJobsCount] = useState(0);
  const [activeTicketsCount, setActiveTicketsCount] = useState(0);

  useEffect(() => {
    if (!customerProfile?.id) return;

    const fetchCounts = async () => {
      try {
        const [jobsData, ticketsData] = await Promise.all([
          getCustomerJobs(customerProfile.id).catch(() => []),
          getTicketsByCustomer(customerProfile.id).catch(() => []),
        ]);
        setActiveJobsCount(jobsData.filter(j => j.status === 'Active').length);
        setWaitingJobsCount(jobsData.filter(j => j.status === 'Waiting').length);
        setActiveTicketsCount(ticketsData.filter(t => t.status === 'open').length);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerProfile?.id]);

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
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
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
    const theme = { isDark: true, c };

    // Form pages — render fresh each visit (no keep-alive for these)
    if (activeTab === 'hosting_new')
      return <NewHostingOrderPage onSuccess={() => setActiveTab('hosting_my')} user={userProp} {...theme} />;
    if (activeTab === 'domains_new')
      return <NewDomainRequestPage onSuccess={() => setActiveTab('domains_my')} user={userProp} {...theme} />;
    if (activeTab === 'emails_new')
      return <NewEmailRequestPage onSuccess={() => setActiveTab('emails_my')} user={userProp} {...theme} />;
    if (activeTab === 'support_create')
      return <CreateTicketPage user={userProp} isDark c={c} onNavigate={setActiveTab} />;

    // Keep-alive pages: mount once, toggle visibility with display:none/block
    const wrap = (id, node) => (
      <div key={id} style={{ display: activeTab === id ? 'block' : 'none' }}>{node}</div>
    );

    return (
      <>
        {mountedTabs.has('dashboard') && wrap('dashboard', <DashboardPage user={userProp} {...theme} onNavigate={switchTab} />)}
        {mountedTabs.has('hosting_my') && wrap('hosting_my', <MyHostingPackagesPage user={userProp} {...theme} />)}
        {mountedTabs.has('domains_my') && wrap('domains_my', <MyDomainsPage user={userProp} {...theme} />)}
        {mountedTabs.has('emails_my') && wrap('emails_my', <MyEmailsPage user={userProp} {...theme} />)}
        {mountedTabs.has('services') && wrap('services', <MyServicesPage user={userProp} {...theme} />)}
        {mountedTabs.has('invoices') && wrap('invoices', <CustomerInvoicesPage user={userProp} isDark c={c} />)}
        {mountedTabs.has('quotations') && wrap('quotations', <CustomerQuotationsPage user={userProp} isDark c={c} />)}
        {mountedTabs.has('support_tickets') && wrap('support_tickets', <MyTicketsPage user={userProp} isDark c={c} onNavigate={setActiveTab} />)}
        {mountedTabs.has('jobs') && wrap('jobs', <CustomerJobsPage user={userProp} isDark c={c} />)}
        {mountedTabs.has('products') && wrap('products', <MyProductsPage user={userProp} isDark c={c} />)}
        {mountedTabs.has('profile') && wrap('profile', <ProfilePage user={userProp} onUpdate={() => {}} {...theme} />)}
        {mountedTabs.has('notifications') && wrap('notifications', <NotificationsPage customerId={customerProfile.id} {...theme} />)}
        {mountedTabs.has('about_company') && wrap('about_company', <CompanyInfoPage {...theme} />)}
        {mountedTabs.has('about_contact') && wrap('about_contact', <ContactDetailsPage user={userProp} {...theme} />)}
      </>
    );
  };

  const renderNav = (collapsed) => (
    <nav className="flex-1 overflow-y-auto py-4 px-2">
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
              isDark={true}
              onToggle={() => {
                if (collapsed) switchTab(item.children[0].id);
                else toggleMenu(item.id);
              }}
              onClick={() => {
                if (collapsed) switchTab(item.children[0].id);
                else toggleMenu(item.id);
              }}
              badge={item.id === 'support' ? activeTicketsCount : 0}
              badgeColor="#16a34a"
            >
              {item.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => switchTab(child.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm mb-0.5 transition-colors"
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
                  {child.label}
                </button>
              ))}
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
            isDark={true}
            onClick={() => switchTab(item.id)}
            badge={item.id === 'jobs' ? activeJobsCount : 0}
            badgeColor="#16a34a"
            badgeTextColor="#ffffff"
            isBlinking={item.id === 'jobs' && waitingJobsCount > 0}
          />
        );
      })}
    </nav>
  );

  return (
    <div style={{ background: c.bg, minHeight: '100vh', display: 'flex' }}>
      {/* Fixed Orange Impersonation Banner */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#E87B35',
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

      {/* Mobile hamburger */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        style={{
          position: 'fixed',
          top: 50,
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
        className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: isSidebarCollapsed ? 64 : 260,
          height: '100vh',
          paddingTop: 44,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          background: isSidebarCollapsed ? 'rgba(22,24,30,0.92)' : c.sidebar,
          backdropFilter: isSidebarCollapsed ? 'blur(24px)' : 'none',
          borderRight: isSidebarCollapsed ? 'none' : `1px solid ${c.border}`,
        }}
      >
        {/* Sidebar header */}
        <div
          className="h-14 flex items-center px-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          {/* Hamburger icon to toggle collapse */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
              className="h-14 flex items-center px-4 flex-shrink-0"
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
      <main className="flex-1 overflow-auto min-h-screen flex flex-col" style={{ paddingTop: 44 }}>
        {/* Header bar */}
        <div
          className="h-14 flex items-center justify-between px-6 flex-shrink-0"
          style={{ background: c.sidebar, borderBottom: `1px solid ${c.border}`, position: 'relative', zIndex: 30 }}
        >
          <div className="lg:pl-0 pl-10 font-semibold text-sm" style={{ color: c.text }}>
            {activeTab === 'dashboard'
              ? `Customer: ${impersonatedUser.name}`
              : NAV_STRUCTURE.flatMap((i) => i.children || [i]).find((i) => i.id === activeTab)
                  ?.label || 'Dashboard'}
          </div>

          <div className="flex items-center gap-3">
            {customerProfile?.id && (
              <NotificationBell
                userId={customerProfile.id}
                onViewAll={() => switchTab('notifications')}
                onNavigate={switchTab}
                isDark={true}
                c={c}
              />
            )}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
              style={{ background: c.brandLight, color: c.brand }}
            >
              {(impersonatedUser.name || '?')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content wrapper — fills remaining space, scrolls independently */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
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
  );
}

export default ImpersonationDashboard;
