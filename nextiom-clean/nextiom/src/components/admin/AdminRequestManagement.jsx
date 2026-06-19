import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, AlertTriangle, FileText, X, Loader2 } from 'lucide-react';
import { getDomainRequests, updateDomainRequest, deleteDomainRequest, REQUEST_STATUS, getCustomers, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { format } from '@/lib/supabaseHelpers';
import { getAdminRequestDocumentUrl } from '@/lib/requestDocuments';

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

function AdminRequestManagement({ isDark = true }) {
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState(REQUEST_STATUS.PENDING);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [docLoading, setDocLoading] = useState(null);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', panel: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', panel: '#f5f5f5' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}`, whiteSpace: 'nowrap' };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const col = isDark
      ? s === 'approved' || s === 'completed' ? { bg: '#1a3020', color: '#4ade80', dot: '#4ade80' }
        : s === 'pending' ? { bg: '#3b2508', color: '#fb923c', dot: '#fb923c' }
          : { bg: '#3a1515', color: '#f87171', dot: '#f87171' }
      : s === 'approved' || s === 'completed' ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
        : s === 'pending' ? { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' }
          : { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
        {status || '-'}
      </span>
    );
  };

  const Btn = ({ onClick, color, children, filled, title }) => (
    <button onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${color}`,
      background: filled ? color : 'transparent',
      color: filled ? '#fff' : color,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
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
    const [reqs, custs] = await Promise.all([getDomainRequests(), getCustomers()]);
    setRequests(reqs || []);
    setCustomers(custs || []);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const req = requests.find(r => r.id === id);
    const isApproved = String(newStatus).toLowerCase() === REQUEST_STATUS.APPROVED.toLowerCase();
    await updateDomainRequest(id, {
      status: String(newStatus).toLowerCase(),
      updated_at: new Date().toISOString(),
      start_date: isApproved ? new Date().toISOString() : undefined,
    });
    if (req?.customer_id) {
      await addNotification({
        customer_id: req.customer_id,
        type: isApproved ? 'update' : 'expiration',
        title: isApproved ? `Domain Request Approved — ${req.domain_name}` : `Domain Request Rejected — ${req.domain_name}`,
        message: isApproved ? `Your domain request for ${req.domain_name} has been approved.` : `Your domain request for ${req.domain_name} has been declined.`
      }).catch(() => { });
    }
    toast({ title: 'Request Updated', description: `Request marked as ${newStatus}` });
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const req = requests.find(r => r.id === deleteTarget);
    try {
      await deleteDomainRequest(deleteTarget);
      const domainName = req?.domain_name || 'Unknown Domain';
      const custName = req ? getCustomerName(req) : 'Unknown';
      await addNotification({
        customer_id: null,
        type: 'delete',
        title: `Domain Request Deleted — ${domainName}`,
        message: `Admin permanently deleted a domain request for ${custName} (${domainName}).`,
      }).catch(() => { });
      toast({ title: 'Deleted', description: 'Domain request deleted.' });
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Could not delete request.', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const getCustomerName = (req) => req.customers?.name || customers.find(cu => cu.id === req.customer_id)?.name || 'Unknown';
  const normalizeRequestStatus = (status) => {
    const s = String(status || '').toLowerCase();
    return s === 'completed' ? 'approved' : s;
  };
  const isPending = (status) => normalizeRequestStatus(status) === 'pending';
  const fmtStatus = (status) => {
    const normalized = normalizeRequestStatus(status);
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Unknown';
  };

  const handleViewDocument = async (docPath, reqId) => {
    if (!docPath) return;
    setDocLoading(reqId);
    try {
      const signedUrl = await getAdminRequestDocumentUrl(docPath);
      setDocumentUrl(signedUrl);
    } catch (err) {
      console.error('handleViewDocument error:', err);
      const msg = err?.message || '';
      if (msg.includes('not found') || err?.statusCode === '404' || err?.status === 404) {
        toast({ title: 'File Not Found', description: 'The document could not be found in storage. It may have been deleted.', variant: 'destructive' });
      } else {
        toast({ title: 'Cannot Open Document', description: 'Failed to generate a secure document link. Please ensure you are logged in as admin.', variant: 'destructive' });
      }
    } finally {
      setDocLoading(null);
    }
  };

  // Only show Pending and Rejected — approved items go to Active Domains section
  const allStatuses = [REQUEST_STATUS.PENDING, REQUEST_STATUS.REJECTED];
  const filtered = requests.filter(r => normalizeRequestStatus(r.status) === normalizeRequestStatus(statusFilter));

  return (
    <div>
      <DeleteModal open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleteLoading} />

      {/* Status filter tabs */}
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
        <SectionHeader title="Domain Requests" accent="#ba7517" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Type</th>
                <th style={thS}>Domain</th>
                <th style={thS}>Customer</th>
                <th style={thS}>Date</th>
                <th style={thS}>Status</th>
                <th style={thS}>Auto Renew</th>
                <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => (
                <tr key={req.id}>
                  <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ fontWeight: 600 }}>{req.type || 'New Registration'}</span></td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb' }}>{req.domain_name || '—'}</span>
                  </td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: c.subText }}>{getCustomerName(req)}</span></td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <span style={{ color: c.subText, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {req.created_at ? format(new Date(req.created_at), 'MMM dd, yyyy') : '—'}
                    </span>
                    <div style={{ fontSize: 11, color: c.subText }}>
                      {req.created_at ? format(new Date(req.created_at), 'HH:mm') : ''}
                    </div>
                  </td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}><StatusBadge status={fmtStatus(req.status)} /></td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <span style={{ color: req.auto_renew ? '#16a34a' : c.subText, fontWeight: 600, fontSize: 12 }}>{req.auto_renew ? 'Enabled' : 'Disabled'}</span>
                  </td>
                  <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                      {req.document_url && (
                        <Btn color="#8B5CF6" onClick={() => handleViewDocument(req.document_url, req.id)} title="View attached document">
                          {docLoading === req.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Document
                        </Btn>
                      )}
                      {isPending(req.status) && (
                        <>
                          <Btn color="#16a34a" filled onClick={() => handleStatusUpdate(req.id, REQUEST_STATUS.APPROVED)}><CheckCircle size={12} /> Approve</Btn>
                          <Btn color="#ef4444" onClick={() => handleStatusUpdate(req.id, REQUEST_STATUS.REJECTED)}><XCircle size={12} /> Reject</Btn>
                        </>
                      )}
                      <Btn color="#ef4444" onClick={() => setDeleteTarget(req.id)} title="Delete request"><Trash2 size={12} /> Delete</Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={emptyS}>No domain requests found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {documentUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDocumentUrl(null)}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, maxWidth: 800, width: '90vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: c.text, fontWeight: 700, fontSize: 14 }}>Attached Document</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={documentUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 8, background: c.brand, color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Download</a>
                <button onClick={() => setDocumentUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex' }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {documentUrl.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i) ? (
                <img src={documentUrl} alt="Document" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', margin: '0 auto', borderRadius: 8 }} />
              ) : documentUrl.match(/\.(pdf)$/i) ? (
                <iframe src={documentUrl} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }} title="Document" />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <FileText size={48} style={{ color: c.subText, marginBottom: 16 }} />
                  <p style={{ color: c.subText, fontSize: 14, marginBottom: 16 }}>This file type cannot be previewed directly.</p>
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', borderRadius: 8, background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Download File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRequestManagement;
