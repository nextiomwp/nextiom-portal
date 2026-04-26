import React, { useState, useEffect } from 'react';
import { Users, Globe, Server, Star, Bell, Plus, LogOut, Settings, LayoutDashboard, FileText, MessageSquare, Package, ClipboardList, ChevronRight, Loader2, Moon, Sun, CheckCircle, Menu } from 'lucide-react';
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
import { getCustomers, getProducts, getLicenses, getStorageStats, getEmailLogs, getDomainRequests, getHostingRequests, getHostingPackages } from '@/lib/storage';

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
  const [requests, setRequests] = useState([]);
  const [hostingPlans, setHostingPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAssignProductOpen, setIsAssignProductOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();

  const c = isDark
    ? { bg: '#1c1c1c', sidebar: '#252525', border: '#333', text: '#fff', subText: '#a0a0a0', card: '#2a2a2a', hover: '#3a3a3a', brand: '#e87b35' }
    : { bg: '#f8f8f7', sidebar: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', card: '#fff', hover: '#f5f5f5', brand: '#e87b35' };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cus, prd, lic, sts, lgs, domReq, hostReq, hostPkg] = await Promise.all([
        getCustomers(), getProducts(), getLicenses(), getStorageStats(), getEmailLogs(), getDomainRequests(), getHostingRequests(), getHostingPackages()
      ]);
      setCustomers(cus || []); setProducts(prd || []); setLicenses(lic || []);
      setStats(sts || {}); setEmailLogs(lgs || []);
      const allReq = [...(domReq || []).map(r => ({ ...r, reqType: r.details?.domain ? 'Domain registration' : 'Domain request', n: r.customers?.name || 'Unknown' })), ...(hostReq || []).map(r => ({ ...r, reqType: r.details?.package ? 'Hosting new' : 'Hosting request', n: r.customers?.name || 'Unknown' }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRequests(allReq); setHostingPlans(hostPkg || []);
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
    sessionStorage.clear(); localStorage.clear();
    window.location.replace('/');
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
    switch (active) {
      case 'overview': return <OverviewContent stats={stats} customers={customers} requests={requests} hostingPlans={hostingPlans} onNavigate={setActive} c={c} isDark={isDark} />;
      case 'customers': return <CustomerList customers={customers} licenses={licenses} products={products} onUpdate={loadData} onAssignProduct={() => setIsAssignProductOpen(true)} />;
      case 'domains': return <AdminDomainManagement />;
      case 'hosting': return <AdminHostingManagement />;
      case 'hostingRequests': return <AdminHostingRequestManagement />;
      case 'domainsRequests': return <AdminRequestManagement />;
      case 'products': return <ProductList products={products} onUpdate={loadData} />;
      case 'notifications': return <AdminNotificationManagement />;
      case 'logs': return <EmailLogList logs={emailLogs} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: sidebarOpen ? 240 : 80, background: c.sidebar, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', transition: 'width 0.2s', zIndex: 10 }}>
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 8, borderBottom: `1px solid ${c.border}` }}>
          <div style={{ color: c.brand, fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{sidebarOpen ? 'NEXTIOM' : 'ex'}</div>
          {sidebarOpen && <span style={{ color: c.subText, fontSize: 14 }}>Admin</span>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {sidebarOpen && <div style={{ fontSize: 10, color: c.subText, padding: '0 12px 8px', fontWeight: 600, letterSpacing: 1 }}>MAIN</div>}
          {NAV.filter(n => n.section === 'main').map(i => <NavItem key={i.id} item={i} active={active} setActive={setActive} open={sidebarOpen} c={c} />)}
          <div style={{ height: 24 }} />
          {sidebarOpen && <div style={{ fontSize: 10, color: c.subText, padding: '0 12px 8px', fontWeight: 600, letterSpacing: 1 }}>MANAGE</div>}
          {NAV.filter(n => n.section === 'manage').map(i => <NavItem key={i.id} item={i} active={active} setActive={setActive} open={sidebarOpen} c={c} />)}
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className={isDark ? 'dashboard-dark' : ''}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 32px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Menu size={20} />
            </button>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{NAV.find(n => n.id === active)?.label || 'Dashboard'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setIsDark(!isDark)} style={{ background: c.card, border: `1px solid ${c.border}`, color: c.text, padding: 8, borderRadius: 8, cursor: 'pointer' }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div style={{ border: `1px solid ${c.border}`, background: c.card, width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={16} style={{ color: c.subText }} />
            </div>
            <div style={{ background: c.brand, width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>A</div>
            <button onClick={() => setIsAddCustomerOpen(true)} style={{ background: c.sidebar, color: c.text, border: `1px solid ${c.border}`, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Plus size={16} /> Add Customer
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
          {renderContent()}
        </div>
      </div>
      <AddCustomerDialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} onSuccess={loadData} />
      <AddProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} onSuccess={loadData} />
      <AssignProductDialog open={isAssignProductOpen} onOpenChange={setIsAssignProductOpen} customers={customers} products={products} onSuccess={loadData} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} onUpdate={loadData} />
    </div>
  );
}

function NavItem({ item, active, setActive, open, c }) {
  const isActive = active === item.id;
  const color = isActive ? c.text : c.subText;
  return (
    <button onClick={() => setActive(item.id)} style={{
      display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center', gap: 12, padding: open ? '10px 12px' : '10px 0', width: '100%', border: 'none',
      background: isActive ? c.hover : 'transparent', borderRadius: 8, cursor: 'pointer',
      borderLeft: isActive ? `3px solid ${c.brand}` : '3px solid transparent', marginBottom: 4, transition: 'all 0.1s'
    }}>
      <item.icon size={18} color={isActive ? c.brand : c.subText} style={{ flexShrink: 0, marginLeft: open ? 0 : -3 }} />
      {open && <span style={{ fontSize: 14, color, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>}
    </button>
  );
}

function OverviewContent({ stats, customers, requests, hostingPlans, onNavigate, c, isDark }) {
  const statCards = [
    { label: 'Total customers', value: stats.totalCustomers || 0, icon: <Users size={18} color={c.brand} />, sub: '+12 this month', subColor: '#639922', bg: isDark ? '#3d2518' : '#fff5ee' },
    { label: 'Active domains', value: stats.totalDomains || 0, icon: <CheckCircle size={18} color="#378ADD" />, sub: `${stats.expiringSoon || 0} expiring soon`, subColor: '#378ADD', bg: isDark ? '#1a2736' : '#e6f1fb' },
    { label: 'Hosting packages', value: stats.activeMemberships || 0, icon: <Server size={18} color="#639922" />, sub: 'All active', subColor: '#639922', bg: isDark ? '#1e2e1e' : '#eaf3de' },
    { label: 'Pending requests', value: stats.expired || 0, icon: <Star size={18} color="#BA7517" />, sub: 'Needs review', subColor: '#BA7517', bg: isDark ? '#382512' : '#faeeda' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Good day, Admin</h1>
        <p style={{ fontSize: 14, color: c.subText }}>Here's what's happening with your portal today.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              {s.icon}
            </div>
            <div style={{ fontSize: 13, color: c.subText, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.subColor, fontWeight: 500 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Recent customers</span>
            <button onClick={() => onNavigate('customers')} style={{ color: c.brand, background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>View all</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: c.subText, fontSize: 12, borderBottom: `1px solid ${c.border}` }}>
                <th style={{ paddingBottom: 12, fontWeight: 500 }}>Name</th>
                <th style={{ paddingBottom: 12, fontWeight: 500 }}>Domain</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 4).map((cu, i) => (
                <tr key={cu.id || i} style={{ borderBottom: i < 3 ? `1px solid ${c.border}` : 'none' }}>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{cu.name}</div>
                    <div style={{ fontSize: 12, color: c.subText }}>{cu.email}</div>
                  </td>
                  <td style={{ padding: '12px 0', fontSize: 14, fontWeight: 500 }}>{cu.domain || cu.name?.toLowerCase().replace(' ', '') + '.lk'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>New requests</span>
              <button onClick={() => onNavigate('hostingRequests')} style={{ color: c.brand, background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>View all</button>
            </div>
            {requests.slice(0, 3).map((r, i) => {
              const bgCols = ['#1e3a5f', '#1e4028', '#4a3f15'];
              const txtCols = ['#5b9aff', '#639922', '#ba7517'];
              return (
                <div key={r.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 2 ? 16 : 0 }}>
                  <div style={{ width: 36, height: 36, background: bgCols[i % 3], borderRadius: '50%', color: txtCols[i % 3], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                    {(r.n || 'UN').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.n}</div>
                    <div style={{ fontSize: 12, color: c.subText }}>{r.reqType}</div>
                  </div>
                  <div style={{ fontSize: 11, color: c.subText }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
            {requests.length === 0 && <div style={{ fontSize: 13, color: c.subText }}>No new requests</div>}
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Hosting plans</div>
            {(() => {
              const counts = { 'Shared Hosting': 0, 'VPS Hosting': 0, 'Cloud Hosting': 0 };
              hostingPlans.forEach(p => {
                const t = p.type || (p.package_name && p.package_name.includes('VPS') ? 'VPS Hosting' : p.package_name && p.package_name.includes('Cloud') ? 'Cloud Hosting' : 'Shared Hosting');
                counts[t] = (counts[t] || 0) + 1;
              });
              const total = hostingPlans.length || 1;
              return [{ n: 'Shared', v: counts['Shared Hosting'] || 0, bg: c.brand }, { n: 'VPS', v: counts['VPS Hosting'] || 0, bg: '#378ADD' }, { n: 'Cloud', v: counts['Cloud Hosting'] || 0, bg: '#639922' }].map(p => (
                <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 48, fontSize: 13, color: c.text }}>{p.n}</div>
                  <div style={{ flex: 1, height: 6, background: isDark ? '#333' : '#ebebeb', borderRadius: 3 }}>
                    <div style={{ width: `${Math.round((p.v / total) * 100)}%`, height: '100%', background: p.bg, borderRadius: 3 }} />
                  </div>
                  <div style={{ width: 32, fontSize: 12, color: c.subText, textAlign: 'right' }}>{Math.round((p.v / total) * 100)}%</div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
