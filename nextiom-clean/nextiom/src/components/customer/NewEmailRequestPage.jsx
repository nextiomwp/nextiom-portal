import React, { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { resolveCustomerId, assertPortalActionsAllowed } from '@/lib/storage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

function NewEmailRequestPage({ onSuccess, user, isDark = false, c = {} }) {
  const [emailName, setEmailName] = useState('');
  const [extension, setExtension] = useState('.com');
  const [period, setPeriod] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await assertPortalActionsAllowed();
      if (!emailName) {
        toast({ title: 'Error', description: 'Please enter a domain name', variant: 'destructive' });
        return;
      }
      const customerId = await resolveCustomerId({
        customerId: user?.id,
        userId: authUser?.id,
        email: authUser?.email,
      });
      if (!customerId) throw new Error('Customer profile not found');

      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setFullYear(today.getFullYear() + parseInt(period));

      const email = `${emailName}${extension}`;
      const { data: emailRequest, error: emailError } = await supabase.from('email_requests').insert([{
        customer_id: customerId,
        email,
        status: 'pending',
        registration_period: parseInt(period),
        expiry_date: expiryDate.toISOString(),
        notes: notes || null,
        created_at: new Date().toISOString(),
      }]).select().single();

      if (emailError) throw new Error(emailError?.message || 'Failed to create email request');
      if (!emailRequest) throw new Error('No data returned from email request insert');


      await supabase.from('notifications').insert([{
        type: 'email_request',
        title: 'New Email Request',
        message: `Email order requested: ${emailName}${extension} (${period} Year${period !== '1' ? 's' : ''})${notes ? ` - Notes: ${notes}` : ''}`,
        customer_id: customerId,
        is_read: false,
        created_at: new Date().toISOString(),
      }]);

      
      setSubmitted(true);
      toast({ title: 'Request Submitted!', description: 'Admin has been notified.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: err?.message || 'Failed to submit. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const sectionCard = {
    background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${border}`,
    borderRadius: 20,
    padding: '24px 28px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.05)',
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: `1px solid ${borderStrong}`, borderRadius: 10,
    background: panel2, color: text, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: subText, marginBottom: 6 };

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <CheckCircle style={{ width: 32, height: 32, color: '#16a34a' }} />
        </div>
        <h2 style={{ color: text, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Request Submitted!</h2>
        <p style={{ color: subText, fontSize: 14, maxWidth: 400, marginBottom: 24, lineHeight: 1.6 }}>
          Your request for <strong style={{ color: text }}>{emailName}{extension}</strong> has been received. You will be notified once admin reviews it.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setSubmitted(false); setEmailName(''); setNotes(''); }}
            style={{
              padding: '10px 20px', borderRadius: 10,
              background: 'transparent', color: subText,
              border: `1px solid ${borderStrong}`, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Order Another
          </button>
          <button
            onClick={onSuccess}
            style={{ padding: '10px 20px', borderRadius: 10, background: brand, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#d4692a'}
            onMouseLeave={e => e.currentTarget.style.background = brand}
          >
            View Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail style={{ width: 16, height: 16, color: brand }} />
        </div>
        <div>
          <h1 style={{ color: text, fontSize: 20, fontWeight: 800 }}>Order Email</h1>
          <p style={{ color: subText, fontSize: 12, marginTop: 2 }}>Submit a request to register a new domain name.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={labelStyle}>Email Name</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Mail style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: subText }} />
              <input
                type="text"
                value={emailName}
                onChange={e => setEmailName(e.target.value)}
                placeholder="example"
                style={{ ...inputStyle, paddingLeft: 34, fontSize: 15 }}
                onFocus={e => e.target.style.borderColor = brand}
                onBlur={e => e.target.style.borderColor = borderStrong}
              />
            </div>
            <select
              value={extension}
              onChange={e => setExtension(e.target.value)}
              style={{ ...inputStyle, width: 120, flex: 'none', fontSize: 15 }}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = borderStrong}
            >
              {['.com', '.net', '.org', '.io', '.co.uk', '.lk', '.xyz'].map(ext => (
                <option key={ext} value={ext}>{ext}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Registration Period</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = borderStrong}
            >
              {[['1', '1 Year'], ['2', '2 Years'], ['3', '3 Years'], ['5', '5 Years'], ['10', '10 Years']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Documents (Optional)</label>
            <input
              type="file"
              style={{
                ...inputStyle,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Notes / Comments</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ ...inputStyle, minHeight: 88, resize: 'none' }}
            placeholder="Any specific instructions?"
            onFocus={e => e.target.style.borderColor = brand}
            onBlur={e => e.target.style.borderColor = borderStrong}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px 28px', borderRadius: 10, background: brand, color: '#fff',
              fontWeight: 700, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#d4692a'; }}
            onMouseLeave={e => e.currentTarget.style.background = brand}
          >
            {loading ? 'Submitting…' : 'Submit Email Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewEmailRequestPage;
