import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, LogOut, Menu, X,
  Globe, ShoppingCart, MessageSquare, Server, Loader2,
  Sun, Moon, ChevronLeft, ChevronRight, Package,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

import DashboardPage from '@/components/customer/DashboardPage';
import MyServicesPage from '@/components/customer/MyServicesPage';
import ProfilePage from '@/components/customer/ProfilePage';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import NotificationBell from '@/components/notifications/NotificationBell';
import MyDomainsPage from '@/components/customer/MyDomainsPage';
import MyProductsPage from '@/components/customer/MyProductsPage';
import NewDomainRequestPage from '@/components/customer/NewDomainRequestPage';
import MyHostingPackagesPage from '@/components/customer/MyHostingPackagesPage';
import NewHostingOrderPage from '@/components/customer/NewHostingOrderPage';
import CollapsibleMenuItem from '@/components/ui/CollapsibleMenuItem';
import CustomerInvoicesPage from '@/components/customer/CustomerInvoicesPage';
import CreateTicketPage from '@/components/customer/CreateTicketPage';
import MyTicketsPage from '@/components/customer/MyTicketsPage';
import { cn } from '@/lib/utils';

const DARK = {
  bg: '#15161A', sidebar: '#1C1E24', border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0',
  card: '#1C1E24', panel2: '#22252C', hover: 'rgba(255,255,255,0.04)',
  brand: '#E87B35', brandLight: 'rgba(232,123,53,0.15)',
};
const LIGHT = {
  bg: '#f8f8f7', sidebar: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0',
  text: '#1a1a1a', subText: '#888', card: '#fff', panel2: '#f5f5f5',
  hover: '#f5f5f5', brand: '#E87B35', brandLight: 'rgba(232,123,53,0.1)',
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
    id: 'orders', label: 'Orders', icon: ShoppingCart, type: 'group',
    children: [
      { id: 'services', label: 'My Subscriptions' },
      { id: 'invoices', label: 'Invoices' },
    ],
  },
  {
    id: 'support', label: 'Support', icon: MessageSquare, type: 'group',
    children: [
      { id: 'support_create', label: 'Create Ticket' },
      { id: 'support_tickets', label: 'My Tickets' },
    ],
  },
  { id: 'products', label: 'My Products', icon: Package, type: 'item' },
  { id: 'profile', label: 'Account Details', icon: User, type: 'item' },
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

const KEEP_ALIVE_TABS = ['dashboard','hosting_my','domains_my','services','invoices','support_tickets','products','profile','notifications'];

function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mountedTabs, setMountedTabs] = useState(() => new Set(['dashboard']));

  useEffect(() => {
    if (KEEP_ALIVE_TABS.includes(activeTab)) {
      setMountedTabs(s => s.has(activeTab) ? s : new Set(s).add(activeTab));
    }
  }, [activeTab]);

  const [expandedMenus, setExpandedMenus] = useState(['hosting', 'domains', 'orders', 'support']);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('cust_sidebar_collapsed') === 'true'
  );
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('cust_dark') !== 'false'
  );
  const { user, signOut, customerProfile } = useAuth();
  const c = isDark ? DARK : LIGHT;

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
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);
  };

  const renderNav = (collapsed) => (
    <nav className="flex-1 overflow-y-auto py-4 px-2">
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
            >
              {item.children.map(child => (
                <button
                  key={child.id}
                  onClick={() => navigate(child.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm mb-0.5 transition-colors"
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
            isDark={isDark}
            onClick={() => navigate(item.id)}
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
    if (activeTab === 'hosting_new') return <NewHostingOrderPage onSuccess={() => setActiveTab('hosting_my')} {...theme} />;
    if (activeTab === 'domains_new') return <NewDomainRequestPage onSuccess={() => setActiveTab('domains_my')} {...theme} />;
    if (activeTab === 'support_create') return <CreateTicketPage user={userProp} isDark={isDark} c={c} onNavigate={setActiveTab} />;

    const wrap = (id, node) => (
      <div key={id} style={{ display: activeTab === id ? 'block' : 'none' }}>{node}</div>
    );

    return (
      <>
        {mountedTabs.has('dashboard')       && wrap('dashboard',       <DashboardPage user={userProp} {...theme} onNavigate={navigate} />)}
        {mountedTabs.has('hosting_my')      && wrap('hosting_my',      <MyHostingPackagesPage user={userProp} {...theme} />)}
        {mountedTabs.has('domains_my')      && wrap('domains_my',      <MyDomainsPage user={userProp} {...theme} />)}
        {mountedTabs.has('services')        && wrap('services',        <MyServicesPage user={userProp} {...theme} />)}
        {mountedTabs.has('invoices')        && wrap('invoices',        <CustomerInvoicesPage user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('support_tickets') && wrap('support_tickets', <MyTicketsPage user={userProp} isDark={isDark} c={c} onNavigate={setActiveTab} />)}
        {mountedTabs.has('products')        && wrap('products',        <MyProductsPage user={userProp} isDark={isDark} c={c} />)}
        {mountedTabs.has('profile')         && wrap('profile',         <ProfilePage user={userProp} onUpdate={() => {}} {...theme} />)}
        {mountedTabs.has('notifications')   && wrap('notifications',   <NotificationsPage customerId={customerProfile.id} {...theme} />)}
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
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-md"
        style={{ background: c.card, border: `1px solid ${c.border}`, color: c.text }}
      >
        <Menu className="w-5 h-5" />
      </button>

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
          <div className="pl-8 lg:pl-0 font-semibold" style={{ color: c.text }}>
            {getActiveLabel(activeTab)}
          </div>

          <div className="flex items-center gap-3">
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
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomerDashboard;
