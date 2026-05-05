import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { updateUserProfile } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, User, Edit3, Check, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

function ProfilePage({ user, onUpdate, isDark = false, c = {} }) {
  const safeUser = user || {};
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: safeUser.name || '',
    phone: safeUser.phone || '',
    company: safeUser.company || '',
    country: safeUser.country || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const { toast } = useToast();

  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const panel2 = c.panel2 || '#f5f5f5';

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next.length < 8) {
      toast({ title: 'Error', description: 'New password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setPwLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: safeUser.email,
        password: pwForm.current,
      });
      if (signInErr) {
        toast({ title: 'Error', description: 'Current password is incorrect.', variant: 'destructive' });
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: pwForm.next });
      if (updateErr) {
        toast({ title: 'Error', description: updateErr.message || 'Failed to update password.', variant: 'destructive' });
      } else {
        toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
        setPwForm({ current: '', next: '', confirm: '' });
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateUserProfile(safeUser.id, formData);
      toast({ title: 'Success', description: 'Profile updated' });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch {
      toast({ title: 'Error', description: 'Update failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const cardStyle = {
    background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${border}`,
    borderRadius: 20,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  };

  const inputStyle = (editable) => ({
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: `1px solid ${editable ? borderStrong : border}`,
    borderRadius: 10,
    background: editable ? panel2 : (isDark ? 'rgba(255,255,255,0.03)' : '#fafafa'),
    color: editable ? text : subText,
    outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
    cursor: editable ? 'text' : 'default',
    transition: 'border-color 0.15s',
  });

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: subText, marginBottom: 5,
    letterSpacing: '0.04em', textTransform: 'uppercase',
  };

  const initial = safeUser.name ? safeUser.name.charAt(0).toUpperCase() : 'U';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User style={{ width: 16, height: 16, color: brand }} />
          </div>
          <h1 style={{ color: text, fontSize: 18, fontWeight: 700 }}>Account Details</h1>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              background: brandLight, color: brand,
              border: `1px solid ${brand}`,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,123,53,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = brandLight}
          >
            <Edit3 style={{ width: 13, height: 13 }} /> Edit Profile
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div style={cardStyle}>
        {/* Avatar section */}
        <div style={{ padding: '24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: brandLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: brand, flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <p style={{ color: text, fontWeight: 700, fontSize: 17, marginBottom: 3 }}>{safeUser.name || 'Customer'}</p>
            <p style={{ color: subText, fontSize: 13 }}>{safeUser.email || ''}</p>
            {safeUser.memberSince && (
              <p style={{ color: subText, fontSize: 11, marginTop: 3 }}>
                Member since {new Date(safeUser.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                style={inputStyle(isEditing)}
                onFocus={e => { if (isEditing) e.target.style.borderColor = brand; }}
                onBlur={e => e.target.style.borderColor = isEditing ? borderStrong : border}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                style={inputStyle(isEditing)}
                onFocus={e => { if (isEditing) e.target.style.borderColor = brand; }}
                onBlur={e => e.target.style.borderColor = isEditing ? borderStrong : border}
              />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                disabled={!isEditing}
                style={inputStyle(isEditing)}
                onFocus={e => { if (isEditing) e.target.style.borderColor = brand; }}
                onBlur={e => e.target.style.borderColor = isEditing ? borderStrong : border}
              />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                disabled={!isEditing}
                style={inputStyle(isEditing)}
                onFocus={e => { if (isEditing) e.target.style.borderColor = brand; }}
                onBlur={e => e.target.style.borderColor = isEditing ? borderStrong : border}
              />
            </div>
          </div>

          {/* Read-only email */}
          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={safeUser.email || ''}
              disabled
              style={inputStyle(false)}
            />
          </div>

          {isEditing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '10px 20px', borderRadius: 10, background: 'transparent',
                  border: `1px solid ${border}`, color: subText,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 10,
                  background: brand, color: '#fff',
                  border: 'none', fontSize: 13, fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.75 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = '#d4692a'; }}
                onMouseLeave={e => e.currentTarget.style.background = brand}
              >
                {isLoading
                  ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                  : <Check style={{ width: 14, height: 14 }} />}
                {isLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Change Password Card */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck style={{ width: 16, height: 16, color: brand }} />
          </div>
          <h2 style={{ color: text, fontSize: 15, fontWeight: 700 }}>Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { key: 'current', label: 'Current Password', placeholder: '••••••••' },
            { key: 'next', label: 'New Password', placeholder: 'Minimum 8 characters' },
            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
          ].map(f => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: subText }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm[f.key]}
                  onChange={e => setPwForm({ ...pwForm, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  required
                  style={{ ...inputStyle(true), paddingLeft: 38, paddingRight: f.key === 'current' ? 38 : 12 }}
                  onFocus={e => { e.target.style.borderColor = brand; }}
                  onBlur={e => e.target.style.borderColor = panel2}
                />
                {f.key === 'current' && (
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: subText, padding: 0 }}>
                    {showPw ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={pwLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 22px', borderRadius: 10,
                background: brand, color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 700, cursor: pwLoading ? 'not-allowed' : 'pointer',
                opacity: pwLoading ? 0.75 : 1,
              }}
            >
              {pwLoading
                ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                : <Check style={{ width: 14, height: 14 }} />}
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
