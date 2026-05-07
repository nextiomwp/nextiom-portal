import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsReady(true);
    });
    // Also check if session already exists from hash (some browsers fire before subscription)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsReady(true);
    });
    return () => subscription?.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    const safetyId = setTimeout(() => setIsLoading(false), 30000);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please request a new reset link.');
      } else {
        await supabase.auth.signOut();
        setIsDone(true);
        setTimeout(() => navigate('/'), 3000);
      }
    } catch {
      setError('Failed to update password. Please request a new reset link.');
    } finally {
      clearTimeout(safetyId);
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 44px', border: '1.5px solid #ebebeb',
    borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', color: '#1a1a1a', background: '#fafafa',
    transition: 'border-color 0.15s',
  };
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#888',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  if (isDone) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f7' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <CheckCircle style={{ width: 52, height: 52, color: '#22c55e', margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Password Updated!</h2>
        <p style={{ color: '#888', fontSize: 14 }}>Redirecting you to login in a moment…</p>
      </div>
    </div>
  );

  if (!isReady) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f7' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 style={{ width: 44, height: 44, color: '#E87B35', margin: '0 auto 16px' }} className="animate-spin" />
        <p style={{ color: '#888', fontSize: 14 }}>Verifying reset link…</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f7', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="https://horizons-cdn.hostinger.com/147148b5-9ad3-49b5-a69f-decad9e9a152/c4356b200db1f138597a66d14c006177.jpg"
            alt="Nextiom" style={{ height: 36, margin: '0 auto 24px', display: 'block' }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Set New Password</h1>
          <p style={{ color: '#888', fontSize: 14 }}>Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#ccc' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#E87B35'}
                onBlur={e => e.target.style.borderColor = '#ebebeb'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0 }}>
                {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#ccc' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#E87B35'}
                onBlur={e => e.target.style.borderColor = '#ebebeb'}
              />
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px' }}>
              <AlertCircle style={{ width: 15, height: 15, color: '#ef4444', flexShrink: 0 }} />
              <span style={{ color: '#b91c1c', fontSize: 13 }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: isLoading ? '#f0a070' : '#E87B35', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
          >
            {isLoading ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Updating…</> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
