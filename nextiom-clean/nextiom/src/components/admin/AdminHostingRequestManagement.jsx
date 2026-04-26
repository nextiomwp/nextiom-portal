import React, { useState, useEffect } from 'react';
import { Clock, FileText, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getHostingRequests, updateHostingRequest, REQUEST_STATUS, getCustomers, getHostingPackages } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

function AdminHostingRequestManagement() {
    const [requests, setRequests] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [packages, setPackages] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [adminReply, setAdminReply] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [reqs, custs, pkgs] = await Promise.all([
            getHostingRequests(),
            getCustomers(),
            getHostingPackages()
        ]);
        setRequests(reqs || []);
        setCustomers(custs || []);
        setPackages(pkgs || []);
    };

    const handleAction = async (status) => {
        if (status === REQUEST_STATUS.REJECTED && !rejectReason) {
            toast({ title: "Reason Required", description: "Please provide a reason for rejection.", variant: "destructive" });
            return;
        }
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 600));

        await updateHostingRequest(selectedRequest.id, {
            status,
            adminReply: status === REQUEST_STATUS.REJECTED ? rejectReason : adminReply,
            updatedAt: new Date().toISOString()
        });

        toast({ title: "Request Updated", description: `Request has been marked as ${status}.` });
        setLoading(false);
        setSelectedRequest(null);
        setAdminReply('');
        setRejectReason('');
        loadData();
    };

    const getCustomerName = (id) => customers.find(c => c.id === id)?.name || 'Unknown';
    const getPackageName = (id) => packages.find(p => p.id === id)?.package_name || 'New Order';

    const filteredRequests = requests.filter(r => statusFilter === 'All' || r.status === statusFilter);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-100 dark:bg-[#1c1c1c] rounded-xl w-fit">
                {['All', REQUEST_STATUS.PENDING, REQUEST_STATUS.APPROVED, REQUEST_STATUS.COMPLETED, REQUEST_STATUS.REJECTED].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`capitalize px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out ${statusFilter === s
                                ? 'bg-white dark:bg-[#333333] text-[#e87b35] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-black/5 dark:text-[#a0a0a0] dark:hover:text-white dark:hover:bg-white/5'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Request Type</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Customer / Package</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Date</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRequests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedRequest(req)}>
                                <td className="py-4 px-6">
                                    <span className="font-semibold text-slate-800 block">New Request</span>
                                    <span className="text-xs text-slate-500 truncate max-w-[200px] block">Hosting Order</span>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700">{getCustomerName(req.customer_id)}</span>
                                        <span className="text-xs text-slate-500">{req.package_name}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-sm text-slate-600">
                                    {req.created_at ? format(new Date(req.created_at), 'MMM dd, HH:mm') : '-'}
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${req.status === REQUEST_STATUS.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                            req.status === REQUEST_STATUS.COMPLETED ? 'bg-green-100 text-green-700' :
                                                req.status === REQUEST_STATUS.APPROVED ? 'bg-blue-100 text-blue-700' :
                                                    'bg-red-100 text-red-700'
                                        }`}>
                                        {req.status === REQUEST_STATUS.PENDING ? <Clock className="w-3 h-3" /> :
                                            req.status === REQUEST_STATUS.REJECTED ? <XCircle className="w-3 h-3" /> :
                                                <CheckCircle className="w-3 h-3" />}
                                        {req.status}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <Button size="sm" variant="ghost">View <ChevronRight className="w-4 h-4 ml-1" /></Button>
                                </td>
                            </tr>
                        ))}
                        {filteredRequests.length === 0 && (
                            <tr><td colSpan={5} className="py-12 text-center text-slate-500">No requests found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Request Details</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Customer</p>
                                    <p className="font-medium">{getCustomerName(selectedRequest.customer_id)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Package</p>
                                    <p className="font-medium">{selectedRequest.package_name}</p>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-lg p-4">
                                <h4 className="font-bold text-slate-800 mb-2 border-b pb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Request Information
                                </h4>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Plan:</span> {selectedRequest.plan || '-'}</p>
                                    <p><span className="font-medium">Type:</span> {selectedRequest.type || '-'}</p>
                                    <p><span className="font-medium">Domain:</span> {selectedRequest.domain || '-'}</p>
                                </div>
                            </div>

                            {selectedRequest.status === REQUEST_STATUS.PENDING && (
                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                    <p className="font-medium text-slate-800">Admin Action</p>
                                    <textarea
                                        className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                        placeholder="Reply or rejection reason..."
                                        value={rejectReason || adminReply}
                                        onChange={e => { setAdminReply(e.target.value); setRejectReason(e.target.value); }}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" onClick={() => handleAction(REQUEST_STATUS.REJECTED)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                            Reject Request
                                        </Button>
                                        <Button onClick={() => handleAction(REQUEST_STATUS.COMPLETED)} className="bg-green-600 hover:bg-green-700">
                                            Mark Completed
                                        </Button>
                                        <Button onClick={() => handleAction(REQUEST_STATUS.APPROVED)} className="bg-blue-600 hover:bg-blue-700">
                                            Approve
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default AdminHostingRequestManagement;