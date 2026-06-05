import React, { useState, useEffect, useRef } from 'react';
import { Users, Globe, Server, Star, Bell, Plus, LogOut, Settings, LayoutDashboard, FileText, MessageSquare, Package, ClipboardList, ChevronRight, Loader2, Moon, Sun, CheckCircle, Menu, Receipt, CheckSquare, Megaphone, Activity, Mail, Home, Zap, ChevronLeft, Shield, UserCog } from 'lucide-react';
import InvoicesPage from '@/pages/invoices/InvoicesPage';
import NewInvoicePage from '@/pages/invoices/NewInvoicePage';
import EditInvoicePage from '@/pages/invoices/EditInvoicePage';
import InvoiceSettingsPage from '@/pages/invoices/InvoiceSettingsPage';
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
import { getCustomers, getProducts, getLicenses, getStorageStats, getEmailLogs, getEmailRequests, getDomainRequests, getHostingRequests, getHostingPackages, getHostingPlans, getAdminNotifications, getUnreadTicketCount, updateCustomer, addNotification } from '@/lib/storage';

import AdminTicketsPage from '@/components/admin/AdminTicketsPage';
import AdminActivityLogPage from '@/components/admin/AdminActivityLogPage';
import MaintenanceModePage from '@/components/admin/MaintenanceModePage';

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: Home, section: 'top' },
  { section: 'divider' },
  { section: 'header', label: 'CUSTOMERS' },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'logs', label: 'Support Tickets', icon: MessageSquare, badgeType: 'orange' },
  { id: 'notifications', label: 'Announcements', icon: Megaphone },
  { section: 'header', label: 'SERVICES' },
  // { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'hosting', label: 'Hosting', icon: Server },
  { id: 'products', label: 'Products', icon: Package },
  { section: 'header', label: 'REQUESTS' },
  { id: 'domainsRequests', label: 'Domain Requests', icon: ClipboardList, badgeType: 'orange' },
  { id: 'hostingRequests', label: 'Hosting Requests', icon: Zap, badgeType: 'orange' },
  { id: 'emailRequests', label: 'Email Requests', icon: Star, badgeType: 'orange' },
  { section: 'header', label: 'ACTIVE SERVICES' },
  { id: 'approvedHostings', label: 'Active Domains', icon: CheckCircle, badgeType: 'green' },
  { id: 'activeHosting', label: 'Active Hosting', icon: CheckSquare, badgeType: 'green' },
  { id: 'approvedEmailsActive', label: 'Active Emails', icon: Mail, badgeType: 'green' },
  { section: 'header', label: 'BILLING' },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { section: 'header', label: 'SYSTEM' },
  { id: 'maintenance', label: 'Maintenance', icon: Shield },
  { id: 'activityLog', label: 'Activity Logs', icon: Activity },
  // { id: 'adminManagement', label: 'Admin Management', icon: Shield },
  // { id: 'systemSettings', label: 'System Settings', icon: Settings },
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

