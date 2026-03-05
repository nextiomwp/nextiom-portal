import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, LogOut, Menu, X,
  Globe, ShoppingCart, MessageSquare, Server, Loader2
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
import { Button } from '@/components/ui/button';

const NAV_STRUCTURE = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'item' },
  {
    id: 'hosting', label: 'Hosting', icon: Server, type: 'group',
    children: [
      { id: 'hosting_my', label: 'My Hosting' },
      { id: 'hosting_new', label: 'Order Hosting' },
    ]
  },
  {
    id: 'domains', label: 'Domains', icon: Globe, type: 'group',
    children: [
      { id: 'domains_my', label: 'My Domains' },
      { id: 'domains_new', label: 'Register Domain' },
    ]
  },
  {
    id: 'orders', label: 'Orders', icon: ShoppingCart, type: 'group',
    children: [
      { id: 'services', label: 'My Subscriptions' },
      { id: 'invoices', label: 'Invoices' },
    ]
  },
  {
    id: 'support', label: 'Support', icon: MessageSquare, type: 'group',
    children: [
      { id: 'support_tickets', label: 'My Tickets' },
    ]
  },
  { id: 'profile', label: 'Account Details', icon: User, type: 'item' },
];

function CustomerDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const { user, signOut } = useAuth();

  useEffect(() => {
    const initializeUser = async () => {
      if (!user) {
        setIsInitializing(false);
        return;
      }
      setIsInitializing(true);
      try {
        let profile = await getUserProfile(user.id);

        if (!profile) {
          const { data: newProfile } = await supabase
            .from('customers')
            .insert([{
              user_id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email.split('@')[0],
              status: 'active',
              created_at: new Date().toISOString()
            }])
            .select()
            .single();
          profile = newProfile;
        }

        setCustomerProfile(profile || {
          name: user.user_metadata?.full_name || user.email,
          id: user.id,
          email: user.email
        });
      } catch (e) {
        console.error(e);
        setCustomerProfile({
          name: user.user_metadata?.full_name || user.email,
          id: user.id,
          email: user.email
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeUser();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    // Clear all browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    // Clear session/local storage
    sessionStorage.clear();
    localStorage.clear();
    // Hard redirect to login
    window.location.replace('/');
  };

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const renderContent = () => {
    if (!customerProfile) return null;

    const props = {
      user: { ...user, id: customerProfile.id || user.id },
      key: activeTab
    };

    try {
      switch (activeTab) {
        case 'dashboard': return <DashboardPage {...props} />;
        case 'hosting_my': return <MyHostingPackagesPage {...props} />;
        case 'hosting_new': return <NewHostingOrderPage onSuccess={() => setActiveTab('hosting_my')} />;
        case 'domains_my': return <MyDomainsPage {...props} />;
        case 'domains_new': return <NewDomainRequestPage onSuccess={() => setActiveTab('domains_my')} />;
        case 'services': return <MyServicesPage {...props} />;
        case 'invoices': return <div className="p-8 text-center text-slate-500 bg-white rounded-lg border">Invoices module under maintenance.</div>;
        case 'support_tickets': return <div className="p-8 text-center text-slate-500 bg-white rounded-lg border">Support ticket system coming soon.</div>;
        case 'profile': return <ProfilePage user={props.user} onUpdate={() => { }} />;
        case 'notifications': return <NotificationsPage />;
        default: return <DashboardPage {...props} />;
      }
    } catch (err) {
      console.error("Error rendering tab:", err);
      return <div className="p-4 text-red-600">Error loading section</div>;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.replace('/');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <Helmet><title>Customer Dashboard</title></Helmet>

      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border"
      >
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3 }}
            className="fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-white border-r border-slate-200 shadow-sm flex flex-col h-screen"
          >
            <div className="h-16 flex items-center px-6 border-b border-slate-100 font-bold text-xl text-slate-800">
              NEXTIOM
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4">
              {NAV_STRUCTURE.map((item) => {
                if (item.type === 'group') {
                  return (
                    <CollapsibleMenuItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      isActive={item.children.some(c => c.id === activeTab)}
                      isExpanded={expandedMenus.includes(item.id)}
                      hasSubItems={true}
                      onToggle={() => toggleMenu(item.id)}
                    >
                      {item.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => {
                            setActiveTab(child.id);
                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 rounded-md text-sm mb-0.5",
                            activeTab === child.id
                              ? "bg-slate-100 text-blue-700 font-medium"
                              : "text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          {child.label}
                        </button>
                      ))}
                    </CollapsibleMenuItem>
                  );
                } else {
                  return (
                    <CollapsibleMenuItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      isActive={activeTab === item.id}
                      hasSubItems={false}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                    />
                  );
                }
              })}
            </nav>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-red-600 rounded-lg transition-colors text-sm"
              >
                <LogOut className="w-5 h-5" /> Log Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-auto h-screen bg-slate-50/50 w-full relative">
        <div className="bg-white border-b border-slate-200 px-8 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm h-16">
          <div className="pl-10 lg:pl-0 font-semibold text-slate-700">
            {NAV_STRUCTURE.find(n => n.id === activeTab || n.children?.some(c => c.id === activeTab))?.label || 'Dashboard'}
          </div>
          <div className="flex items-center gap-4">
            {customerProfile?.id && (
              <NotificationBell userId={customerProfile.id} onViewAll={() => setActiveTab('notifications')} />
            )}
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
              {customerProfile?.name ? customerProfile.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default CustomerDashboard;