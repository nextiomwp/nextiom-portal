import React, { useState, useEffect } from 'react';
import { Users, Globe, Server, Star, Bell, Plus, LogOut, Settings, LayoutDashboard, FileText, MessageSquare, Package, ClipboardList, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AdminCustomerManagement from '@/components/admin/AdminCustomerManagement';
import AdminNotificationManagement from '@/components/admin/AdminNotificationManagement';
import AdminDomainManagement from '@/components/admin/AdminDomainManagement';
import AdminRequestManagement from '@/components/admin/AdminRequestManagement';
import AdminHostingManagement from '@/components/admin/AdminHostingManagement';
import AdminHostingRequestManagement from '@/components/admin/AdminHostingRequestManagement';
import AddCustomerDialog from '@/components/dialogs/AddCustomerDialog';
import AddProductDialog from '@/components/dialogs/AddProductDialog';
import AssignProductDialog from '@/components/dialogs/AssignProductDialog';
import SettingsDialog from '@/components/dialogs/SettingsDialog';
import CustomerList from '@/components/dashboard/CustomerList';
import ProductList from '@/components/dashboard/ProductList';
import EmailLogList from '@/components/dashboard/EmailLogList';
import StatsCard from '@/components/dashboard/StatsCard';
import { getCustomers, getProducts, getLicenses, getStorageStats, getEmailLogs } from '@/lib/storage';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, section: 'main' },
  { id: 'customers', label: 'Customers', icon: Users, section: 'main' },
  { id: 'domains', label: 'Domains', icon: Globe, section: 'main' },
  { id: 'hosting', label: 'Hosting', icon: Server, section: 'main' },
  { id: 'hostingRequests', label: 'Hosting Requests', icon: MessageSquare, section: 'manage' },
  { id: 'domainsRequests', label: 'Domain Requests', icon: ClipboardList, section: 'manage' },
  { id: 'products', label: 'Products', icon: Package, section: 'manage' },
  { id: 'notifications', label: 'Notifications', icon: Bell, section: 'manage' },
  { id: 'logs', label: 'Email Logs', icon: FileText, section: 'manage' },
];

