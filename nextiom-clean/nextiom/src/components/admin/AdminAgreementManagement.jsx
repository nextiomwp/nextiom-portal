import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, Trash2, FileText, Download, Upload, Check, RefreshCw, X, ChevronDown, CheckCircle, Clock } from 'lucide-react';
import { getCustomers } from '@/lib/storage';
import { getAgreements, createAgreement, updateAgreementStatus, deleteAgreement, getAgreementUrl } from '@/lib/agreements';
import { useToast } from '@/components/ui/use-toast';
import AdminAgreementCreator from '@/components/admin/AdminAgreementCreator';

function AdminAgreementManagement({ isDark = true }) {
  const [agreements, setAgreements] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Upload form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [agreementName, setAgreementName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });
  
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', input: '#22252C', overlay: 'rgba(0,0,0,0.6)' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', borderStrong: '#d0d0d0', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', input: '#f5f5f5', overlay: 'rgba(0,0,0,0.4)' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };
  const inpS = { width: '100%', padding: '8px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: c.input, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  useEffect(() => {
    loadData();
  }, []);

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
    try {
      setIsLoading(true);
      const [agreementsData, customersData] = await Promise.all([
        getAgreements(),
        getCustomers()
      ]);
      setAgreements(agreementsData || []);
      // Limit to active/approved customers
      setCustomers((customersData || []).filter(cust => String(cust.status).toLowerCase() === 'active'));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load agreements', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !agreementName || !selectedFile) {
      toast({ title: 'Validation Error', description: 'Please fill out all fields and select a file.', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitLoading(true);
      await createAgreement(selectedCustomerId, agreementName, selectedFile);
      toast({ title: 'Success', description: 'Agreement uploaded successfully.' });
      setShowUploadModal(false);
      
      // Reset form
      setSelectedCustomerId('');
      setAgreementName('');
      setSelectedFile(null);
      
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Upload Failed', description: error.message || 'Failed to upload agreement.', variant: 'destructive' });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleStatusChange = async (agreementId, newStatus) => {
    try {
      await updateAgreementStatus(agreementId, newStatus);
      toast({ title: 'Status Updated', description: `Agreement marked as ${newStatus}.` });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Update Failed', description: 'Failed to update agreement status.', variant: 'destructive' });
    }
  };

  const handleDelete = async (agreementId) => {
    if (!window.confirm('Are you sure you want to delete this agreement? This will delete the template and signed uploads.')) return;
    try {
      await deleteAgreement(agreementId);
      toast({ title: 'Agreement Deleted', description: 'Agreement and files removed successfully.' });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Deletion Failed', description: 'Failed to delete agreement.', variant: 'destructive' });
    }
  };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const col = isDark
      ? s === 'completed' ? { bg: '#1a3020', color: '#4ade80', dot: '#4ade80' }
        : s === 'signed' ? { bg: '#1e293b', color: '#38bdf8', dot: '#38bdf8' }
        : { bg: '#3b2508', color: '#fb923c', dot: '#fb923c' }
      : s === 'completed' ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
        : s === 'signed' ? { bg: '#e0f2fe', color: '#0369a1', dot: '#0284c7' }
        : { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' };
        
    const displayLabel = s === 'pending_signature' ? 'Pending Signature' : s;

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
        {displayLabel}
      </span>
    );
  };

  const filteredAgreements = agreements.filter(ag => {
    const matchSearch = (ag.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ag.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ag.customers?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchSearch) return false;
    if (statusFilter === 'all') return true;
    return ag.status === statusFilter;
  });

  if (view === 'create') {
    return (
      <AdminAgreementCreator
        isDark={isDark}
        customers={customers}
        onBack={() => {
          setView('list');
          loadData();
        }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Agreement Management</h1>
          <p style={{ fontSize: 14, color: c.subText }}>Manage, upload templates, and track signature statuses for customer agreements.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setView('create')}
            style={{
              background: c.brand,
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            {!isMobile && 'Create Agreement'}
          </button>
          
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              background: 'transparent',
              color: c.text,
              border: `1.5px solid ${c.border}`,
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Upload size={16} />
            {!isMobile && 'Upload Template'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200 }}>
          <Search size={16} color={c.subText} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by customer name, email or agreement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inpS, paddingLeft: 36 }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {['all', 'pending_signature', 'signed', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${statusFilter === st ? c.brand : c.border}`,
                background: statusFilter === st ? c.brand : c.card,
                color: statusFilter === st ? '#fff' : c.text,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s'
              }}
            >
              {st === 'pending_signature' ? 'Pending Signature' : st}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: c.brand }} />
        </div>
      ) : (
        <div style={cardS}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thS}>Agreement Name</th>
                  <th style={thS}>Customer</th>
                  <th style={thS}>Status</th>
                  <th style={thS}>Uploaded Date</th>
                  <th style={thS}>Files</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={emptyS}>No agreements found matching criteria</td>
                  </tr>
                ) : (
                  filteredAgreements.map((ag) => (
                    <tr key={ag.id} style={{ borderTop: `1px solid ${c.border}` }}>
                      <td style={tdS}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={16} style={{ color: c.brand }} />
                          <span style={{ fontWeight: 600 }}>{ag.name}</span>
                        </div>
                      </td>
                      <td style={tdS}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{ag.customers?.name || 'Unknown'}</div>
                          <div style={{ fontSize: 11, color: c.subText }}>{ag.customers?.email || ''}</div>
                        </div>
                      </td>
                      <td style={tdS}>
                        <StatusBadge status={ag.status} />
                      </td>
                      <td style={tdS}>
                        {new Date(ag.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td style={tdS}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {ag.file_path && (
                            <a
                              href={getAgreementUrl(ag.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Download Unsigned Template"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 6,
                                background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                                color: c.text,
                                fontSize: 11,
                                fontWeight: 500,
                                textDecoration: 'none'
                              }}
                            >
                              <Download size={12} />
                              Template
                            </a>
                          )}
                          {ag.signed_file_path && (
                            <a
                              href={getAgreementUrl(ag.signed_file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Download Signed Agreement"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 6,
                                background: 'rgba(56,189,248,0.15)',
                                color: isDark ? '#38bdf8' : '#0369a1',
                                fontSize: 11,
                                fontWeight: 500,
                                textDecoration: 'none'
                              }}
                            >
                              <Download size={12} />
                              Signed
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdS, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {ag.status === 'signed' && (
                            <button
                              onClick={() => handleStatusChange(ag.id, 'completed')}
                              title="Approve / Complete Agreement"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: 'none',
                                background: 'rgba(99,153,34,0.15)',
                                color: '#639922',
                                cursor: 'pointer'
                              }}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(ag.id)}
                            title="Delete Agreement"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: 'none',
                              background: 'rgba(229,57,53,0.12)',
                              color: '#e53935',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: c.overlay,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 16
        }}>
          <div style={{
            background: c.card,
            border: `1px solid ${c.borderStrong}`,
            borderRadius: 14,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Upload Customer Agreement</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Select Customer</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    style={{ ...inpS, appearance: 'none', paddingRight: 32 }}
                  >
                    <option value="">-- Choose active customer --</option>
                    {customers.map((cust) => (
                      <option key={cust.id} value={cust.id}>{cust.name} ({cust.email})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} color={c.subText} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Agreement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Service Level Agreement 2026"
                  value={agreementName}
                  onChange={(e) => setAgreementName(e.target.value)}
                  required
                  style={inpS}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>Upload Unsigned Agreement Template</label>
                <div style={{
                  border: `2px dashed ${c.border}`,
                  borderRadius: 8,
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: isDark ? 'rgba(255,255,255,0.01)' : '#fdfdfd',
                  cursor: 'pointer',
                  position: 'relative'
                }}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    required
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                  <Upload size={24} color={c.brand} style={{ margin: '0 auto 8px' }} />
                  {selectedFile ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{selectedFile.name}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 500, color: c.text }}>Click or drag file to upload</div>
                      <div style={{ fontSize: 11, color: c.subText, marginTop: 4 }}>PDF, DOCX, PNG, JPG (Max 10MB)</div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1.5px solid ${c.border}`,
                    background: 'transparent',
                    color: c.text,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    background: c.brand,
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isSubmitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Template'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAgreementManagement;
