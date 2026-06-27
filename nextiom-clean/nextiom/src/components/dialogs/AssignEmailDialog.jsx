import React, { useState, useEffect } from 'react';
import { X, Mail, Loader2, Check, DollarSign, Key, User as UserIcon } from 'lucide-react';
import { assignEmailToCustomer, updateEmailRequest, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function AssignEmailDialog({ open, onClose, customer, c, onSuccess, request, isEditMode = false }) {
  const [emailName, setEmailName] = useState('');
  const [extension, setExtension] = useState('.com');
  const [regPeriod, setRegPeriod] = useState('1');
  const [price, setPrice] = useState('');
  const [multiYearPct, setMultiYearPct] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [emailUsername, setEmailUsername] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('approved');
  const [expiryDate, setExpiryDate] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    if (request) {
      setEmailName(request.email || '');
      setRegPeriod(request.registration_period ? String(request.registration_period) : '1');
      setPrice(request.price ? String(request.price) : '');
      setNotes(request.notes || '');
      setStartDate(request.start_date ? request.start_date.split('T')[0] : request.created_at ? request.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
      setEmailUsername(request.email_username || '');
      setEmailPassword(request.email_password || '');

      setUrl(request.url || '');
      setStatus(request.status || 'approved');
      setExpiryDate(request.expiry_date ? request.expiry_date.split('T')[0] : '');
      setAdminReply(request.admin_reply || '');
      setAutoRenew(!!request.auto_renew);
    } else {
      setEmailName('');
      setExtension('.com');
      setRegPeriod('1');
      setPrice('');
      setMultiYearPct('');
      setNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEmailUsername('');
      setEmailPassword('');

      setUrl('');
      setStatus('approved');
      setExpiryDate('');
      setAdminReply('');
      setAutoRenew(false);
    }
  }, [open, request]);

  if (!open) return null;

  const text = c.text || '#fff';
  const subText = c.subText || '#a0a0a0';
  const card = c.card || '#1C1E24';
  const border = c.border || 'rgba(255,255,255,0.06)';
  const borderStrong = c.borderStrong || 'rgba(255,255,255,0.10)';
  const brand = c.brand || 'var(--brand-color)';
  const input = c.input || '#22252C';
  const overlay = 'rgba(0,0,0,0.6)';

  const inpS = {
    width: '100%', padding: '8px 12px',
    border: `1.5px solid ${border}`, borderRadius: 8,
    background: input, color: text, fontSize: 13,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  };
  const labelS = {
    fontSize: 12, fontWeight: 600, color: subText,
    textTransform: 'uppercase', letterSpacing: 0.8,
    display: 'block', marginBottom: 6
  };

  const periodNum = parseInt(regPeriod) || 1;
  const showMultiPct = periodNum > 1;
  const basePrice = parseFloat(price) || 0;
  const pctBonus = parseFloat(multiYearPct) || 0;
  const calculatedPrice = showMultiPct
    ? basePrice + (basePrice * pctBonus / 100)
    : basePrice;

  const calcExpiry = () => {
    const d = startDate ? new Date(startDate) : new Date();
    d.setFullYear(d.getFullYear() + periodNum);
    return d.toISOString();
  };

  const handleSubmit = async () => {
    if (!emailName.trim()) {
      toast({ title: 'Error', description: isEditMode ? 'Please enter an email address' : 'Please enter an email name', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await updateEmailRequest(request.id, {
          email: emailName.trim(),
          url: url.trim() || null,
          status,
          expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
          admin_reply: adminReply.trim() || null,
          email_username: emailUsername.trim() || null,
          email_password: emailPassword.trim() || null,
          registration_period: regPeriod ? Number(regPeriod) : null,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          notes: notes.trim() || null,
          price: price ? parseFloat(price) : null,
          auto_renew: autoRenew,
        });
        addNotification({ customer_id: null, type: 'request_updated', title: `Email Updated — ${emailName}`, message: `Admin updated email record for ${emailName} (status: ${status}).` }).catch(() => {});
        toast({ title: 'Email Updated', description: 'Changes saved successfully.' });
      } else {
        const fullEmail = `${emailName.trim()}${extension}`;
        const finalPrice = calculatedPrice > 0 ? calculatedPrice : null;
        await assignEmailToCustomer({
          customerId: customer.id,
          email: fullEmail,
          registrationPeriod: regPeriod,
          expiryDate: calcExpiry(),
          notes: notes.trim() || null,
          price: finalPrice,
          startDate,
          emailUsername: emailUsername.trim() || null,
          emailPassword: emailPassword.trim() || null,
          url: url.trim() || null,
          auto_renew: autoRenew,
        });

        try {
          const { shouldSendPurchaseSms, sendPurchaseSms } = await import('@/lib/sms');
          if (await shouldSendPurchaseSms()) {
            if (customer?.phone) {
              await sendPurchaseSms({
                phone: customer.phone,
                customerName: customer.name || 'Valued Customer',
                serviceLabel: `email account "${fullEmail}"`,
                customerId: customer.id
              });
            }
          }
        } catch (smsErr) {
          console.error('Failed to send email assign SMS:', smsErr);
        }

        toast({ title: 'Email Assigned', description: `${fullEmail} assigned to ${customer.name}` });
        setEmailName(''); setExtension('.com'); setRegPeriod('1');
        setPrice(''); setMultiYearPct(''); setNotes(''); setStartDate(new Date().toISOString().split('T')[0]);
        setEmailUsername(''); setEmailPassword(''); setUrl('');
        setAutoRenew(false);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err?.message || (isEditMode ? 'Failed to update email' : 'Failed to assign email'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: overlay, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{
          background: card, border: `1px solid ${borderStrong}`,
          borderRadius: 16, width: '100%', maxWidth: 520,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          scrollbarWidth: 'thin'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(251,146,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} color="#fb923c" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: text }}>{isEditMode ? 'Edit Email' : 'Assign Email'}</div>
              <div style={{ fontSize: 11, color: subText }}>{customer?.name} — {customer?.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: subText, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email Name + Extension / Email Address */}
          {!isEditMode ? (
            <div>
              <label style={labelS}>Email Name *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Mail size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText }} />
                  <input
                    style={{ ...inpS, paddingLeft: 30 }}
                    placeholder="info@"
                    value={emailName}
                    onChange={e => setEmailName(e.target.value)}
                    onFocus={e => e.target.style.borderColor = brand}
                    onBlur={e => e.target.style.borderColor = border}
                  />
                </div>
                <select
                  style={{ ...inpS, width: 110, flex: 'none', appearance: 'none' }}
                  value={extension}
                  onChange={e => setExtension(e.target.value)}
                >
                  {['.com', '.net', '.org', '.io', '.co.uk', '.lk', '.xyz'].map(ext => (
                    <option key={ext} value={ext}>{ext}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 12, color: subText, marginTop: 4 }}>
                Full email: <strong style={{ color: text }}>{emailName || '...'}{extension}</strong>
              </div>
            </div>
          ) : (
            <div>
              <label style={labelS}>Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText }} />
                <input
                  style={{ ...inpS, paddingLeft: 30 }}
                  placeholder="user@example.com"
                  value={emailName}
                  onChange={e => setEmailName(e.target.value)}
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = border}
                />
              </div>
            </div>
          )}

          {/* Login URL */}
          <div>
            <label style={labelS}>Login URL</label>
            <input
              style={inpS}
              placeholder="https://mail.example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = border}
            />
          </div>

          {/* Status and Expiry Date */}
          {isEditMode && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelS}>Status</label>
                <select
                  style={{ ...inpS, appearance: 'none' }}
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  {['pending', 'approved', 'active', 'expired', 'suspended', 'rejected'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelS}>Expiry Date</label>
                <input
                  style={inpS}
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = border}
                />
              </div>
            </div>
          )}

          {/* Period + Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelS}>Registration Period</label>
              <select
                style={{ ...inpS, appearance: 'none' }}
                value={regPeriod}
                onChange={e => setRegPeriod(e.target.value)}
              >
                {[['1', '1 Year'], ['2', '2 Years'], ['3', '3 Years'], ['5', '5 Years'], ['10', '10 Years']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelS}>Base Price (LKR, optional)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText }} />
                <input
                  style={{ ...inpS, paddingLeft: 28 }}
                  type="number" min="0" step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {showMultiPct && (
            <div>
              <label style={labelS}>Multi-Year Markup ({periodNum} years) — %</label>
              <input
                style={inpS}
                type="number" min="0" max="100" step="0.1"
                placeholder="e.g. 10 (adds 10% to base price)"
                value={multiYearPct}
                onChange={e => setMultiYearPct(e.target.value)}
              />
              {basePrice > 0 && (
                <div style={{ fontSize: 11, color: subText, marginTop: 4 }}>
                  Calculated price: LKR {calculatedPrice.toFixed(2)}
                  {pctBonus > 0 && <span> (base + {pctBonus}% markup)</span>}
                </div>
              )}
            </div>
          )}

          {/* Start Date */}
          <div>
            <label style={labelS}>Start Date</label>
            <input
              style={inpS}
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = border}
            />
          </div>

          {/* Auto Renewal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={e => setAutoRenew(e.target.checked)}
              style={{ accentColor: brand }}
            />
            <span style={{ fontSize: 13, color: text }}>Auto Renewal Enabled</span>
          </div>

          {/* Credentials */}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: subText, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              <Key size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              Email Login Credentials
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelS}>Username</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText }} />
                  <input
                    style={{ ...inpS, paddingLeft: 28 }}
                    placeholder="e.g. info@domain.com"
                    value={emailUsername}
                    onChange={e => setEmailUsername(e.target.value)}
                    onFocus={e => e.target.style.borderColor = brand}
                    onBlur={e => e.target.style.borderColor = border}
                  />
                </div>
              </div>
              <div>
                <label style={labelS}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Key size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText }} />
                  <input
                    style={{ ...inpS, paddingLeft: 28 }}
                    type="text"
                    placeholder="Enter password"
                    value={emailPassword}
                    onChange={e => setEmailPassword(e.target.value)}
                    onFocus={e => e.target.style.borderColor = brand}
                    onBlur={e => e.target.style.borderColor = border}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelS}>Notes / Comments</label>
            <textarea
              style={{ ...inpS, resize: 'vertical', minHeight: 72 }}
              placeholder="Internal notes about this email assignment..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {isEditMode && (
            <div>
              <label style={labelS}>Admin Reply / Notes</label>
              <textarea
                style={{ ...inpS, resize: 'vertical', minHeight: 72 }}
                placeholder="Admin notes or reply to customer..."
                value={adminReply}
                onChange={e => setAdminReply(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10
        }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${border}`, background: 'transparent', color: text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: brand, color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? (isEditMode ? 'Saving…' : 'Assigning…') : (isEditMode ? 'Save Changes' : 'Assign Email')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignEmailDialog;
