import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDomainRequests, updateDomainRequest, REQUEST_STATUS, getCustomers, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function AdminRequestManagement() {
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [reqs, custs] = await Promise.all([getDomainRequests(), getCustomers()]);
    setRequests(reqs || []);
    setCustomers(custs || []);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const req = requests.find(r => r.id === id);
    await updateDomainRequest(id, { status: String(newStatus).toLowerCase(), updated_at: new Date().toISOString() });
    if (req?.customer_id) {
      const isApproved = String(newStatus).toLowerCase() === REQUEST_STATUS.COMPLETED.toLowerCase() ||
        String(newStatus).toLowerCase() === 'approved';
      await addNotification({
        customer_id: req.customer_id,
        type: isApproved ? 'update' : 'expiration',
        title: isApproved
          ? `Domain Request Approved — ${req.domain_name}`
          : `Domain Request Rejected — ${req.domain_name}`,
        message: isApproved
          ? `Your domain request for ${req.domain_name} has been approved.`
          : `Your domain request for ${req.domain_name} has been declined.`
      }).catch(() => {});
    }
    toast({ title: "Request Updated", description: `Request marked as ${newStatus}` });
    loadData();
  };

  const getCustomerName = (req) => {
    return req.customers?.name || customers.find(c => c.id === req.customer_id)?.name || 'Unknown';
  };

  const isPending = (status) => String(status || '').toLowerCase() === 'pending';
  const isCompleted = (status) => String(status || '').toLowerCase() === 'completed';

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    const normalized = String(status).toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Domain</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Customer</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-800">{req.type || 'New Registration'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{req.domain_name || '-'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{getCustomerName(req)}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${isCompleted(req.status) ? 'bg-green-100 text-green-700' :
                      isPending(req.status) ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                    {formatStatus(req.status)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right flex justify-end gap-2">
                  {isPending(req.status) && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleStatusUpdate(req.id, REQUEST_STATUS.COMPLETED)}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleStatusUpdate(req.id, REQUEST_STATUS.REJECTED)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500">No pending domain requests</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminRequestManagement;