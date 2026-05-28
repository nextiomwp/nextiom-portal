import React, { useState, useEffect } from 'react';
import { Search, Loader2, Mail } from 'lucide-react';
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

  useEffect(() => { loadEmails(); }, [user]);

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

  const handleAutoRenew = async (id, current) => {
    try {
      await updateEmailRequest(id, { auto_renew: !current });
      loadEmails();
      toast({ title: 'Success', description: 'Auto-renew status updated' });
    } catch (err) {
      console.error('Auto-renew update failed:', err);
      // If column doesn't exist, try adding it via the update function which handles it
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
                {['Email', 'Status', 'Expiry', 'Auto Renew', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 20px',
                    textAlign: i === 4 ? 'right' : 'left',
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
                      {email.expiry_date ? new Date(email.expiry_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <Switch
                        checked={!!email.auto_renew}
                        onCheckedChange={() => handleAutoRenew(email.id, email.auto_renew)}
                      />
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <span style={{ color: subText, fontSize: 12 }}>—</span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: subText, fontSize: 13 }}>
                    No emails found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MyEmailsPage;
