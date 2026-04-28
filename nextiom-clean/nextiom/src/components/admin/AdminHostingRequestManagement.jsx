import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, User, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getHostingRequests, updateHostingRequest, REQUEST_STATUS, getCustomers, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const parsePkg = (packageType) => {
  const parts = (packageType || '').split(' | ');
  const plan = parts[0]?.trim() || '-';
  const billing = parts.find(p => p.startsWith('Billing:'))?.replace('Billing:', '').trim() || '-';
  const domain = parts.find(p => p.startsWith('Domain:'))?.replace('Domain:', '').trim() || '-';
  const notes = parts.find(p => p.startsWith('Notes:'))?.replace('Notes:', '').trim() || '-';
  return { plan, billing, domain, notes };
};

function AdminHostingRequestManagement({ isDark = true }) {
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', panel: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', panel: '#f5f5f5' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const col = isDark
      ? s === 'approved' ? { bg: '#1a3052', color: '#60a5fa', dot: '#60a5fa' }
        : s === 'completed' ? { bg: '#1a3020', color: '#4ade80', dot: '#4ade80' }
        : s === 'pending' ? { bg: '#3b2508', color: '#fb923c', dot: '#fb923c' }
        : { bg: '#3a1515', color: '#f87171', dot: '#f87171' }
      : s === 'approved' ? { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' }
        : s === 'completed' ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
        : s === 'pending' ? { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' }
        : { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
        {status || '-'}
      </span>
    );
  };

  const Btn = ({ onClick, color, children, title, filled, disabled }) => (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${color}`,
      background: filled ? color : 'transparent',
      color: filled ? '#fff' : color,
      fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, whiteSpace: 'nowrap'
    }}>
      {children}
    </button>
  );

  const SectionHeader = ({ title, accent }) => (
    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: accent || c.brand, flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 14, color: c.text, letterSpacing: 0.3 }}>{title}</span>
    </div>
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [reqs, custs] = await Promise.all([getHostingRequests(), getCustomers()]);
    setRequests(reqs || []);
    setCustomers(custs || []);
  };

  const handleAction = async (status) => {
    if (status === REQUEST_STATUS.REJECTED && !rejectReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for rejection.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    await updateHostingRequest(selectedRequest.id, {
      status: String(status).toLowerCase(),
      admin_reply: status === REQUEST_STATUS.REJECTED ? rejectReason : adminReply,
      updated_at: new Date().toISOString()
    });
    if (selectedRequest.customer_id) {
      const isApproved = String(status).toLowerCase() === REQUEST_STATUS.APPROVED.toLowerCase() || String(status).toLowerCase() === REQUEST_STATUS.COMPLETED.toLowerCase();
      const planName = selectedRequest.package_type?.split('|')[0]?.trim() || 'Hosting';
      await addNotification({
        customer_id: selectedRequest.customer_id,
        type: isApproved ? 'update' : 'expiration',
        title: isApproved ? `Hosting Request Approved — ${planName}` : `Hosting Request Rejected — ${planName}`,
        message: isApproved ? `Your hosting request for ${planName} has been approved.` : `Your hosting request was declined. Reason: ${rejectReason || 'No reason provided.'}`
      }).catch(() => {});
    }
    toast({ title: 'Request Updated', description: `Request has been marked as ${status}.` });
    setLoading(false);
    setSelectedRequest(null);
    setAdminReply('');
    setRejectReason('');
    loadData();
  };

  const getCustomerName = (id) => customers.find(cu => cu.id === id)?.name || 'Unknown';
  const isPending = (status) => String(status || '').toLowerCase() === 'pending';

  const allStatuses = ['All', REQUEST_STATUS.PENDING, REQUEST_STATUS.APPROVED, REQUEST_STATUS.COMPLETED, REQUEST_STATUS.REJECTED];
  const filteredRequests = requests.filter(r => statusFilter === 'All' || String(r.status || '').toLowerCase() === String(statusFilter || '').toLowerCase());

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {allStatuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '7px 16px', fontSize: 13, fontWeight: 500, borderRadius: 9, border: 'none', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
            background: statusFilter === s ? c.card : 'transparent',
            color: statusFilter === s ? c.brand : c.subText,
            boxShadow: statusFilter === s ? (isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)') : 'none'
          }}>{s}</button>
        ))}
      </div>

      <div style={cardS}>
        <SectionHeader title="Hosting Requests" accent="#8b5cf6" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Request Type</th>
              <th style={thS}>Customer / Package</th>
              <th style={thS}>Date</th>
              <th style={thS}>Status</th>
              <th style={{ ...thS, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((req, i) => (
              <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRequest(req)}>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ fontWeight: 600, display: 'block' }}>New Request</span>
                  <span style={{ fontSize: 12, color: c.subText }}>{req.domain || req.notes || 'Hosting Order'}</span>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ fontWeight: 500, display: 'block' }}>{req.customers?.name || getCustomerName(req.customer_id)}</span>
                  <span style={{ fontSize: 12, color: c.subText }}>{req.package_name}</span>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}>
                  <span style={{ color: c.subText, fontSize: 13 }}>{req.created_at ? format(new Date(req.created_at), 'MMM dd, HH:mm') : '—'}</span>
                </td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={req.status} /></td>
                <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                  <Btn color="#8b5cf6" onClick={() => setSelectedRequest(req)}>View →</Btn>
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && <tr><td colSpan={5} style={emptyS}>No requests found</td></tr>}
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
                <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Customer</p>
                    <p className="font-semibold text-slate-800">{selectedRequest.customers?.name || getCustomerName(selectedRequest.customer_id)}</p>
                    <p className="text-xs text-slate-400">{selectedRequest.customers?.email || ''}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                    <p className="font-semibold text-slate-800 capitalize">{selectedRequest.status || '-'}</p>
                    <p className="text-xs text-slate-400">{selectedRequest.created_at ? format(new Date(selectedRequest.created_at), 'MMM dd, yyyy HH:mm') : '-'}</p>
                  </div>
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-bold text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Request Information
                </h4>
                {(() => {
                  const { plan, billing, domain, notes } = parsePkg(selectedRequest.package_type);
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {[['Plan', plan], ['Billing', billing], ['Domain', domain], ['Notes', notes]].map(([label, value]) => (
                        <div key={label} className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1">{label}</p>
                          <p className="font-medium text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {isPending(selectedRequest.status) && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="font-medium text-slate-800">Admin Action</p>
                  <textarea
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    rows={3}
                    placeholder="Reply or rejection reason..."
                    value={rejectReason || adminReply}
                    onChange={e => { setAdminReply(e.target.value); setRejectReason(e.target.value); }}
                  />
                  <div className="flex gap-3 justify-end">
                    <button disabled={loading} onClick={() => handleAction(REQUEST_STATUS.REJECTED)} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border border-red-300 text-red-600 bg-transparent font-medium text-sm cursor-pointer hover:bg-red-50">
                      <XCircle className="w-4 h-4" /> Reject Request
                    </button>
                    <button disabled={loading} onClick={() => handleAction(REQUEST_STATUS.APPROVED)} style={{ background: '#e87b35' }} className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg border-none text-white font-medium text-sm cursor-pointer">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
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
