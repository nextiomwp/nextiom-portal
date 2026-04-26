import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDomains, getCustomers, DOMAIN_STATUS } from '@/lib/storage';
import AdminDomainDetailsView from './AdminDomainDetailsView';

function AdminDomainManagement() {
    const [domains, setDomains] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [dData, cData] = await Promise.all([getDomains(), getCustomers()]);
            setDomains(dData || []);
            setCustomers(cData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const getCustomerName = (id) => {
        const c = customers.find(cus => cus.id === id);
        return c ? c.name : 'Unknown';
    };

    const filteredDomains = domains.filter(d =>
        (d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            {!selectedDomain ? (
                <>
                    <div className="flex justify-between items-center">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#e87b35] focus:outline-none transition-all"
                                placeholder="Search domains..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Domain</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Expiry</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDomains.map(d => (
                                    <motion.tr
                                        key={d.id}
                                        layoutId={d.id}
                                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                                        onClick={() => setSelectedDomain(d)}
                                    >
                                        <td className="py-3 px-4 font-medium text-slate-800">{d.name}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{getCustomerName(d.customer_id)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${d.status === DOMAIN_STATUS.ACTIVE ? 'bg-green-100 text-green-700' :
                                                    d.status === DOMAIN_STATUS.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-slate-100 text-slate-600'
                                                }`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600">
                                            {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedDomain(d)}>
                                                <Edit className="w-4 h-4 text-slate-500" />
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <AdminDomainDetailsView
                    domain={selectedDomain}
                    customer={customers.find(c => c.id === selectedDomain.customer_id)}
                    onBack={() => { setSelectedDomain(null); loadData(); }}
                />
            )}
        </div>
    );
}

export default AdminDomainManagement;