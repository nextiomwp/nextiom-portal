import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, AlertTriangle, Key, User as UserIcon, Loader2, FileText, X } from 'lucide-react';
import { getEmailRequests, updateEmailRequest, deleteEmailRequest, REQUEST_STATUS, getCustomers, addNotification } from '@/lib/storage';
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

function ApproveEmailDialog({ open, request, onClose, onConfirm, saving }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginUrl, setLoginUrl] = useState('');

  React.useEffect(() => {
    if (open) {
      setUsername(request?.email || '');
      setPassword('');
      setLoginUrl(request?.url || '');
    }
  }, [open, request]);

  if (!open || !request) return null;

  const c = { text: '#fff', subText: '#a0a0a0', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', brand: 'var(--brand-color)', input: '#22252C' };
  const inpS = { width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.input, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelS = { fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: c.card, border: `1px solid ${c.borderStrong}`, borderRadius: 16, maxWidth: 480, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={16} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>Approve & Set Credentials</div>
            <div style={{ fontSize: 11, color: c.subText }}>{request.email}</div>
          </div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: c.subText, margin: 0 }}>Enter the email login credentials the customer will use to access this email account.</p>
          <div>
            <label style={labelS}>Username</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
              <input
                style={{ ...inpS, paddingLeft: 28 }}
                placeholder="e.g. info@domain.com"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelS}>Password</label>
            <div style={{ position: 'relative' }}>
              <Key size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
              <input
                style={{ ...inpS, paddingLeft: 28 }}
                type="text"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelS}>Login URL</label>
            <input
              style={inpS}
              placeholder="https://mail.example.com"
              value={loginUrl}
              onChange={e => setLoginUrl(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={() => onConfirm(username, password, loginUrl)}
            disabled={saving || !password.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving || !password.trim() ? 'not-allowed' : 'pointer', opacity: saving || !password.trim() ? 0.7 : 1 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {saving ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}


function AdminEmailRequestManagement({ isDark = true }) {
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState(REQUEST_STATUS.PENDING);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveSaving, setApproveSaving] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [docLoading, setDocLoading] = useState(null);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)', panel: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: 'var(--brand-color)', panel: '#f5f5f5' };

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
    const [reqs, custs] = await Promise.all([getEmailRequests(), getCustomers()]);
    setRequests(reqs || []);
    setCustomers(custs || []);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const req = requests.find(r => r.id === id);
    const isApproved = String(newStatus).toLowerCase() === REQUEST_STATUS.APPROVED.toLowerCase();
    if (isApproved) {
      setApproveTarget(req);
      return;
    }
    await updateEmailRequest(id, { status: String(newStatus).toLowerCase(), updated_at: new Date().toISOString(), start_date: isApproved ? new Date().toISOString() : undefined });
    if (req?.customer_id) {
      await addNotification({
        customer_id: req.customer_id,
        type: isApproved ? 'update' : 'expiration',
        title: isApproved ? `Email Request Approved — ${req.email}` : `Email Request Rejected — ${req.email}`,
        message: isApproved ? `Your email request for ${req.email} has been approved.` : `Your email request for ${req.email} has been declined.`
      }).catch(() => { });
    }
    toast({ title: 'Request Updated', description: `Request marked as ${newStatus}` });
    loadData();
  };

  const handleApproveConfirm = async (username, password, loginUrl) => {
    if (!approveTarget) return;
    setApproveSaving(true);
    try {
      await updateEmailRequest(approveTarget.id, {
        status: REQUEST_STATUS.APPROVED.toLowerCase(),
        email_username: username.trim() || null,
        email_password: password.trim() || null,
        url: loginUrl.trim() || null,
        start_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (approveTarget?.customer_id) {
        await addNotification({
          customer_id: approveTarget.customer_id,
          type: 'update',
          title: `Email Request Approved — ${approveTarget.email}`,
          message: `Your email request for ${approveTarget.email} has been approved. You can view login credentials from the My Emails page.`
        }).catch(() => { });

        try {
          const { shouldSendPurchaseSms, sendPurchaseSms } = await import('@/lib/sms');
          if (await shouldSendPurchaseSms()) {
            const cust = customers.find(cu => cu.id === approveTarget.customer_id) || approveTarget.customers;
            if (cust?.phone) {
              await sendPurchaseSms({
                phone: cust.phone,
                customerName: cust.name || 'Valued Customer',
                serviceLabel: `email account "${approveTarget.email}"`,
                customerId: approveTarget.customer_id
              });
            }
          }
        } catch (smsErr) {
          console.error('Failed to send email approval SMS:', smsErr);
        }
      }
      toast({ title: 'Approved', description: `Email approved with credentials set.` });
      setApproveTarget(null);
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to approve email', variant: 'destructive' });
    } finally {
      setApproveSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const req = requests.find(r => r.id === deleteTarget);
    try {
      await deleteEmailRequest(deleteTarget);
      const email = req?.email || 'Unknown Email';
      const custName = req ? getCustomerName(req) : 'Unknown';
      await addNotification({
        customer_id: null,
        type: 'delete',
        title: `Email Request Deleted — ${email}`,
        message: `Admin permanently deleted an email request for ${custName} (${email}).`,
      }).catch(() => { });
      toast({ title: 'Deleted', description: 'Email request deleted.' });
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

  // Only show Pending and Rejected — approved items go to Active Emails section
  const allStatuses = [REQUEST_STATUS.PENDING, REQUEST_STATUS.REJECTED];
  const filtered = requests.filter(r => normalizeRequestStatus(r.status) === normalizeRequestStatus(statusFilter));

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
      <ApproveEmailDialog open={!!approveTarget} request={approveTarget} onClose={() => setApproveTarget(null)} onConfirm={handleApproveConfirm} saving={approveSaving} />

      {/* Status filter tabs */}
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
        <SectionHeader title="Email Requests" accent="#ba7517" />
        <div className="requests-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Type</th>
                <th style={thS}>Domain</th>
                <th style={thS}>Customer</th>
                <th style={thS}>Date</th>
                <th style={thS}>Status</th>
                <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => (
                <tr key={req.id}>
                  <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ fontWeight: 600 }}>Email Registration</span></td>
                  <td style={i % 2 === 0 ? tdS : tdAlt}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb' }}>{req.email || '—'}</span>
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
              {filtered.length === 0 && <tr><td colSpan={6} style={emptyS}>No email requests found</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="requests-cards-wrapper">
          {filtered.map((req) => (
            <div key={req.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: c.text }}>Email Registration</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb', fontSize: 13, marginTop: 2 }}>{req.email || '—'}</div>
                </div>
                <StatusBadge status={fmtStatus(req.status)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, padding: '8px 0' }}>
                <div>
                  <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Customer</div>
                  <div style={{ color: c.text, fontWeight: 500, marginTop: 2 }}>{getCustomerName(req)}</div>
                </div>
                <div>
                  <div style={{ color: c.subText, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>Requested Date</div>
                  <div style={{ color: c.text, marginTop: 2 }}>
                    {req.created_at ? format(new Date(req.created_at), 'MMM dd, yyyy HH:mm') : '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 4 }}>
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
            </div>
          ))}
          {filtered.length === 0 && <div style={emptyS}>No email requests found</div>}
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

export default AdminEmailRequestManagement;
