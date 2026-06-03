import React, { useState, useEffect } from 'react';
import { Search, Loader2, Mail, Eye, X, Lock, Key } from 'lucide-react';
import { getCustomerEmailRequests, updateEmailRequest, resolveCustomerId } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';

function statusStyle(status, isDark) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'completed', 'registered', 'connected'].includes(s))
    return { bg: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7', color: '#16a34a' };
  if (s.startsWith('pending'))
    return { bg: isDark ? 'rgba(234,179,8,0.15)' : '#fef9c3', color: '#ca8a04' };
  if (['rejected', 'cancelled', 'disabled', 'expired', 'suspended'].includes(s))
    return { bg: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#dc2626' };
  return { bg: isDark ? 'rgba(100,116,139,0.15)' : '#f1f5f9', color: '#64748b' };
}

function MyEmailsPage({ user, isDark = false, c = {} }) {
  const [emails, setEmails] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';

  useEffect(() => { loadEmails(); }, [user?.id, user?.email]);

  const loadEmails = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const customerId = await resolveCustomerId({ customerId: user.id, userId: user.id, email: user.email });
      if (!customerId) { setEmails([]); return; }
      const data = await getCustomerEmailRequests(customerId);
      setEmails(Array.isArray(data) ? data : []);
    } catch {
      setEmails([]);
      toast({ title: 'Error', description: 'Failed to load emails', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const [viewEmail, setViewEmail] = useState(null);
  const [showCredentials, setShowCredentials] = useState(null);

  const handleAutoRenew = async (id, current) => {
    try {
      await updateEmailRequest(id, { auto_renew: !current });
      loadEmails();
      toast({ title: 'Success', description: 'Auto-renew status updated' });
    } catch (err) {
      console.error('Auto-renew update failed:', err);
      toast({ title: 'Error', description: 'Could not update auto-renew status. Database setup required.', variant: 'destructive' });
    }
  };

  const filtered = emails.filter(e =>
    (e.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Loader2 style={{ width: 28, height: 28, color: brand }} className="animate-spin" />
      </div>
    );
  }

  const inputStyle = {
    width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
    fontSize: 13, border: `1px solid ${borderStrong}`,
    borderRadius: 10, background: panel2, color: text, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail style={{ width: 16, height: 16, color: brand }} />
        </div>
        <h1 style={{ color: text, fontSize: 18, fontWeight: 700 }}>My Emails</h1>
      </div>

      <div style={{
        background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${border}`,
        borderRadius: 20,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
          <div style={{ position: 'relative', maxWidth: 320 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: subText }} />
            <input
              type="text"
              placeholder="Search emails…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = borderStrong}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: panel2 }}>
                {['Email', 'Status', 'Start Date', 'Expiry', 'Auto Renew', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 20px',
                    textAlign: i === 5 ? 'right' : 'left',
                    fontSize: 10, fontWeight: 700, color: subText,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    borderBottom: `1px solid ${border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(email => {
                const { bg, color } = statusStyle(email.status, isDark);
                return (
                  <tr
                    key={email.id}
                    style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 20px', color: text, fontWeight: 600, fontSize: 13 }}>{email.email}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                        {email.status || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', color: subText, fontSize: 13 }}>
                      {email.start_date ? new Date(email.start_date).toLocaleDateString() : email.created_at ? new Date(email.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 20px', color: subText, fontSize: 13 }}>
                      {email.expiry_date ? new Date(email.expiry_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <Switch
                        checked={!!email.auto_renew}
                        onCheckedChange={() => handleAutoRenew(email.id, email.auto_renew)}
                      />
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setShowCredentials(email)}
                          style={{ padding: '6px 10px', background: email.email_username && email.email_password ? (isDark ? 'rgba(234,179,8,0.12)' : '#fef9c3') : (isDark ? 'rgba(148,163,184,0.1)' : '#f1f5f9'), color: email.email_username && email.email_password ? '#ca8a04' : subText, border: `1px solid ${email.email_username && email.email_password ? (isDark ? 'rgba(234,179,8,0.25)' : '#fde68a') : border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="View login credentials"
                        >
                          <Lock size={12} />
                        </button>
                        <button onClick={() => setViewEmail(email)} style={{ padding: '6px 12px', background: brandLight, color: brand, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={12} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: subText, fontSize: 13 }}>
                    No emails found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {viewEmail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: isDark ? '#1C1E24' : '#fff', border: `1px solid ${border}`, borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={18} color={brand} />
                <span style={{ fontWeight: 700, fontSize: 16, color: text }}>Email Details</span>
              </div>
              <button onClick={() => setViewEmail(null)} style={{ background: 'none', border: 'none', color: subText, cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                { label: 'Email', value: viewEmail.email },
                { label: 'Status', value: viewEmail.status },
                { label: 'Registration Period', value: viewEmail.registration_period ? `${viewEmail.registration_period} Year(s)` : '—' },
                { label: 'Start Date', value: viewEmail.start_date ? new Date(viewEmail.start_date).toLocaleDateString() : viewEmail.created_at ? new Date(viewEmail.created_at).toLocaleDateString() : '—' },
                { label: 'Expiry Date', value: viewEmail.expiry_date ? new Date(viewEmail.expiry_date).toLocaleDateString() : '—' },
                { label: 'Auto Renew', value: viewEmail.auto_renew ? 'Enabled' : 'Disabled' },
                { label: 'Notes', value: viewEmail.notes || '—' },
                { label: 'Created', value: viewEmail.created_at ? new Date(viewEmail.created_at).toLocaleString() : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', color: text, fontSize: 13 }}>{value}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setViewEmail(null)} style={{ width: '100%', marginTop: 20, padding: '10px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: subText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {showCredentials && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: isDark ? '#1C1E24' : '#fff', border: `1px solid ${border}`, borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={18} color="#ca8a04" />
                <span style={{ fontWeight: 700, fontSize: 16, color: text }}>Login Credentials</span>
              </div>
              <button onClick={() => setShowCredentials(null)} style={{ background: 'none', border: 'none', color: subText, cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: subText, marginBottom: 4 }}>Email Account</div>
              <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', color: text, fontSize: 13 }}>{showCredentials.email}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: subText, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Login URL</div>
              <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, wordBreak: 'break-all' }}>
                {showCredentials.url ? (
                  <a href={showCredentials.url} target="_blank" rel="noopener noreferrer" style={{ color: brand, textDecoration: 'underline' }}>{showCredentials.url}</a>
                ) : (
                  <span style={{ color: subText, fontStyle: 'italic' }}>Not provided</span>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Key size={12} /> Username
                </div>
                <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', color: text, fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{showCredentials.email_username || <span style={{ color: subText, fontStyle: 'italic' }}>Not set</span>}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: subText, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Key size={12} /> Password
                </div>
                <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', color: text, fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{showCredentials.email_password || <span style={{ color: subText, fontStyle: 'italic' }}>Not set</span>}</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: subText, marginTop: 16, padding: '8px 12px', background: isDark ? 'rgba(234,179,8,0.1)' : '#fef9c3', borderRadius: 8 }}>
              <Lock size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Keep these credentials secure. Do not share them with others.
            </p>
            <button onClick={() => setShowCredentials(null)} style={{ width: '100%', marginTop: 16, padding: '10px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: subText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyEmailsPage;