function Dashboard({ onLogout }) {
  const [active, setActive] = useState('overview');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0, totalDomains: 0, activeMemberships: 0, expiringSoon: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAssignProductOpen, setIsAssignProductOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [c, p, l, s, logs] = await Promise.all([
        getCustomers(), getProducts(), getLicenses(), getStorageStats(), getEmailLogs()
      ]);
      setCustomers(c || []);
      setProducts(p || []);
      setLicenses(l || []);
      setStats(s || {});
      setEmailLogs(logs || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDataUpdate = () => {
    loadData();
    toast({ title: 'Updated', description: 'Dashboard refreshed' });
  };

  const mainNav = NAV.filter(n => n.section === 'main');
  const manageNav = NAV.filter(n => n.section === 'manage');

  const renderContent = () => {
    if (isLoading) return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );

    switch (active) {
      case 'overview': return <OverviewContent stats={stats} customers={customers} onNavigate={setActive} />;
      case 'customers': return <CustomerList customers={customers} licenses={licenses} products={products} onUpdate={handleDataUpdate} onAssignProduct={() => setIsAssignProductOpen(true)} />;
      case 'domains': return <AdminDomainManagement />;
      case 'hosting': return <AdminHostingManagement />;
      case 'hostingRequests': return <AdminHostingRequestManagement />;
      case 'domainsRequests': return <AdminRequestManagement />;
      case 'products': return <ProductList products={products} onUpdate={handleDataUpdate} />;
      case 'notifications': return <AdminNotificationManagement />;
      case 'logs': return <EmailLogList logs={emailLogs} />;
      default: return null;
    }
  };

  const currentPage = NAV.find(n => n.id === active);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f8f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '220px' : '60px',
        background: '#fff',
        borderRight: '1px solid #ebebeb',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="https://horizons-cdn.hostinger.com/147148b5-9ad3-49b5-a69f-decad9e9a152/c4356b200db1f138597a66d14c006177.jpg"
            alt="Logo"
            style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
          />
          {sidebarOpen && <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a', whiteSpace: 'nowrap' }}>Nextiom Admin</span>}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          {sidebarOpen && <div style={{ fontSize: 10, color: '#aaa', padding: '4px 8px 6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Main</div>}
          {mainNav.map(item => (
            <NavItem key={item.id} item={item} active={active} setActive={setActive} open={sidebarOpen} />
          ))}
          {sidebarOpen && <div style={{ fontSize: 10, color: '#aaa', padding: '12px 8px 6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Manage</div>}
          {!sidebarOpen && <div style={{ borderTop: '1px solid #ebebeb', margin: '8px 0' }} />}
          {manageNav.map(item => (
            <NavItem key={item.id} item={item} active={active} setActive={setActive} open={sidebarOpen} />
          ))}
        </div>

        {/* Bottom */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => setIsSettingsOpen(true)} style={navBtnStyle}>
            <Settings size={16} color="#888" />
            {sidebarOpen && <span style={{ fontSize: 13, color: '#555' }}>Settings</span>}
          </button>
          <button onClick={handleLogout} style={navBtnStyle}>
            <LogOut size={16} color="#e87b35" />
            {sidebarOpen && <span style={{ fontSize: 13, color: '#e87b35' }}>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          background: '#fff',
          borderBottom: '1px solid #ebebeb',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#888' }}>
              <div style={{ width: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ height: 1.5, background: 'currentColor', borderRadius: 1 }} />
                <div style={{ height: 1.5, background: 'currentColor', borderRadius: 1 }} />
                <div style={{ height: 1.5, background: 'currentColor', borderRadius: 1 }} />
              </div>
            </button>
            <div style={{ fontSize: 14, color: '#888' }}>
              <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{currentPage?.label || 'Dashboard'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setIsAddCustomerOpen(true)} style={{
              background: '#e87b35', color: '#fff', border: 'none',
              padding: '7px 14px', borderRadius: 8, fontSize: 12,
              fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Plus size={14} /> Add Customer
            </button>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e87b35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>A</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {renderContent()}
        </div>
      </div>

      <AddCustomerDialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} onSuccess={handleDataUpdate} />
      <AddProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} onSuccess={handleDataUpdate} />
      <AssignProductDialog open={isAssignProductOpen} onOpenChange={setIsAssignProductOpen} customers={customers} products={products} onSuccess={handleDataUpdate} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} onUpdate={handleDataUpdate} />
    </div>
  );
}

const navBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px', background: 'none', border: 'none',
  cursor: 'pointer', width: '100%', borderRadius: 6,
  transition: 'background 0.1s'
};

function NavItem({ item, active, setActive, open }) {
  const Icon = item.icon;
  const isActive = active === item.id;
  return (
    <button
      onClick={() => setActive(item.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px', width: '100%', border: 'none',
        background: isActive ? '#fff5ee' : 'none',
        borderRadius: 6, cursor: 'pointer',
        borderLeft: isActive ? '2px solid #e87b35' : '2px solid transparent',
        transition: 'all 0.1s', marginBottom: 2
      }}
    >
      <Icon size={16} color={isActive ? '#e87b35' : '#888'} style={{ flexShrink: 0 }} />
      {open && <span style={{ fontSize: 13, color: isActive ? '#e87b35' : '#555', fontWeight: isActive ? 500 : 400, whiteSpace: 'nowrap' }}>{item.label}</span>}
    </button>
  );
}

function OverviewContent({ stats, customers, onNavigate }) {
  const statCards = [
    { label: 'Total customers', value: stats.totalCustomers || 0, color: '#e87b35', bg: '#fff5ee', sub: 'Registered users' },
    { label: 'Active domains', value: stats.totalDomains || 0, color: '#378ADD', bg: '#e6f1fb', sub: `${stats.expiringSoon || 0} expiring soon` },
    { label: 'Hosting packages', value: stats.activeMemberships || 0, color: '#639922', bg: '#eaf3de', sub: 'Active plans' },
    { label: 'Action required', value: (stats.expiringSoon || 0) + (stats.expired || 0), color: '#BA7517', bg: '#faeeda', sub: 'Needs attention' },
  ];

  const recentCustomers = customers.slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Good day, Admin</h1>
        <p style={{ fontSize: 13, color: '#888' }}>Here's what's happening with your portal today.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, padding: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent customers */}
      <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>Recent customers</span>
          <button onClick={() => onNavigate('customers')} style={{ fontSize: 12, color: '#e87b35', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ChevronRight size={12} />
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Name', 'Email', 'Joined'].map(h => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#aaa', fontWeight: 400, borderBottom: '1px solid #ebebeb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentCustomers.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '24px 20px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>No customers yet</td></tr>
            ) : recentCustomers.map((c, i) => (
              <tr key={c.id || i} style={{ borderBottom: i < recentCustomers.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#e87b35', flexShrink: 0 }}>
                      {(c.name || 'U')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{c.name || 'Unknown'}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#555' }}>{c.email || '-'}</td>
                <td style={{ padding: '12px 20px', fontSize: 12, color: '#aaa' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
