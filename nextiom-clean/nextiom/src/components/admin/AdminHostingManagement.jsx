import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit, Plus, Server, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHostingPackages, getCustomers, HOSTING_STATUS, addHostingPackage } from '@/lib/storage';
import AdminHostingDetailsView from './AdminHostingDetailsView';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

function AdminHostingManagement() {
    const [packages, setPackages] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [hData, cData] = await Promise.all([getHostingPackages(), getCustomers()]);
            setPackages(hData || []);
            setCustomers(cData || []);
        } catch (e) {
            toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNew = async () => {
        if (customers.length === 0) {
            toast({ title: "Error", description: "Create a customer first", variant: "destructive" });
            return;
        }

        try {
            const newPkg = await addHostingPackage({
                customer_id: customers[0].id,
                package_name: 'New Hosting Package',
                domain: 'new-domain.com',
                type: 'Shared Hosting',
                plan: 'Basic',
                status: HOSTING_STATUS.PENDING
            });

            toast({ title: "Package Created", description: "New package added. Please edit details." });
            loadData();
            setSelectedPackage(newPkg);
        } catch (e) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const getCustomerName = (id) => {
        const c = customers.find(cus => cus.id === id);
        return c ? c.name : 'Unknown';
    };

    const filteredPackages = packages.filter(p => {
        const matchesSearch = (p.package_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case HOSTING_STATUS.ACTIVE: return 'bg-green-100 text-green-700';
            case HOSTING_STATUS.EXPIRED: return 'bg-red-100 text-red-700';
            case HOSTING_STATUS.SUSPENDED: return 'bg-orange-100 text-orange-700';
            case HOSTING_STATUS.PENDING: return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (selectedPackage) {
        return (
            <AdminHostingDetailsView
                pkg={selectedPackage}
                customer={customers.find(c => c.id === selectedPackage.customer_id) || {}}
                onBack={() => { setSelectedPackage(null); loadData(); }}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#e87b35] focus:outline-none transition-all"
                        placeholder="Search packages..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <select
                        className="px-4 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#e87b35] transition-all"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        {Object.values(HOSTING_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Button onClick={handleAddNew} className="bg-[#e87b35] hover:bg-[#d66a24] text-white shadow-md rounded-xl transition-all font-medium border-0 whitespace-nowrap">
                        <Plus className="w-4 h-4 mr-2" /> New Package
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Package Details</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPackages.length > 0 ? filteredPackages.map(p => (
                                <motion.tr
                                    key={p.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedPackage(p)}
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                <Server className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{p.package_name}</p>
                                                <p className="text-xs text-slate-500">{p.type} • {p.plan}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm font-medium text-slate-700">{getCustomerName(p.customer_id)}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadgeColor(p.status)}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-600">
                                        {p.expiry_date ? format(new Date(p.expiry_date), 'MMM dd, yyyy') : 'Lifetime'}
                                    </td>
                                    <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedPackage(p)}>
                                            <Edit className="w-4 h-4 text-slate-500" />
                                        </Button>
                                    </td>
                                </motion.tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        No hosting packages found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminHostingManagement;