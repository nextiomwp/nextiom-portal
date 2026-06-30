import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, User, Package, Trash2, AlertTriangle } from 'lucide-react';
import AssignHostingDialog from '@/components/dialogs/AssignHostingDialog';
import { getHostingRequests, updateHostingRequest, deleteHostingRequest, REQUEST_STATUS, getCustomers, addNotification, buildHostingRequestUpdatePayload } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { format } from '@/lib/supabaseHelpers';

function DeleteModal({ open, onCancel, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1C1E24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 28px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertTriangle size={26} color="#ef4444" />
        </div>
        <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>Are you sure you want to permanently delete this request?</h3>
        <p style={{ color: '#a0a0a0', fontSize: 13.5, marginBottom: 28 }}>This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '10px 24px', borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Deleting…' : 'Delete Permanently'}</button>
        </div>
      </div>
    </div>
  );
}

const parsePkg = (packageType) => {
  const parts = (packageType || '').split(' | ');
  const plan = parts[0]?.trim() || '-';
  const billing = parts.find(p => p.startsWith('Billing:'))?.replace('Billing:', '').trim() || '-';
  const domain = parts.find(p => p.startsWith('Domain:'))?.replace('Domain:', '').trim() || '-';
  const notes = parts.find(p => p.startsWith('Notes:'))?.replace('Notes:', '').trim() || '-';
  return { plan, billing, domain, notes };
};

const parseJsonField = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

function AdminHostingRequestManagement({ isDark = true }) {
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState(REQUEST_STATUS.PENDING);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)', panel: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: 'var(--brand-color)', panel: '#f5f5f5' };

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
    const displayStatus = s === 'completed' ? 'Approved' : status || '-';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
        {displayStatus}
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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const onChange = (e) => setIsMobile(e.matches);
    onChange(media);
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  const loadData = async () => {
    const [reqs, custs] = await Promise.all([getHostingRequests(), getCustomers()]);
    setRequests(reqs || []);
    setCustomers(custs || []);
  };

  const handleAction = async (status) => {
    const isApproved = String(status).toLowerCase() === REQUEST_STATUS.APPROVED.toLowerCase() || String(status).toLowerCase() === REQUEST_STATUS.COMPLETED.toLowerCase();
    if (status === REQUEST_STATUS.REJECTED && !rejectReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for rejection.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const requestUpdates = await buildHostingRequestUpdatePayload(selectedRequest, {
        status,
        startDate: isApproved ? new Date().toISOString() : undefined,
      });
      await updateHostingRequest(selectedRequest.id, {
        ...requestUpdates,
        admin_reply: status === REQUEST_STATUS.REJECTED ? rejectReason : adminReply,
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

        if (isApproved) {
          try {
            const { shouldSendPurchaseSms, sendPurchaseSms } = await import('@/lib/sms');
            if (await shouldSendPurchaseSms()) {
              const cust = customers.find(cu => cu.id === selectedRequest.customer_id) || selectedRequest.customers;
              if (cust?.phone) {
                await sendPurchaseSms({
                  phone: cust.phone,
                  customerName: cust.name || 'Valued Customer',
                  serviceLabel: `hosting plan "${planName}"`,
                  customerId: selectedRequest.customer_id
                });
              }
            }
          } catch (smsErr) {
            console.error('Failed to send hosting approval SMS:', smsErr);
          }
        }
      }
      toast({ title: 'Request Updated', description: `Request has been marked as ${status}.` });
      setSelectedRequest(null);
      setAdminReply('');
      setRejectReason('');
      loadData();
    } catch (err) {
      toast({ title: 'Update Failed', description: 'Could not update the request. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const req = requests.find(r => r.id === deleteTarget);
    try {
      await deleteHostingRequest(deleteTarget);
      const planName = req ? parsePkg(req.package_type).plan : 'Hosting';
      const custName = req ? getCustomerName(req.customer_id) : 'Unknown';
      await addNotification({
        customer_id: null,
        type: 'delete',
        title: `Hosting Request Deleted — ${planName}`,
        message: `Admin permanently deleted a hosting request for ${custName} (${planName}).`,
      }).catch(() => {});
      toast({ title: 'Deleted', description: 'Hosting request deleted.' });
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Could not delete request.', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const getCustomerName = (id) => customers.find(cu => cu.id === id)?.name || 'Unknown';
  const normalizeRequestStatus = (status) => {
    const s = String(status || '').toLowerCase();
    return s === 'completed' ? 'approved' : s;
  };
  const isPending = (status) => normalizeRequestStatus(status) === 'pending';
  const selectedCustomer = selectedRequest ? (selectedRequest.customers || customers.find(cu => cu.id === selectedRequest.customer_id) || null) : null;
  const requestFooterContent = selectedRequest && isPending(selectedRequest.status) ? (
    <section style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 14, padding: 18, marginTop: 12 }}>
      <div style={{ marginBottom: 12, fontWeight: 700, color: c.text }}>Admin Reply / Rejection Reason</div>
      <textarea
        rows={4}
        placeholder="Reply or rejection reason..."
        value={rejectReason || adminReply}
        onChange={e => { setAdminReply(e.target.value); setRejectReason(e.target.value); }}
        style={{ width: '100%', padding: '12px 14px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, color: c.text, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
        <button
          disabled={loading}
          onClick={() => handleAction(REQUEST_STATUS.REJECTED)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: '1.5px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}
        >
          <XCircle size={16} /> Reject Request
        </button>
        <button
          disabled={loading}
          onClick={() => handleAction(REQUEST_STATUS.APPROVED)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}
        >
          <CheckCircle size={16} /> {loading ? 'Processing…' : 'Approve'}
        </button>
      </div>
    </section>
  ) : null;
  // Only show Pending and Rejected — approved items go to Active Hosting section
  const allStatuses = [REQUEST_STATUS.PENDING, REQUEST_STATUS.REJECTED];
  const filteredRequests = requests.filter(r => normalizeRequestStatus(r.status) === normalizeRequestStatus(statusFilter));

  return (
    <div>
      <style>{`
        .requests-table-wrapper {
          display: block;
        }
        .requests-cards-wrapper {
          display: none;
        }
        @media (max-width: 768px) {
          .requests-table-wrapper {
            display: none;
          }
          .requests-cards-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
          }
        }
      `}</style>
      <DeleteModal open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleteLoading} />

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4, width: 'fit-content', overflowX: 'auto', maxWidth: '100%' }}>
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
        <div className="requests-table-wrapper" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
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
            {filteredRequests.map((req, i) => {
              const parsed = parsePkg(req.package_type);
              const plan = req.plan_name || parsed.plan;
              const billing = req.billing_period || parsed.billing;
              const domainVal = req.domain || parsed.domain;
              return (
                <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRequest(req)}>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <span style={{ fontWeight: 600, display: 'block' }}>New Request</span>
                    <span style={{ fontSize: 12, color: c.subText }}>{domainVal || req.notes || 'Hosting Order'}</span>
                  </td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <span style={{ fontWeight: 500, display: 'block' }}>{req.customers?.name || getCustomerName(req.customer_id)}</span>
                    <span style={{ fontSize: 12, color: c.subText }}>
                      {plan} ({billing})
                      {req.price != null ? ` | ${req.currency === 'USD' ? '$' : 'Rs.'}${Number(req.price).toFixed(2)}` : ''}
                    </span>
                  </td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <span style={{ color: c.subText, fontSize: 13 }}>{req.created_at ? format(new Date(req.created_at), 'MMM dd, HH:mm') : '—'}</span>
                  </td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={req.status} /></td>
                  <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Btn color="#8b5cf6" onClick={() => setSelectedRequest(req)}>View →</Btn>
                      <Btn color="#ef4444" onClick={(e) => { e.stopPropagation(); setDeleteTarget(req.id); }} title="Delete request">
                        <Trash2 size={12} /> Delete
                      </Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredRequests.length === 0 && <tr><td colSpan={5} style={emptyS}>No requests found</td></tr>}
          </tbody>
        </table>
        </div>

        {/* Mobile Cards View */}
        <div className="requests-cards-wrapper">
          {filteredRequests.map((req) => {
            const parsed = parsePkg(req.package_type);
            const plan = req.plan_name || parsed.plan;
            const billing = req.billing_period || parsed.billing;
            const domainVal = req.domain || parsed.domain;
            return (
              <div 
                key={req.id} 
                onClick={() => setSelectedRequest(req)}
                style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14, color: c.text }}>New Request</span>
                    <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>{plan} ({billing})</div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, padding: '8px 0' }}>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Customer</div>
                    <div style={{ color: c.text, fontWeight: 500, marginTop: 2 }}>{req.customers?.name || getCustomerName(req.customer_id)}</div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Domain / Notes</div>
                    <div style={{ color: c.text, marginTop: 2, fontFamily: domainVal ? 'monospace' : 'inherit' }}>{domainVal || req.notes || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Price</div>
                    <div style={{ color: c.text, fontWeight: 600, marginTop: 2 }}>
                      {req.price != null ? `${req.currency === 'USD' ? '$' : 'Rs.'}${Number(req.price).toFixed(2)}` : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Requested Date</div>
                    <div style={{ color: c.text, marginTop: 2 }}>
                      {req.created_at ? format(new Date(req.created_at), 'MMM dd, HH:mm') : '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }} onClick={e => e.stopPropagation()}>
                  <Btn color="#8b5cf6" onClick={() => setSelectedRequest(req)}>View →</Btn>
                  <Btn color="#ef4444" onClick={() => setDeleteTarget(req.id)} title="Delete request">
                    <Trash2 size={12} /> Delete
                  </Btn>
                </div>
              </div>
            );
          })}
          {filteredRequests.length === 0 && <div style={emptyS}>No requests found</div>}
        </div>
      </div>

      <AssignHostingDialog
        open={!!selectedRequest}
        onClose={() => { setSelectedRequest(null); setAdminReply(''); setRejectReason(''); }}
        customer={selectedCustomer}
        request={selectedRequest}
        c={c}
        onSuccess={() => { setSelectedRequest(null); setAdminReply(''); setRejectReason(''); loadData(); }}
        footerContent={requestFooterContent}
      />
    </div>
  );
}

export default AdminHostingRequestManagement;
