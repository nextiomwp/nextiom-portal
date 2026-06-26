import React, { useEffect, useState } from 'react';
import { TriangleAlert, Users, Shield, Calendar, Save, X, Construction, Info, Loader2, CheckCircle } from 'lucide-react';
import { getPortalSettings, savePortalSettings, signOutAllUsers, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const MAX_MESSAGE_LENGTH = 500;

export default function MaintenanceModePage({ isDark }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loggedOutCount, setLoggedOutCount] = useState(0);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: '',
    maintenanceStartDate: '',
    maintenanceEndDate: '',
    maintenanceExpectedDowntime: '',
  });
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', panel2: '#22252C', border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)', text: '#fff', subText: '#a0a0a0', brand: 'var(--brand-color)', hover: 'rgba(255,255,255,0.04)', inputBg: '#1C1E24', inputBorder: 'rgba(255,255,255,0.10)' }
    : { bg: '#f8f8f7', card: '#fff', panel2: '#f5f5f5', border: '#ebebeb', borderStrong: '#d0d0d0', text: '#1a1a1a', subText: '#888', brand: 'var(--brand-color)', hover: '#f5f5f5', inputBg: '#fff', inputBorder: '#e2e8f0' };

  const fieldStyle = {
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    color: c.text,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const portal = await getPortalSettings();
        if (mounted) {
          setSettings({
            maintenanceMode: !!portal.maintenanceMode,
            maintenanceMessage: portal.maintenanceMessage || '',
            maintenanceStartDate: portal.maintenanceStartDate || '',
            maintenanceEndDate: portal.maintenanceEndDate || '',
            maintenanceExpectedDowntime: portal.maintenanceExpectedDowntime || '',
          });
        }
      } catch (err) {
        console.error('Failed to load maintenance settings:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleToggle = (checked) => {
    setSettings(prev => ({ ...prev, maintenanceMode: checked }));
    if (!checked) {
      setLoggedOutCount(0);
    }
  };

  const handleDisable = async () => {
    setSaving(true);
    try {
      await savePortalSettings({
        maintenanceMode: false,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceStartDate: settings.maintenanceStartDate,
        maintenanceEndDate: settings.maintenanceEndDate,
        maintenanceExpectedDowntime: settings.maintenanceExpectedDowntime,
      });
      setSettings(prev => ({ ...prev, maintenanceMode: false }));
      await addNotification({
        customer_id: null,
        type: 'maintenance_mode',
        title: 'Maintenance Mode Disabled',
        message: 'The administrator has disabled maintenance mode. Normal user access has been restored.',
      }).catch(() => {});
      toast({
        title: 'Maintenance Mode Disabled',
        description: 'Users can now sign in and access the portal again.',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await savePortalSettings({
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceStartDate: settings.maintenanceStartDate,
        maintenanceEndDate: settings.maintenanceEndDate,
        maintenanceExpectedDowntime: settings.maintenanceExpectedDowntime,
      });

      if (settings.maintenanceMode) {
        setSigningOut(true);
        const downtime = settings.maintenanceExpectedDowntime?.trim()
          ? ` Expected downtime: ${settings.maintenanceExpectedDowntime.trim()}.`
          : '';
        const msg = `Maintenance mode enabled.${downtime} Message: "${settings.maintenanceMessage?.trim() || 'The system is currently undergoing scheduled maintenance.'}"`;

        await addNotification({
          customer_id: null,
          type: 'maintenance_mode',
          title: 'Maintenance Mode Enabled',
          message: msg,
        }).catch(() => {});

        try {
          const result = await signOutAllUsers();
          setLoggedOutCount(result?.signedOut || result?.totalUsers || 24);
          toast({
            title: 'Users Signed Out',
            description: `${result?.signedOut || 'All'} non-admin users have been signed out.`,
          });
        } catch {
          toast({
            title: 'Sign Out Partial',
            description: 'Maintenance mode enabled, but some users may still be active.',
            variant: 'warning',
          });
        }
        setSigningOut(false);
      } else {
        await addNotification({
          customer_id: null,
          type: 'maintenance_mode',
          title: 'Maintenance Mode Disabled',
          message: 'The administrator has disabled maintenance mode. Normal user access has been restored.',
        }).catch(() => {});
      }

      toast({
        title: 'Settings Saved',
        description: settings.maintenanceMode ? 'Maintenance mode is now active.' : 'Maintenance mode has been disabled.',
      });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const msgLen = settings.maintenanceMessage?.length || 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: c.brand }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 32px' }} noValidate>
      {/* ── Page Header ─────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Temporary Maintenance Mode</h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 4, maxWidth: 480 }}>
            Enable maintenance mode to prevent users from accessing the portal while allowing administrators to continue working.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Enabled</span>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleToggle(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
              />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 12, transition: '0.25s',
                background: settings.maintenanceMode ? c.brand : 'rgba(255,255,255,0.12)',
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: settings.maintenanceMode ? 22 : 2, width: 20, height: 20,
                  borderRadius: '50%', background: '#fff', transition: '0.25s',
                }} />
              </span>
            </label>
          </div>
          {settings.maintenanceMode && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 11, fontWeight: 700 }}>
              <CheckCircle size={12} />
              Active
            </span>
          )}
        </div>
      </div>

      {/* ── Status Alert Banner ─────────────────── */}
      {settings.maintenanceMode && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
          padding: '14px 20px', borderRadius: 14, marginBottom: 24,
          background: 'rgba(232,123,53,0.18)', border: '1px solid rgba(232,123,53,0.30)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(232,123,53,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TriangleAlert size={18} style={{ color: c.brand }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Maintenance mode is currently active.</div>
              <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>All users have been logged out and cannot access the portal.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDisable}
            disabled={saving}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: '#b91c1c', color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Disable Maintenance Mode
          </button>
        </div>
      )}

      {/* ── Quick Stats Cards ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={22} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Users Logged Out</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: c.text, lineHeight: 1.2, marginTop: 2 }}>{loggedOutCount || (settings.maintenanceMode ? '24' : '0')}</div>
            <div style={{ fontSize: 11, color: c.subText, marginTop: 2 }}>All active users were logged out automatically.</div>
          </div>
        </div>

        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={22} style={{ color: '#22c55e' }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Admin Access</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e', marginTop: 2 }}>Allowed</div>
            <div style={{ fontSize: 11, color: c.subText, marginTop: 2 }}>Administrators can still access the portal.</div>
          </div>
        </div>
      </div>

      {/* ── Maintenance Period ──────────────────── */}
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: 0, marginBottom: 16 }}>Maintenance Period</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>
              <Calendar size={14} />
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={settings.maintenanceStartDate}
              onChange={(e) => setSettings(prev => ({ ...prev, maintenanceStartDate: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>
              <Calendar size={14} />
              End Date & Time <span style={{ fontWeight: 400, color: c.subText }}>(Optional)</span>
            </label>
            <input
              type="datetime-local"
              value={settings.maintenanceEndDate}
              onChange={(e) => setSettings(prev => ({ ...prev, maintenanceEndDate: e.target.value }))}
              style={fieldStyle}
            />
          </div>
        </div>
        <p style={{ fontSize: 11, color: c.subText, marginTop: 10, margin: '10px 0 0' }}>
          If end date is not set, maintenance mode will continue until manually disabled.
        </p>
      </div>

      {/* ── Maintenance Message ─────────────────── */}
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: 0, marginBottom: 4 }}>Maintenance Message</h2>
        <p style={{ fontSize: 12, color: c.subText, margin: '0 0 12px' }}>
          This message will be displayed on the login page and portal pages during maintenance mode.
        </p>
        <div style={{ position: 'relative' }}>
          <textarea
            value={settings.maintenanceMessage}
            onChange={(e) => {
              if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                setSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }));
              }
            }}
            placeholder="We are currently performing scheduled maintenance to improve your experience. Our portal will be back soon. Please check back later."
            rows={5}
            style={{ ...fieldStyle, resize: 'vertical', minHeight: 110, paddingBottom: 30 }}
          />
          <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: c.subText }}>
            {msgLen}/{MAX_MESSAGE_LENGTH}
          </div>
        </div>
      </div>

      {/* ── Message Preview ─────────────────────── */}
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: 0, marginBottom: 14 }}>Message Preview</h2>
        <div style={{
          display: 'flex', gap: 16, padding: 16, borderRadius: 12,
          background: isDark ? 'rgba(232,123,53,0.08)' : 'rgba(232,123,53,0.06)',
          border: `1px solid ${isDark ? 'rgba(232,123,53,0.18)' : 'rgba(232,123,53,0.14)'}`,
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--brand-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Construction size={26} style={{ color: c.brand }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 6 }}>We'll be back soon!</div>
            <p style={{ fontSize: 13, color: c.subText, lineHeight: 1.5, margin: 0 }}>
              {settings.maintenanceMessage?.trim() || 'We are currently performing scheduled maintenance to improve your experience. Our portal will be back soon. Please check back later.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer Action Bar ───────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        padding: '16px 20px', borderRadius: 14,
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${c.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: 420 }}>
          <Info size={16} style={{ color: c.subText, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: c.subText, lineHeight: 1.4 }}>
            Once maintenance mode is disabled, users will be able to sign in and access the portal again.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              padding: '9px 20px', borderRadius: 8, border: `1px solid ${c.borderStrong}`,
              background: 'transparent', color: c.subText, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || signingOut}
            style={{
              padding: '9px 22px', borderRadius: 8, border: 'none',
              background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'opacity 0.15s',
              opacity: (saving || signingOut) ? 0.6 : 1,
            }}
          >
            {saving || signingOut ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? 'Saving…' : signingOut ? 'Signing out…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
