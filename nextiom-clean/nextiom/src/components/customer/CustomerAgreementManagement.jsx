import React, { useState, useEffect } from 'react';
import { FileText, Download, Upload, Loader2, CheckCircle2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { getAgreements, uploadSignedAgreement, openAgreementSecurely } from '@/lib/agreements';
import { addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function CustomerAgreementManagement({ user, isDark = true, c }) {
  const [agreements, setAgreements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const { toast } = useToast();
  const [openingId, setOpeningId] = useState(null);

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', padding: 20, marginBottom: 16, boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)' };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getAgreements(user.id);
      setAgreements(data || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load agreements.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (agreementId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(agreementId);
      await uploadSignedAgreement(agreementId, file);
      
      try {
        const agreementObj = agreements.find(a => a.id === agreementId);
        const agreementName = agreementObj ? agreementObj.name : 'Agreement';
        const clientName = user.name || user.email || 'Customer';

        await addNotification({
          customer_id: null,
          type: `agreement_signed:${agreementId}`,
          title: `Agreement Signed — ${clientName}`,
          message: `${clientName} has uploaded the signed copy of "${agreementName}".`
        });
      } catch (errNotif) {
        console.error('Failed to create admin notification for signed agreement:', errNotif);
      }

      toast({ title: 'Upload Successful', description: 'Your signed agreement has been uploaded and is waiting for review.' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Upload Failed', description: err.message || 'Failed to upload signed agreement.', variant: 'destructive' });
    } finally {
      setUploadingId(null);
    }
  };

  const StatusDisplay = ({ status }) => {
    const s = String(status || '').toLowerCase();
    
    if (s === 'completed') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 13, fontWeight: 600 }}>
          <ShieldCheck size={16} />
          <span>Active & Completed</span>
        </div>
      );
    }
    
    if (s === 'signed') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0ea5e9', fontSize: 13, fontWeight: 600 }}>
          <Clock size={16} />
          <span>Signed (Under Review)</span>
        </div>
      );
    }
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
        <AlertCircle size={16} />
        <span>Pending Signature</span>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: c.text }}>Agreements & Contracts</h1>
        <p style={{ fontSize: 14, color: c.subText }}>Review, download templates, and upload signed agreements for your services.</p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: c.brand }} />
        </div>
      ) : agreements.length === 0 ? (
        <div style={{
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: '48px 24px',
          textAlign: 'center',
          color: c.subText
        }}>
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.4, color: c.brand }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, marginBottom: 6 }}>No Agreements Available</h3>
          <p style={{ fontSize: 13, maxWidth: 360, margin: '0 auto' }}>Currently, there are no agreements assigned to your account. When they are added by our team, they will show up here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {agreements.map((ag) => (
            <div key={ag.id} style={cardS}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'var(--brand-color-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={22} style={{ color: c.brand }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: '0 0 4px' }}>{ag.name}</h3>
                    <p style={{ fontSize: 12, color: c.subText, margin: '0 0 12px' }}>
                      Assigned on: {new Date(ag.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </p>
                    <StatusDisplay status={ag.status} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {ag.file_path && (
                    <button
                      disabled={openingId === `template-${ag.id}`}
                      onClick={async () => {
                        try {
                          setOpeningId(`template-${ag.id}`);
                          await openAgreementSecurely(ag.file_path);
                        } catch (err) {
                          toast({ title: 'Error', description: 'Could not open template. Please try again.', variant: 'destructive' });
                        } finally {
                          setOpeningId(null);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: 'transparent',
                        border: `1.5px solid ${c.border}`,
                        color: c.text,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                        cursor: openingId === `template-${ag.id}` ? 'not-allowed' : 'pointer',
                        opacity: openingId === `template-${ag.id}` ? 0.6 : 1,
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = c.hover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {openingId === `template-${ag.id}` ? (
                        <><Loader2 size={15} className="animate-spin" />Opening...</>
                      ) : (
                        <><Download size={15} />Download Template</>
                      )}
                    </button>
                  )}

                  {ag.status === 'pending_signature' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        disabled={uploadingId === ag.id}
                        style={{
                          background: c.brand,
                          color: '#fff',
                          border: 'none',
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
                        {uploadingId === ag.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={15} />
                            Upload Signed Agreement
                          </>
                        )}
                      </button>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileUpload(ag.id, e)}
                        disabled={uploadingId === ag.id}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  )}

                  {ag.signed_file_path && (
                    <button
                      disabled={openingId === `signed-${ag.id}`}
                      onClick={async () => {
                        try {
                          setOpeningId(`signed-${ag.id}`);
                          await openAgreementSecurely(ag.signed_file_path);
                        } catch (err) {
                          toast({ title: 'Error', description: 'Could not open signed copy. Please try again.', variant: 'destructive' });
                        } finally {
                          setOpeningId(null);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: 'none',
                        color: isDark ? '#38bdf8' : '#0369a1',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: openingId === `signed-${ag.id}` ? 'not-allowed' : 'pointer',
                        opacity: openingId === `signed-${ag.id}` ? 0.6 : 1,
                      }}
                    >
                      {openingId === `signed-${ag.id}` ? (
                        <><Loader2 size={15} className="animate-spin" />Opening...</>
                      ) : (
                        <><Download size={15} />View Uploaded Signed Copy</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomerAgreementManagement;