function Dashboard({ onLogout }) {
  const [active, setActive] = useState('overview');
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
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAssignProductOpen, setIsAssignProductOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [markedReadAt, setMarkedReadAt] = useState(() => localStorage.getItem('adminNotifReadAt'));
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminNotifReadIds') || '[]'); } catch { return []; }
  });

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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [unreadTicketCount, setUnreadTicketCount] = useState(0);

  useEffect(() => {
    if (active !== 'invoices') { setInvoiceView('list'); setEditInvoiceId(null); }
    if (active !== 'customerProfile') setSelectedCustomer(null);
    if (active === 'invoices') markInvoicesRead();
  }, [active]);
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
    ? { bg: '#15161A', sidebar: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0', card: '#1C1E24', panel2: '#22252C', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35' }
    : { bg: '#f8f8f7', sidebar: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0', text: '#1a1a1a', subText: '#888', card: '#fff', panel2: '#f5f5f5', hover: '#f5f5f5', brand: '#e87b35' };

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
    document.documentElement.classList.toggle('dashboard-dark', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cus, prd, lic, sts, lgs, emailReqs, domReq, hostReq, hostPkg, adminN, hostPlans] = await Promise.all([
        getCustomers(), getProducts(), getLicenses(), getStorageStats(), getEmailLogs(), getEmailRequests(), getDomainRequests(), getHostingRequests(), getHostingPackages(), getAdminNotifications(), getHostingPlans()
      ]);
      setAdminNotifs(adminN || []);
      const utc = await getUnreadTicketCount().catch(() => 0);
      setUnreadTicketCount(utc);
      setCustomers(cus || []); setProducts(prd || []); setLicenses(lic || []);
      setStats(sts || {}); setEmailLogs(lgs || []);
      setEmailRequests(emailReqs || []);
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
        detailsLabel: r.package_name || '-'
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

      setRequests(allReq);
      setPendingRequests(pendingReqRows);
      setPendingRequestsCount(pendingReqRows.length);
      setHostingPlans(hostPlans || []);
      const approvedEmailStatuses = new Set(['approved', 'active', 'completed']);
      const activeEmails = (emailReqs || []).filter(r => approvedEmailStatuses.has(String(r.status || '').toLowerCase()));
      setActiveEmailsCount(activeEmails.length);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

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
    supabase.auth.updateUser({ data: { admin_notif_read_at: now, admin_notif_read_ids: next } });
  };

  const markNotifRead = (id) => {
    if (!id || readNotifIds.includes(id)) return;
    const next = [...readNotifIds, id];
    setReadNotifIds(next);
    localStorage.setItem('adminNotifReadIds', JSON.stringify(next));
    supabase.auth.updateUser({ data: { admin_notif_read_ids: next } });
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
    supabase.auth.updateUser({ data: { admin_notif_read_ids: next } });
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

  const handleLogout = async () => {
    await signOut();
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    const notifReadAt = localStorage.getItem('adminNotifReadAt');
    const notifReadIds = localStorage.getItem('adminNotifReadIds');
    sessionStorage.clear(); localStorage.clear();
    if (notifReadAt) localStorage.setItem('adminNotifReadAt', notifReadAt);
    if (notifReadIds) localStorage.setItem('adminNotifReadIds', notifReadIds);
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
      await updateCustomer(cu.id, { status: 'rejected' });
      await addNotification({
        customer_id: cu.id,
        type: 'account_rejected',
        title: 'Account Rejected',
        message: 'Your account registration has been rejected. Please contact support for assistance.',
      });
      toast({ title: 'Rejected', description: `${cu.name}'s account has been rejected.` });
      loadData();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to reject account.', variant: 'destructive' });
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
    switch (active) {
      case 'overview': return <OverviewContent stats={stats} customers={customers} requests={requests} hostingPlans={hostingPlans} pendingRequestsCount={pendingRequestsCount} onNavigate={navigateTo} onViewCustomer={cu => { setSelectedCustomer(cu); navigateTo('customerProfile'); }} onConfirmCustomer={handleConfirmCustomer} onRejectCustomer={handleRejectCustomer} c={c} isDark={isDark} isMobile={isMobile} />;
      case 'adminProfile': return <AdminProfileContent c={c} isDark={isDark} />;
      case 'customerProfile': return selectedCustomer ? <CustomerProfileAdminView customer={selectedCustomer} onBack={() => navigateTo('overview')} isDark={isDark} /> : null;
      case 'adminNotifications': return <AllAdminNotificationsPage notifications={adminNotifs} requests={requests} customers={customers} onNavigate={navigateTo} c={c} isDark={isDark} isMobile={isMobile} />;
      case 'customers': return <AdminCustomerManagement products={products} onSuccess={loadData} isDark={isDark} />;
      case 'domains': return <AdminDomainManagement isDark={isDark} />;
      case 'approvedHostings': return <AdminDomainManagement isDark={isDark} />;
      case 'hosting': return <AdminHostingManagement isDark={isDark} isMobile={isMobile} />;
      case 'hostingRequests': return <AdminHostingRequestManagement isDark={isDark} />;
      case 'domainsRequests': return <AdminRequestManagement isDark={isDark} />;
      case 'products': return <ProductList products={products} onUpdate={loadData} isDark={isDark} c={c} />;
      case 'notifications': return <AdminNotificationManagement isDark={isDark} isMobile={isMobile} />;
      case 'logs': return <AdminTicketsPage c={c} isDark={isDark} isMobile={isMobile} />;
      case 'invoices': {
        const goList = () => { setEditInvoiceId(null); setInvoiceView('list'); };
        if (invoiceView === 'new') return <NewInvoicePage c={c} isDark={isDark} onBack={goList} />;
        if (invoiceView === 'edit' && editInvoiceId) return <EditInvoicePage c={c} isDark={isDark} invoiceId={editInvoiceId} onBack={goList} />;
        if (invoiceView === 'settings') return <InvoiceSettingsPage c={c} isDark={isDark} onBack={goList} />;
        return <InvoicesPage c={c} isDark={isDark} onNew={() => setInvoiceView('new')} onEdit={id => { setEditInvoiceId(id); setInvoiceView('edit'); }} onSettings={() => setInvoiceView('settings')} />;
      }
      case 'maintenance': return <MaintenanceModePage isDark={isDark} />;
      case 'activityLog': return <AdminActivityLogPage isDark={isDark} />;
      case 'emailRequests': return <AdminEmailRequestManagement isDark={isDark} />;
      case 'approvedEmailsActive': return <AdminApprovedEmails isDark={isDark} />;
      case 'activeHosting': return <AdminApprovedHostings isDark={isDark} />;
      case 'adminManagement': return <div style={{ padding: 32, color: c.subText, textAlign: 'center', fontSize: 13 }}>Admin management page coming soon.</div>;
      case 'systemSettings': return <div style={{ padding: 32, color: c.subText, textAlign: 'center', fontSize: 13 }}>System settings page coming soon.</div>;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', background: c.bg, color: c.text, fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden', position: 'relative' }}>
      {!isMobile && (
        <div style={{ width: sidebarOpen ? 240 : 80, background: c.sidebar, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', transition: 'width 0.2s', zIndex: 10, flexShrink: 0 }}>
          <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: c.brand, fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{sidebarOpen ? 'NEXTIOM' : 'ex'}</div>
              {sidebarOpen && <span style={{ color: c.subText, fontSize: 14 }}>Admin</span>}
            </div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', display: 'flex', padding: 2 }}>
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
            {NAV.map((item, i) => {
              if (item.section === 'divider') return <div key={`div-${i}`} style={{ height: 12 }} />;
              if (item.section === 'header') {
                if (!sidebarOpen) return <div key={`h-${i}`} style={{ height: 4 }} />;
                return <div key={`h-${i}`} style={{ fontSize: 10, color: c.subText, padding: '0 12px 8px', fontWeight: 600, letterSpacing: 1, marginTop: i > 0 ? 4 : 0 }}>{item.label}</div>;
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
                if (isItem.id === 'approvedHostings') { badge = requests.filter(r => r.source === 'domain' && String(r.status).toLowerCase() === 'approved').length; }
                else if (isItem.id === 'activeHosting') { badge = requests.filter(r => r.source === 'hosting' && String(r.status || '').toLowerCase() === 'approved').length; }
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
              <button onClick={() => setIsSettingsOpen(true)} style={{ display: 'flex', justifyContent: 'center', background: c.hover, border: 'none', color: c.text, padding: 8, borderRadius: 8, cursor: 'pointer', flex: 1 }}>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 29 }}
          />
          <div style={{ position: 'fixed', inset: '0 auto 0 0', width: 288, maxWidth: '88vw', background: c.sidebar, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', zIndex: 30, boxShadow: '8px 0 28px rgba(0,0,0,0.3)' }}>
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
                if (item.section === 'header') return <div key={`mh-${i}`} style={{ fontSize: 10, color: c.subText, padding: '0 12px 8px', fontWeight: 600, letterSpacing: 1, marginTop: i > 0 ? 4 : 0 }}>{item.label}</div>;
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
                  if (item.id === 'approvedHostings') { badge = requests.filter(r => r.source === 'domain' && String(r.status).toLowerCase() === 'approved').length; }
                  else if (item.id === 'activeHosting') { badge = requests.filter(r => r.source === 'hosting' && String(r.status || '').toLowerCase() === 'approved').length; }
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
                <button onClick={() => setIsSettingsOpen(true)} style={{ display: 'flex', justifyContent: 'center', background: c.hover, border: 'none', color: c.text, padding: 8, borderRadius: 8, cursor: 'pointer', flex: 1 }}>
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className={isDark ? 'dashboard-dark' : ''}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: isMobile ? '12px 16px' : '24px 32px', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: isMobile ? `1px solid ${c.border}` : 'none', background: isMobile ? c.sidebar : 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button onClick={() => (isMobile ? setIsMobileSidebarOpen(true) : setSidebarOpen(!sidebarOpen))} style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Menu size={20} />
            </button>
            <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{NAV.find(n => n.id === active)?.label || 'Dashboard'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
            <button onClick={() => setIsDark(!isDark)} style={{ background: c.card, border: `1px solid ${c.border}`, color: c.text, padding: 8, borderRadius: 8, cursor: 'pointer' }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <div onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} style={{ border: `1px solid ${c.border}`, background: c.card, width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Bell size={16} style={{ color: unreadCount > 0 ? c.brand : c.subText }} />
                {unreadCount > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, background: c.brand, borderRadius: 8, fontSize: 10, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</div>}
              </div>
              {isNotificationsOpen && (
                <div style={{ position: 'absolute', top: 44, right: 0, width: 320, background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 50, display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
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
                        const rowStyle = { padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer', background: isUnread ? (isDark ? 'rgba(232,123,53,0.10)' : 'rgba(232,123,53,0.07)') : 'transparent', transition: 'background 0.15s' };
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
                              onClick={() => { markNotifRead(item.key); setActive(r.source === 'domain' ? 'domainsRequests' : 'hostingRequests'); setIsNotificationsOpen(false); }}>
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
                        return (
                          <div key={'notif' + (n.id || i)} style={rowStyle}
                            onClick={() => {
                              markNotifRead(item.key);
                              const isEmailRequest = n.type === 'email_request' || String(n.title || '').toLowerCase().includes('email request') || String(n.title || '').toLowerCase().includes('email');
                              setActive(isEmailRequest ? 'emailRequests' : isPayment ? 'invoices' : 'adminNotifications');
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

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 16px 20px' : '0 32px 32px' }}>
          {renderContent()}
        </div>
      </div>
      <AddCustomerDialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} onSuccess={loadData} />
      <AddProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} onSuccess={loadData} isDark={isDark} c={c} />
      <AssignProductDialog open={isAssignProductOpen} onOpenChange={setIsAssignProductOpen} customers={customers} products={products} onSuccess={loadData} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} onUpdate={loadData} isDark={isDark} />
    </div>
  );
}

function NavItem({ item, active, setActive, open, c, badge = 0, badgeColor, dot = false, onSelectMobile }) {
  const isActive = active === item.id;
  const color = isActive ? c.text : c.subText;
  const bc = badgeColor || c.brand;
  return (
    <button onClick={() => { setActive(item.id); if (onSelectMobile) onSelectMobile(); }} style={{
      display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center', gap: 12, padding: open ? '10px 12px' : '10px 0', width: '100%', border: 'none',
      background: isActive ? c.hover : 'transparent', borderRadius: 8, cursor: 'pointer',
      borderLeft: isActive ? `3px solid ${c.brand}` : '3px solid transparent', marginBottom: 4, transition: 'all 0.1s'
    }}>
      <div style={{ position: 'relative', flexShrink: 0, marginLeft: open ? 0 : -3 }}>
        <item.icon size={18} color={isActive ? c.brand : c.subText} />
        {badge > 0 && <span style={{ position: 'absolute', top: -5, right: -6, width: 14, height: 14, background: bc, borderRadius: '50%', fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{badge > 9 ? '9+' : badge}</span>}
        {dot && badge === 0 && <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: c.brand, borderRadius: '50%', border: `2px solid ${c.sidebar}` }} />}
      </div>
      {open && <span style={{ fontSize: 14, color, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>}
    </button>
  );
}

const AVATAR_COLORS = ['#e87b35', '#e85d5d', '#378ADD', '#639922', '#BA7517', '#8b5cf6'];
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
  const approvedDomains = requests.filter(r => r.source === 'domain' && String(r.status || '').toLowerCase() === 'approved').length;
  const pendingCustomers = customers.filter(cu => String(cu.status || '').toLowerCase() === 'pending');
  const initials = name => (name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

  const statCards = [
    { label: 'Total customers', value: customers.length || 0, icon: <Users size={18} color={c.brand} />, sub: '↑ +12 this month', subColor: '#639922', bg: isDark ? '#3d2518' : '#fff5ee', sparkColor: c.brand },
    { label: 'Active domains', value: approvedDomains, icon: <CheckCircle size={18} color="#378ADD" />, sub: `${stats.expiringSoon || 0} expiring soon`, subColor: '#378ADD', bg: isDark ? '#1a2736' : '#e6f1fb', sparkColor: '#378ADD' },
    { label: 'Hosting packages', value: hostingPlans.length || 0, icon: <Server size={18} color="#639922" />, sub: 'All active', subColor: '#639922', bg: isDark ? '#1e2e1e' : '#eaf3de', sparkColor: '#639922' },
    { label: 'Pending requests', value: pendingRequestsCount || 0, icon: <Star size={18} color="#BA7517" />, sub: 'Needs review', subColor: '#BA7517', bg: isDark ? '#382512' : '#faeeda', sparkColor: '#BA7517' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Good day, Admin</h1>
        <p style={{ fontSize: 14, color: c.subText }}>Here's what's happening with your portal today.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16 }}>
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'flex-start', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Pending Customers</div>
              <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>Awaiting admin confirmation</div>
            </div>
            <button onClick={() => onNavigate('customers')} style={{ color: c.brand, background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>View all →</button>
          </div>
          <div style={{ overflowY: 'auto', overflowX: 'auto', maxHeight: 320, marginTop: 8 }}>
            <table style={{ width: '100%', minWidth: isMobile ? 620 : '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: c.card, zIndex: 1 }}>
                <tr style={{ color: c.subText, fontSize: 11, letterSpacing: '0.05em' }}>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'left', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'left', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'left', textTransform: 'uppercase' }}>Joined</th>
                  <th style={{ paddingBottom: 10, fontWeight: 500, textAlign: 'right', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingCustomers.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: c.subText }}>No pending customers</td></tr>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>New requests</div>
                <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>Awaiting your review</div>
              </div>
              <button onClick={() => onNavigate('hostingRequests')} style={{ color: c.brand, background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>View all →</button>
            </div>
            <div style={{ marginTop: 16 }}>
              {requests.slice(0, 4).map((r, i) => {
                const isHosting = r.source === 'hosting';
                const col = avatarColor(r.n);
                const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                  <div key={r.id || i} onClick={() => onNavigate(r.source === 'hosting' ? 'hostingRequests' : 'domainsRequests')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${c.border}`, cursor: 'pointer' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(r.n)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.n}</div>
                      <div style={{ fontSize: 11, color: c.subText }}>{r.reqType}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ background: isHosting ? 'rgba(55,138,221,0.15)' : 'rgba(99,153,34,0.15)', color: isHosting ? '#5b9aff' : '#639922', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>{isHosting ? 'Hosting' : 'Domain'}</span>
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

function AllAdminNotificationsPage({ notifications, requests, customers, onNavigate, c, isDark, isMobile = false }) {
  const pendingReqs = requests.filter(r => String(r.status || '').toLowerCase() === 'pending');
  const recentCustomers = customers.filter(c => c.status === 'pending').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Keep internal admin actions in Activity Logs, not in admin notification UI
  const filteredNotifications = (notifications || []).filter(n =>
    !isAdminInternalNotification(n)
  );

  const allItems = [
    ...pendingReqs.map(r => ({ type: 'request', source: r.source, title: `${r.n} — ${r.reqType}`, sub: r.source === 'domain' ? 'Domain Request' : 'Hosting Request', date: r.created_at, id: r.id })),
    ...recentCustomers.map(cu => ({ type: 'customer', title: `New Customer: ${cu.name}`, sub: cu.email || '', date: cu.created_at, id: cu.id, customer: cu })),
    ...filteredNotifications.map(n => ({ type: 'notification', title: n.title || 'Notification', sub: n.message || '', date: n.created_at, id: n.id, nType: n.type })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const typeColor = t => t === 'request' ? '#8b5cf6' : t === 'customer' ? '#639922' : '#378ADD';
  const typeLabel = item => item.type === 'request' ? (item.source === 'domain' ? 'Domain' : 'Hosting') : item.type === 'customer' ? 'New User' : 'Notification';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => onNavigate('overview')} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', fontSize: 13 }}>← Back</button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: c.text }}>All Notifications</h2>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 2 }}>Pending requests, new customers, and system notifications</p>
        </div>
      </div>


      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{allItems.length} items</span>
        </div>
        {allItems.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: c.subText, fontSize: 13 }}>No notifications</div>}
        {allItems.map((item, i) => (
          <div key={item.id + i} onClick={() => { if (item.type === 'request') onNavigate(item.source === 'domain' ? 'domainsRequests' : 'hostingRequests'); else if (item.type === 'customer') onNavigate('customers'); }} style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 14, cursor: item.type !== 'notification' ? 'pointer' : 'default', transition: 'background 0.1s', flexWrap: isMobile ? 'wrap' : 'nowrap' }} onMouseEnter={e => e.currentTarget.style.background = c.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
