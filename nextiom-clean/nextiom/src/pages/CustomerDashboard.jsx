import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, LogOut, Menu, X,
  Globe, ShoppingCart, MessageSquare, Server, Loader2,
  Sun, Moon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getUserProfile } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';

import DashboardPage from '@/components/customer/DashboardPage';
import MyServicesPage from '@/components/customer/MyServicesPage';
import ProfilePage from '@/components/customer/ProfilePage';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import NotificationBell from '@/components/notifications/NotificationBell';
import MyDomainsPage from '@/components/customer/MyDomainsPage';
import NewDomainRequestPage from '@/components/customer/NewDomainRequestPage';
import MyHostingPackagesPage from '@/components/customer/MyHostingPackagesPage';
import NewHostingOrderPage from '@/components/customer/NewHostingOrderPage';
import CollapsibleMenuItem from '@/components/ui/CollapsibleMenuItem';
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
      { id: 'support_tickets', label: 'My Tickets' },
    ],
  },
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

function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('cust_sidebar_collapsed') === 'true'
  );
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('cust_dark') !== 'false'
  );
  const [customerProfile, setCustomerProfile] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const { user, signOut } = useAuth();
  const c = isDark ? DARK : LIGHT;

  useEffect(() => {
    const initializeUser = async () => {
      if (!user) { setIsInitializing(false); return; }
      setIsInitializing(true);
      try {
        let profile = await getUserProfile(user.id);
        if (!profile) {
          const { data: newProfile } = await supabase
            .from('customers')
            .insert([{
              user_id: user.id, email: user.email,
              name: user.user_metadata?.full_name || user.email.split('@')[0],
              status: 'active', created_at: new Date().toISOString(),
            }])
            .select().single();
          profile = newProfile;
        }
        setCustomerProfile(profile || { name: user.user_metadata?.full_name || user.email, id: user.id, email: user.email });
      } catch (e) {
        console.error(e);
        setCustomerProfile({ name: user.user_metadata?.full_name || user.email, id: user.id, email: user.email });
      } finally {
        setIsInitializing(false);
      }
    };
    initializeUser();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    sessionStorage.clear();
    localStorage.clear();
    window.location.replace('/');
  };

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

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage key="dashboard" user={userProp} {...theme} onNavigate={navigate} />;
      case 'hosting_my':
        return <MyHostingPackagesPage key="hosting_my" user={userProp} {...theme} />;
      case 'hosting_new':
        return <NewHostingOrderPage key="hosting_new" onSuccess={() => setActiveTab('hosting_my')} {...theme} />;
      case 'domains_my':
        return <MyDomainsPage key="domains_my" user={userProp} {...theme} />;
      case 'domains_new':
        return <NewDomainRequestPage key="domains_new" onSuccess={() => setActiveTab('domains_my')} {...theme} />;
      case 'services':
        return <MyServicesPage key="services" user={userProp} {...theme} />;
      case 'invoices':
        return (
          <div key="invoices" style={{ background: c.card, color: c.subText, border: `1px solid ${c.border}` }} className="p-8 text-center rounded-xl">
            Invoices module under maintenance.
          </div>
        );
      case 'support_tickets':
        return (
          <div key="support" style={{ background: c.card, color: c.subText, border: `1px solid ${c.border}` }} className="p-8 text-center rounded-xl">
            Support ticket system coming soon.
          </div>
        );
      case 'profile':
        return <ProfilePage key="profile" user={userProp} onUpdate={() => {}} {...theme} />;
      case 'notifications':
        return <NotificationsPage key="notifications" customerId={customerProfile.id} {...theme} />;
      default:
        return <DashboardPage key="dashboard" user={userProp} {...theme} />;
    }
  };

  if (isInitializing) {
    return (
      <div style={{ background: c.bg }} className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: c.brand }} />
      </div>
    );
  }

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
