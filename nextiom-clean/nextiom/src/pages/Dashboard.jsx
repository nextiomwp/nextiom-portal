import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, Plus, Settings, LogOut, Globe, Server, MessageSquare, Loader2, LayoutDashboard } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import CustomerList from '@/components/dashboard/CustomerList';
import ProductList from '@/components/dashboard/ProductList';
import EmailLogList from '@/components/dashboard/EmailLogList';
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
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getCustomers, getProducts, getLicenses, getStorageStats, getEmailLogs } from '@/lib/storage';

function Dashboard({ onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0, activeMemberships: 0, expiringSoon: 0, expired: 0, totalDomains: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAssignProductOpen, setIsAssignProductOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedCustomers, loadedProducts, loadedLicenses, loadedStats, loadedLogs] = await Promise.all([
        getCustomers(), getProducts(), getLicenses(), getStorageStats(), getEmailLogs()
      ]);
      setCustomers(loadedCustomers || []);
      setProducts(loadedProducts || []);
      setLicenses(loadedLicenses || []);
      setStats(loadedStats || { totalCustomers: 0, totalDomains: 0, expiringSoon: 0, expired: 0 });
      setEmailLogs(loadedLogs || []);
    } catch (err) {
      console.error('Critical Error loading dashboard data:', err);
      setError("Failed to load some dashboard data. Please try refreshing.");
      toast({ title: "Connection Issue", description: "Could not load latest data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataUpdate = () => {
    loadData();
    toast({ title: "Success", description: "Dashboard updated" });
  };

  const handleLogout = async () => {
    await signOut();
    if (onLogout) onLogout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src="https://horizons-cdn.hostinger.com/147148b5-9ad3-49b5-a69f-decad9e9a152/c4356b200db1f138597a66d14c006177.jpg"
                alt="Nextiom Logo"
                className="h-8 md:h-10 w-auto object-contain"
              />
              <span className="hidden md:inline font-bold text-slate-700">Admin Panel</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)} className="text-slate-600 hover:text-slate-900">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="w-5 h-5" />
              </Button>
              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
              <Button onClick={() => setIsAddCustomerOpen(true)} className="hidden sm:flex bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Add Customer
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadData} className="ml-auto bg-white hover:bg-red-50">Retry</Button>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard title="Total Customers" value={stats.totalCustomers} icon={Users} color="blue" />
            <StatsCard title="Total Domains" value={stats.totalDomains} icon={Globe} color="indigo" />
            <StatsCard title="Hosting Packages" value={stats.activeMemberships || 0} icon={Server} color="green" />
            <StatsCard title="Action Required" value={stats.expiringSoon + stats.expired} icon={AlertTriangle} color="yellow" />
          </div>

          <Tabs defaultValue="home" className="space-y-6">
            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
              <TabsList className="w-full justify-start min-w-[800px]">
                <TabsTrigger value="home" className="flex items-center gap-2"><LayoutDashboard className="w-3 h-3"/> Home</TabsTrigger>
                <TabsTrigger value="overview">Customers</TabsTrigger>
                <TabsTrigger value="hosting" className="flex items-center gap-2"><Server className="w-3 h-3"/> Hosting</TabsTrigger>
                <TabsTrigger value="hostingRequests" className="flex items-center gap-2"><MessageSquare className="w-3 h-3"/> Requests</TabsTrigger>
                <TabsTrigger value="domains">Domains</TabsTrigger>
                <TabsTrigger value="domainsRequests">Domain Req.</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>
            </div>

            {/* Default landing tab - clean welcome screen */}
            <TabsContent value="home">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
                <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-700 mb-2">Welcome to Nextiom Admin Panel</h2>
                <p className="text-slate-400">Select a tab above to manage customers, hosting, domains, and more.</p>
              </div>
            </TabsContent>

            <TabsContent value="overview">
              <CustomerList
                customers={customers}
                licenses={licenses}
                products={products}
                onUpdate={handleDataUpdate}
                onAssignProduct={() => setIsAssignProductOpen(true)}
              />
            </TabsContent>

            <TabsContent value="customers">
              <AdminCustomerManagement products={products} onSuccess={handleDataUpdate} />
            </TabsContent>

            <TabsContent value="hosting">
              <AdminHostingManagement />
            </TabsContent>

            <TabsContent value="hostingRequests">
              <AdminHostingRequestManagement />
            </TabsContent>

            <TabsContent value="domains">
              <AdminDomainManagement />
            </TabsContent>

            <TabsContent value="domainsRequests">
              <AdminRequestManagement />
            </TabsContent>

            <TabsContent value="products">
              <ProductList products={products} onUpdate={handleDataUpdate} />
            </TabsContent>

            <TabsContent value="notifications">
              <AdminNotificationManagement />
            </TabsContent>

            <TabsContent value="logs">
              <EmailLogList logs={emailLogs} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <AddCustomerDialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} onSuccess={handleDataUpdate} />
      <AddProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} onSuccess={handleDataUpdate} />
      <AssignProductDialog open={isAssignProductOpen} onOpenChange={setIsAssignProductOpen} customers={customers} products={products} onSuccess={handleDataUpdate} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} onUpdate={handleDataUpdate} />
    </div>
  );
}

export default Dashboard;