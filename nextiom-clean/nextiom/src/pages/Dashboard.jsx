import React, { useState, useEffect } from 'react';
import { Users, Globe, Server, Star, Bell, Plus, LogOut, Settings, LayoutDashboard, FileText, MessageSquare, Package, ClipboardList, ChevronRight, Loader2, Moon, Sun, CheckCircle, Menu, Receipt } from 'lucide-react';
import InvoicesPage from '@/pages/invoices/InvoicesPage';
import NewInvoicePage from '@/pages/invoices/NewInvoicePage';
import EditInvoicePage from '@/pages/invoices/EditInvoicePage';
import InvoiceSettingsPage from '@/pages/invoices/InvoiceSettingsPage';
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
import ProductList from '@/components/dashboard/ProductList';
import EmailLogList from '@/components/dashboard/EmailLogList';
import CustomerProfileAdminView from '@/components/admin/CustomerProfileAdminView';
import { getCustomers, getProducts, getLicenses, getStorageStats, getEmailLogs, getDomainRequests, getHostingRequests, getHostingPackages, getAdminNotifications } from '@/lib/storage';

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
  { id: 'invoices', label: 'Invoices', icon: Receipt, section: 'manage' },
];

function Dashboard({ onLogout }) {
  const [active, setActive] = useState('overview');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0, totalDomains: 0, activeMemberships: 0, expiringSoon: 0, expired: 0 });
  const [requests, setRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [hostingPlans, setHostingPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAssignProductOpen, setIsAssignProductOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [markedReadAt, setMarkedReadAt] = useState(() => localStorage.getItem('adminNotifReadAt'));
  const [invoiceView, setInvoiceView] = useState('list');
  const [editInvoiceId, setEditInvoiceId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [adminNotifs, setAdminNotifs] = useState([]);

  useEffect(() => {
    if (active !== 'invoices') { setInvoiceView('list'); setEditInvoiceId(null); }
    if (active !== 'customerProfile') setSelectedCustomer(null);
  }, [active]);
  const { toast } = useToast();
  const { signOut } = useAuth();

  const c = isDark
    ? { bg: '#15161A', sidebar: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0', card: '#1C1E24', panel2: '#22252C', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35' }
    : { bg: '#f8f8f7', sidebar: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0', text: '#1a1a1a', subText: '#888', card: '#fff', panel2: '#f5f5f5', hover: '#f5f5f5', brand: '#e87b35' };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dashboard-dark', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cus, prd, lic, sts, lgs, domReq, hostReq, hostPkg, adminN] = await Promise.all([
        getCustomers(), getProducts(), getLicenses(), getStorageStats(), getEmailLogs(), getDomainRequests(), getHostingRequests(), getHostingPackages(), getAdminNotifications()
      ]);
      setAdminNotifs(adminN || []);
      setCustomers(cus || []); setProducts(prd || []); setLicenses(lic || []);
      setStats(sts || {}); setEmailLogs(lgs || []);
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

      const allReq = [...domainReqRows, ...hostingReqRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const pendingReqRows = allReq.filter(r => String(r.status || '').toLowerCase() === 'pending');

      setRequests(allReq);
      setPendingRequests(pendingReqRows);
      setPendingRequestsCount(pendingReqRows.length);
      setHostingPlans(hostReq || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem('adminNotifReadAt', now);
    setMarkedReadAt(now);
    setIsNotificationsOpen(false);
  };

  const unreadCount = markedReadAt
    ? pendingRequests.filter(r => new Date(r.created_at) > new Date(markedReadAt)).length
    : pendingRequestsCount;

  const handleLogout = async () => {
    await signOut();
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    const notifReadAt = localStorage.getItem('adminNotifReadAt');
    sessionStorage.clear(); localStorage.clear();
    if (notifReadAt) localStorage.setItem('adminNotifReadAt', notifReadAt);
    window.location.replace('/');
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
    switch (active) {
      case 'overview': return <OverviewContent stats={stats} customers={customers} requests={requests} hostingPlans={hostingPlans} pendingRequestsCount={pendingRequestsCount} onNavigate={setActive} onViewCustomer={cu => { setSelectedCustomer(cu); setActive('customerProfile'); }} c={c} isDark={isDark} />;
      case 'adminProfile': return <AdminProfileContent c={c} isDark={isDark} />;
      case 'customerProfile': return selectedCustomer ? <CustomerProfileAdminView customer={selectedCustomer} onBack={() => setActive('overview')} isDark={isDark} /> : null;
      case 'adminNotifications': return <AllAdminNotificationsPage notifications={adminNotifs} requests={requests} customers={customers} onNavigate={setActive} c={c} isDark={isDark} />;
      case 'customers': return <AdminCustomerManagement products={products} onSuccess={loadData} isDark={isDark} />;
      case 'domains': return <AdminDomainManagement isDark={isDark} />;
      case 'hosting': return <AdminHostingManagement isDark={isDark} />;
      case 'hostingRequests': return <AdminHostingRequestManagement isDark={isDark} />;
      case 'domainsRequests': return <AdminRequestManagement isDark={isDark} />;
      case 'products': return <ProductList products={products} onUpdate={loadData} />;
      case 'notifications': return <AdminNotificationManagement />;
      case 'logs': return <EmailLogList logs={emailLogs} />;
      case 'invoices': {
        const goList = () => { setEditInvoiceId(null); setInvoiceView('list'); };
        if (invoiceView === 'new') return <NewInvoicePage c={c} isDark={isDark} onBack={goList} />;
        if (invoiceView === 'edit' && editInvoiceId) return <EditInvoicePage c={c} isDark={isDark} invoiceId={editInvoiceId} onBack={goList} />;
        if (invoiceView === 'settings') return <InvoiceSettingsPage c={c} isDark={isDark} onBack={goList} />;
        return <InvoicesPage c={c} isDark={isDark} onNew={() => setInvoiceView('new')} onEdit={id => { setEditInvoiceId(id); setInvoiceView('edit'); }} onSettings={() => setInvoiceView('settings')} />;
      }
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
            <div style={{ position: 'relative' }}>
              <div onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} style={{ border: `1px solid ${c.border}`, background: c.card, width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Bell size={16} style={{ color: c.subText }} />
                {unreadCount > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, background: c.brand, borderRadius: 8, fontSize: 10, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</div>}
              </div>
              {isNotificationsOpen && (
                <div style={{ position: 'absolute', top: 44, right: 0, width: 320, background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 50, display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
                    <span style={{ fontWeight: 600, color: c.text }}>Pending Requests</span>
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {pendingRequests.slice(0, 10).map((r, i) => (
                      <div key={i} style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }} onClick={() => { setActive(r.source === 'domain' ? 'domainsRequests' : 'hostingRequests'); setIsNotificationsOpen(false); }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{r.n} — {r.reqType}</div>
                        <div style={{ fontSize: 12, color: c.subText }}>{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                    {pendingRequests.length === 0 && <div style={{ padding: '16px', fontSize: 13, color: c.subText, textAlign: 'center' }}>No pending requests</div>}
                  </div>
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={handleMarkAllRead} style={{ fontSize: 12, color: c.subText, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Mark all as read</button>
                    <button onClick={() => { setActive('adminNotifications'); setIsNotificationsOpen(false); }} style={{ fontSize: 12, color: c.brand, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
                  </div>
                </div>
              )}
            </div>
            <div onClick={() => setActive('adminProfile')} style={{ background: c.brand, width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }} title="Admin Profile">A</div>
            {active === 'products' && (
              <button onClick={() => setIsAddProductOpen(true)} style={{ background: c.brand, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Plus size={16} /> Product
              </button>
            )}
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

const AVATAR_COLORS = ['#e87b35','#e85d5d','#378ADD','#639922','#BA7517','#8b5cf6'];
const avatarColor = str => AVATAR_COLORS[(str?.charCodeAt(0)||0) % AVATAR_COLORS.length];
const timeAgo = d => { const days=Math.floor((Date.now()-new Date(d))/86400000); if(days<1)return'Today'; if(days<7)return`${days}d ago`; return`${Math.floor(days/7)}w ago`; };

function MiniSparkline({ value, color }) {
  const s = value || 3;
  const pts = Array.from({length:12},(_,i)=>0.15+i/11*0.55+Math.sin(i*1.9+s)*0.12+Math.sin(i*0.8)*0.08);
  const mn=Math.min(...pts), rng=(Math.max(...pts)-mn)||1;
  const W=80,H=28;
  const coords=pts.map((v,i)=>`${(i/11)*W},${H-((v-mn)/rng)*(H-4)+2}`).join(' ');
  return <svg width={W} height={H} style={{display:'block'}}><polyline points={coords} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function OverviewContent({ stats, customers, requests, hostingPlans, pendingRequestsCount, onNavigate, onViewCustomer, c, isDark }) {
  const approvedDomains = requests.filter(r => r.source === 'domain' && String(r.status||'').toLowerCase() === 'approved').length;
  const initials = name => (name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();

  const statCards = [
    { label:'Total customers', value:customers.length||0, icon:<Users size={18} color={c.brand}/>, sub:'↑ +12 this month', subColor:'#639922', bg:isDark?'#3d2518':'#fff5ee', sparkColor:c.brand },
    { label:'Active domains', value:approvedDomains, icon:<CheckCircle size={18} color="#378ADD"/>, sub:`${stats.expiringSoon||0} expiring soon`, subColor:'#378ADD', bg:isDark?'#1a2736':'#e6f1fb', sparkColor:'#378ADD' },
    { label:'Hosting packages', value:hostingPlans.length||0, icon:<Server size={18} color="#639922"/>, sub:'All active', subColor:'#639922', bg:isDark?'#1e2e1e':'#eaf3de', sparkColor:'#639922' },
    { label:'Pending requests', value:pendingRequestsCount||0, icon:<Star size={18} color="#BA7517"/>, sub:'Needs review', subColor:'#BA7517', bg:isDark?'#382512':'#faeeda', sparkColor:'#BA7517' },
  ];

  return (
    <div>
      <div style={{marginBottom:32}}>
        <h1 style={{fontSize:24,fontWeight:700,marginBottom:4}}>Good day, Admin</h1>
        <p style={{fontSize:14,color:c.subText}}>Here's what's happening with your portal today.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        {statCards.map(s => (
          <div key={s.label} style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div style={{fontSize:13,color:c.subText}}>{s.label}</div>
              <div style={{width:36,height:36,borderRadius:8,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{s.icon}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
              <div>
                <div style={{fontSize:32,fontWeight:700,lineHeight:1.1}}>{s.value}</div>
                <div style={{fontSize:12,color:s.subColor,fontWeight:500,marginTop:8}}>{s.sub}</div>
              </div>
              <MiniSparkline value={s.value} color={s.sparkColor}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:16,fontWeight:600}}>Recent customers</div>
              <div style={{fontSize:12,color:c.subText,marginTop:2}}>Latest sign-ups &amp; domain activity</div>
            </div>
            <button onClick={()=>onNavigate('customers')} style={{color:c.brand,background:'none',border:'none',fontSize:13,cursor:'pointer',fontWeight:500,display:'flex',alignItems:'center',gap:4}}>View all →</button>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',marginTop:16}}>
            <thead>
              <tr style={{color:c.subText,fontSize:11,letterSpacing:'0.05em'}}>
                <th style={{paddingBottom:12,fontWeight:500,textAlign:'left',textTransform:'uppercase'}}>Customer</th>
                <th style={{paddingBottom:12,fontWeight:500,textAlign:'left',textTransform:'uppercase'}}>Phone</th>
                <th style={{paddingBottom:12,fontWeight:500,textAlign:'left',textTransform:'uppercase'}}>Status</th>
                <th style={{paddingBottom:12,fontWeight:500,textAlign:'right',textTransform:'uppercase'}}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0,4).map((cu,i)=>{
                const st=String(cu.status||'active').toLowerCase();
                const isActive=st==='active'||st==='approved';
                const col=avatarColor(cu.name);
                return (
                  <tr key={cu.id||i} style={{borderTop:`1px solid ${c.border}`,cursor:'pointer'}} onClick={()=>onViewCustomer(cu)}>
                    <td style={{padding:'12px 0'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:36,height:36,borderRadius:'50%',background:col,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>{initials(cu.name)}</div>
                        <div>
                          <div style={{fontSize:14,fontWeight:500}}>{cu.name}</div>
                          <div style={{fontSize:11,color:c.subText}}>{cu.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'12px 0',fontSize:13,color:c.subText}}>{cu.phone||'—'}</td>
                    <td style={{padding:'12px 0'}}>
                      <span style={{background:isActive?'rgba(99,153,34,0.15)':'rgba(186,117,23,0.15)',color:isActive?'#639922':'#BA7517',fontSize:12,fontWeight:500,padding:'3px 10px',borderRadius:20,display:'inline-flex',alignItems:'center',gap:5}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:isActive?'#639922':'#BA7517',display:'inline-block'}}/>
                        {isActive?'Active':'Pending'}
                      </span>
                    </td>
                    <td style={{padding:'12px 0',fontSize:12,color:c.subText,textAlign:'right'}}>{cu.created_at?timeAgo(cu.created_at):'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:16,fontWeight:600}}>New requests</div>
                <div style={{fontSize:12,color:c.subText,marginTop:2}}>Awaiting your review</div>
              </div>
              <button onClick={()=>onNavigate('hostingRequests')} style={{color:c.brand,background:'none',border:'none',fontSize:13,cursor:'pointer',fontWeight:500}}>View all →</button>
            </div>
            <div style={{marginTop:16}}>
              {requests.slice(0,4).map((r,i)=>{
                const isHosting=r.source==='hosting';
                const col=avatarColor(r.n);
                const date=r.created_at?new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
                return (
                  <div key={r.id||i} onClick={()=>onNavigate(r.source==='hosting'?'hostingRequests':'domainsRequests')} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderTop:i===0?'none':`1px solid ${c.border}`,cursor:'pointer'}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:col,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>{initials(r.n)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.n}</div>
                      <div style={{fontSize:11,color:c.subText}}>{r.reqType}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      <span style={{background:isHosting?'rgba(55,138,221,0.15)':'rgba(99,153,34,0.15)',color:isHosting?'#5b9aff':'#639922',fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:6}}>{isHosting?'Hosting':'Domain'}</span>
                      <span style={{fontSize:11,color:c.subText,minWidth:40,textAlign:'right'}}>{date}</span>
                    </div>
                  </div>
                );
              })}
              {requests.length===0 && <div style={{fontSize:13,color:c.subText}}>No new requests</div>}
            </div>
          </div>

          <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:20}}>
            <div style={{fontSize:16,fontWeight:600,marginBottom:20}}>Hosting plans</div>
            {(()=>{
              const counts={Shared:0,VPS:0,Cloud:0};
              hostingPlans.forEach(p=>{
                const t=(p.package_type||p.type||p.package_name||'').toLowerCase();
                if(t.includes('vps'))counts.VPS++;
                else if(t.includes('cloud'))counts.Cloud++;
                else counts.Shared++;
              });
              const total=hostingPlans.length||1;
              return [['Shared',counts.Shared,c.brand],['VPS',counts.VPS,'#378ADD'],['Cloud',counts.Cloud,'#639922']].map(([n,v,bg])=>(
                <div key={n} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <div style={{width:48,fontSize:13,color:c.text}}>{n}</div>
                  <div style={{flex:1,height:6,background:isDark?'rgba(255,255,255,0.04)':'#ebebeb',borderRadius:3}}>
                    <div style={{width:`${Math.round((v/total)*100)}%`,height:'100%',background:bg,borderRadius:3}}/>
                  </div>
                  <div style={{width:32,fontSize:12,color:c.subText,textAlign:'right'}}>{Math.round((v/total)*100)}%</div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminProfileContent({ c, isDark }) {
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

function AllAdminNotificationsPage({ notifications, requests, customers, onNavigate, c, isDark }) {
  const pendingReqs = requests.filter(r => String(r.status||'').toLowerCase() === 'pending');
  const recentCustomers = [...customers].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,10);

  const allItems = [
    ...pendingReqs.map(r=>({ type:'request', source:r.source, title:`${r.n} — ${r.reqType}`, sub: r.source==='domain'?'Domain Request':'Hosting Request', date:r.created_at, id:r.id })),
    ...recentCustomers.map(cu=>({ type:'customer', title:`New Customer: ${cu.name}`, sub:cu.email||'', date:cu.created_at, id:cu.id, customer:cu })),
    ...notifications.map(n=>({ type:'notification', title:n.title||'Notification', sub:n.message||'', date:n.created_at, id:n.id, nType:n.type })),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));

  const typeColor = t => t==='request'?'#8b5cf6':t==='customer'?'#639922':'#378ADD';
  const typeLabel = item => item.type==='request'?(item.source==='domain'?'Domain':'Hosting'):item.type==='customer'?'New User':'Notification';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <button onClick={()=>onNavigate('overview')} style={{background:'none',border:'none',color:c.subText,cursor:'pointer',padding:'6px 8px',borderRadius:8,display:'flex',alignItems:'center',fontSize:13}}>← Back</button>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,margin:0,color:c.text}}>All Notifications</h2>
          <p style={{fontSize:13,color:c.subText,marginTop:2}}>Pending requests, new customers, and system notifications</p>
        </div>
      </div>

      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${c.border}`,background:isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:13,fontWeight:600,color:c.text}}>{allItems.length} items</span>
        </div>
        {allItems.length===0 && <div style={{padding:32,textAlign:'center',color:c.subText,fontSize:13}}>No notifications</div>}
        {allItems.map((item,i)=>(
          <div key={item.id+i} onClick={()=>{ if(item.type==='request') onNavigate(item.source==='domain'?'domainsRequests':'hostingRequests'); else if(item.type==='customer') onNavigate('customers'); }} style={{padding:'14px 20px',borderBottom:`1px solid ${c.border}`,display:'flex',alignItems:'center',gap:14,cursor:item.type!=='notification'?'pointer':'default',transition:'background 0.1s'}} onMouseEnter={e=>e.currentTarget.style.background=c.hover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{width:38,height:38,borderRadius:'50%',background:typeColor(item.type)+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Bell size={16} color={typeColor(item.type)} />
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:c.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title}</div>
              <div style={{fontSize:12,color:c.subText,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.sub}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
              <span style={{background:typeColor(item.type)+'22',color:typeColor(item.type),fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,textTransform:'uppercase',letterSpacing:0.5}}>{typeLabel(item)}</span>
              <span style={{fontSize:11,color:c.subText}}>{item.date?new Date(item.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
