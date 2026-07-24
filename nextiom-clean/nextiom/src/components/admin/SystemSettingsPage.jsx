import React, { useEffect, useState } from 'react';
import { Settings, Save, RotateCcw, Palette, Layout, ShieldAlert, CheckCircle2, Sliders, Info, Loader2, CreditCard, Shield, Key, Bell, Search } from 'lucide-react';
import { getPortalSettings, savePortalSettings, addNotification, hexToRgb, checkPasscodeSet, verifyPasscode, savePasscodeHash, getCustomers } from '@/lib/storage';
import { sendSms } from '@/lib/sms';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const COLOR_PRESETS = [
  { name: 'Nextiom Orange (Default)', value: '#E87B35' },
  { name: 'Royal Indigo', value: '#6366F1' },
  { name: 'Emerald Green', value: '#10B981' },
  { name: 'Ocean Blue', value: '#0EA5E9' },
  { name: 'Sunset Rose', value: '#F43F5E' },
  { name: 'Violet Glow', value: '#8B5CF6' },
  { name: 'Amber Gold', value: '#F59E0B' },
];

export default function SystemSettingsPage({ isDark }) {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeColor, setThemeColor] = useState('#E87B35');
  const [originalColor, setOriginalColor] = useState('#E87B35');
  const [allSettings, setAllSettings] = useState({});

  // Notifications Settings
  const [customers, setCustomers] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationExemptCustomers, setNotificationExemptCustomers] = useState([]);
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');

  const [originalNotificationsEnabled, setOriginalNotificationsEnabled] = useState(true);
  const [originalNotificationExemptCustomers, setOriginalNotificationExemptCustomers] = useState([]);
  
  // iPay Settings
  const [ipayEnabled, setIpayEnabled] = useState(false);
  const [ipayWebToken, setIpayWebToken] = useState('');
  const [ipaySandbox, setIpaySandbox] = useState(true);

  const [originalIpayEnabled, setOriginalIpayEnabled] = useState(false);
  const [originalIpayWebToken, setOriginalIpayWebToken] = useState('');
  const [originalIpaySandbox, setOriginalIpaySandbox] = useState(true);

  const { toast } = useToast();

  // Passcode Settings
  const [isPasscodeSet, setIsPasscodeSet] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmNewPasscode, setConfirmNewPasscode] = useState('');

  // OTP Reset State
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const hashPasscode = async (text) => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('Native crypto digest failed, falling back to JS implementation:', e);
      }
    }

    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiLength = text[lengthProperty] * 8;
    
    var hash = [];
    var k = [];
    var primeCounter = 0;

    var isPrime = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isPrime[candidate]) {
        for (i = 0; i < 311; i += candidate) {
          isPrime[i] = 1;
        }
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    
    var ascii = text + '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      var charCode = ascii.charCodeAt(i);
      words[i >> 2] |= charCode << ((3 - i % 4) * 8);
    }
    words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiLength | 0);
    
    for (j = 0; j < words[lengthProperty]; ) {
      var w = words.slice(j, j += 16);
      var oldHash = hash.slice(0);
      
      hash = [0, 1, 2, 3, 4, 5, 6, 7].map(function(index) { return hash[index]; });
      
      for (i = 0; i < 64; i++) {
        var wItem = w[i];
        if (i >= 16) {
          var wa = w[i - 15], wb = w[i - 2];
          var s0 = rightRotate(wa, 7) ^ rightRotate(wa, 18) ^ (wa >>> 3);
          var s1 = rightRotate(wb, 17) ^ rightRotate(wb, 19) ^ (wb >>> 10);
          wItem = w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        
        var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
        var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
        var s0_h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
        var s1_h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
        
        var temp1 = hash[7] + s1_h + ch + k[i] + wItem;
        var temp2 = s0_h + maj;
        
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    
    for (i = 0; i < 8; i++) {
      var val = hash[i];
      if (val < 0) val += maxWord;
      var str = val.toString(16);
      while (str[lengthProperty] < 8) str = '0' + str;
      result += str;
    }
    return result;
  };

  const handleSetPasscode = async (e) => {
    e.preventDefault();
    if (!passcode) {
      toast({ title: 'Validation Error', description: 'Passcode cannot be empty.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const hash = await hashPasscode(passcode);
      await savePasscodeHash(hash);
      setIsPasscodeSet(true);
      setPasscode('');
      toast({ title: 'Passcode Set', description: 'Security passcode for deleting customers has been set successfully.' });

      await addNotification({
        customer_id: null,
        type: 'admin_activity',
        title: 'Delete Passcode Configured',
        message: 'Admin configured a security passcode for customer accounts deletion.',
      }).catch(() => {});
    } catch (err) {
      toast({ title: 'Error Saving Passcode', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePasscode = async (e) => {
    e.preventDefault();
    if (!currentPasscode || !newPasscode || !confirmNewPasscode) {
      toast({ title: 'Validation Error', description: 'All fields are required.', variant: 'destructive' });
      return;
    }
    if (newPasscode !== confirmNewPasscode) {
      toast({ title: 'Validation Error', description: 'New passcodes do not match.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const currentHash = await hashPasscode(currentPasscode);
      const isCorrect = await verifyPasscode(currentHash);
      if (!isCorrect) {
        toast({ title: 'Incorrect Passcode', description: 'The current passcode is incorrect.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const newHash = await hashPasscode(newPasscode);
      await savePasscodeHash(newHash);
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmNewPasscode('');
      toast({ title: 'Passcode Updated', description: 'Security passcode has been updated successfully.' });

      await addNotification({
        customer_id: null,
        type: 'admin_activity',
        title: 'Delete Passcode Updated',
        message: 'Admin updated the customer deletion security passcode.',
      }).catch(() => {});
    } catch (err) {
      toast({ title: 'Error Updating Passcode', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await sendSms({
        phone: '0701766634',
        message: `Your Nextiom portal passcode reset OTP is ${otp}. Use this code to reset the customer deletion passcode.`,
        type: 'otp'
      });
      setGeneratedOtp(otp);
      setOtpSent(true);
      toast({ title: 'OTP Sent', description: 'A verification code has been sent to 0701766634.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'SMS Send Failed', description: 'Failed to send OTP via SMS. Ensure SMS gateway is enabled.', variant: 'destructive' });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast({ title: 'Validation Error', description: 'Please enter the verification code.', variant: 'destructive' });
      return;
    }
    setVerifyingOtp(true);
    if (otpCode.trim() === generatedOtp) {
      try {
        await savePasscodeHash(null); // Reset
        setIsPasscodeSet(false);
        setOtpSent(false);
        setOtpCode('');
        setGeneratedOtp('');
        setShowOtpSection(false);
        toast({ title: 'Passcode Reset Successful', description: 'The passcode has been cleared. You can now set a new one.' });

        await addNotification({
          customer_id: null,
          type: 'admin_activity',
          title: 'Delete Passcode Reset',
          message: 'Admin reset the customer deletion passcode via OTP verification.',
        }).catch(() => {});
      } catch (err) {
        toast({ title: 'Error resetting passcode', description: err.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Invalid OTP', description: 'The verification code is incorrect.', variant: 'destructive' });
    }
    setVerifyingOtp(false);
  };

  const c = isDark
    ? { 
        bg: '#15161A', 
        card: '#1C1E24', 
        panel2: '#22252C', 
        border: 'rgba(255,255,255,0.06)', 
        borderStrong: 'rgba(255,255,255,0.10)', 
        text: '#fff', 
        subText: '#a0a0a0', 
        brand: 'var(--brand-color)', 
        hover: 'rgba(255,255,255,0.04)', 
        inputBg: '#1C1E24', 
        inputBorder: 'rgba(255,255,255,0.10)' 
      }
    : { 
        bg: '#f8f8f7', 
        card: '#fff', 
        panel2: '#f5f5f5', 
        border: '#ebebeb', 
        borderStrong: '#d0d0d0', 
        text: '#1a1a1a', 
        subText: '#888', 
        brand: 'var(--brand-color)', 
        hover: '#f5f5f5', 
        inputBg: '#fff', 
        inputBorder: '#e2e8f0' 
      };

  const arraysEqual = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const portal = await getPortalSettings();
        const passcodeSetStatus = await checkPasscodeSet();
        const customersData = await getCustomers().catch(() => []);
        if (mounted) {
          setCustomers(customersData);
          setAllSettings(portal);
          setThemeColor(portal.themeColor || '#E87B35');
          setOriginalColor(portal.themeColor || '#E87B35');
          
          setIpayEnabled(portal.ipayEnabled || false);
          setIpayWebToken(portal.ipayWebToken || '');
          setIpaySandbox(portal.ipaySandbox !== false);
          
          setOriginalIpayEnabled(portal.ipayEnabled || false);
          setOriginalIpayWebToken(portal.ipayWebToken || '');
          setOriginalIpaySandbox(portal.ipaySandbox !== false);

          setNotificationsEnabled(portal.notificationsEnabled !== false);
          setNotificationExemptCustomers(portal.notificationExemptCustomers || []);
          
          setOriginalNotificationsEnabled(portal.notificationsEnabled !== false);
          setOriginalNotificationExemptCustomers(portal.notificationExemptCustomers || []);

          setIsPasscodeSet(passcodeSetStatus);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save public portal settings
      const updated = await savePortalSettings({
        ...allSettings,
        themeColor: themeColor,
        ipayEnabled: ipayEnabled,
        ipayWebToken: ipayWebToken,
        ipaySandbox: ipaySandbox,
        notificationsEnabled: notificationsEnabled,
        notificationExemptCustomers: notificationExemptCustomers,
      });

      setAllSettings(updated);
      setOriginalColor(themeColor);
      setOriginalIpayEnabled(ipayEnabled);
      setOriginalIpayWebToken(ipayWebToken);
      setOriginalIpaySandbox(ipaySandbox);
      setOriginalNotificationsEnabled(notificationsEnabled);
      setOriginalNotificationExemptCustomers(notificationExemptCustomers);

      // Create admin activity notification
      await addNotification({
        customer_id: null,
        type: 'admin_activity',
        title: 'System Settings Updated',
        message: 'The administrator updated the system brand, notifications, and iPay gateway configurations.',
      }).catch(() => {});

      toast({
        title: 'Settings Saved',
        description: 'System settings have been successfully updated.',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      });
    } catch (err) {
      toast({ 
        title: 'Error Saving Settings', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setThemeColor(originalColor);
    setIpayEnabled(originalIpayEnabled);
    setIpayWebToken(originalIpayWebToken);
    setIpaySandbox(originalIpaySandbox);
    setNotificationsEnabled(originalNotificationsEnabled);
    setNotificationExemptCustomers(originalNotificationExemptCustomers);
    toast({
      title: 'Settings Reset',
      description: 'Reverted settings back to the saved system configuration.',
    });
  };

  const handleSelectPreset = (value) => {
    setThemeColor(value);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: c.brand }} />
      </div>
    );
  }

  const isChanged = themeColor !== originalColor ||
    ipayEnabled !== originalIpayEnabled ||
    ipayWebToken !== originalIpayWebToken ||
    ipaySandbox !== originalIpaySandbox ||
    notificationsEnabled !== originalNotificationsEnabled ||
    !arraysEqual(notificationExemptCustomers, originalNotificationExemptCustomers);

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 1040, margin: '0 auto', padding: '0 0 32px' }} noValidate>
      <style>{`
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 24px;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 24px;
        }
        @media (max-width: 992px) {
          .settings-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        @media (max-width: 768px) {
          .settings-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
        }
      `}</style>
      {/* ── Page Header ─────────────────────────── */}
      <div className="settings-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={22} style={{ color: c.brand }} />
            System Settings
          </h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 4, maxWidth: 500 }}>
            Configure global look-and-feel variables, payment gateways, notifications, and security protocols.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {isChanged && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10, border: `1px solid ${c.borderStrong}`,
                background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = c.hover}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <RotateCcw size={14} />
              Revert
            </button>
          )}
          <button
            type="submit"
            disabled={saving || !isChanged}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 10, border: 'none',
              background: isChanged ? 'var(--brand-color)' : c.borderStrong,
              color: isChanged ? '#fff' : c.subText,
              fontSize: 13, fontWeight: 700,
              cursor: isChanged && !saving ? 'pointer' : 'not-allowed',
              opacity: saving ? 0.7 : 1,
              transition: 'opacity 0.2s, background-color 0.2s',
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* ── Left Column: Brand & Notifications ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card: Brand Color Picker */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={16} style={{ color: c.brand }} />
              Main Brand Theme Color
            </h2>
            <p style={{ fontSize: 12, color: c.subText, margin: '0 0 20px 0' }}>
              Select a color below or pick a custom hex value.
            </p>

            {/* Presets Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Color Presets</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = themeColor.toLowerCase() === preset.value.toLowerCase();
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleSelectPreset(preset.value)}
                      title={preset.name}
                      style={{
                        position: 'relative',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: preset.value,
                        border: isSelected ? `2.5px solid ${c.text}` : `1px solid ${c.borderStrong}`,
                        cursor: 'pointer',
                        transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isSelected ? `0 0 12px ${preset.value}80` : 'none',
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: -3, right: -3,
                          width: 14, height: 14,
                          borderRadius: '50%',
                          background: '#10B981',
                          border: `2px solid ${c.card}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <CheckCircle2 size={8} style={{ color: '#fff' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${c.border}`, paddingTop: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Custom Color Picker</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 42, height: 42, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${c.borderStrong}`, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    style={{
                      position: 'absolute', top: -8, left: -8, width: 58, height: 58,
                      border: 'none', cursor: 'pointer', background: 'transparent', padding: 0
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={themeColor.toUpperCase()}
                    onChange={(e) => setThemeColor(e.target.value)}
                    placeholder="#E87B35"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                      color: c.text, fontSize: 14, fontFamily: 'JetBrains Mono, monospace',
                      outline: 'none', transition: 'border-color 0.15s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--brand-color)'}
                    onBlur={(e) => e.target.style.borderColor = c.inputBorder}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Notifications Control */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} style={{ color: themeColor }} />
                System Notifications Control
              </h2>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', backgroundColor: 'var(--brand-color)', padding: '2px 8px', borderRadius: 12 }}>
                {notificationExemptCustomers.length} Muted
              </span>
            </div>
            <p style={{ fontSize: 12, color: c.subText, margin: '0 0 20px 0' }}>
              Enable/disable global customer notifications and manage user exclusion lists.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Global Enable Toggle */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
                <div style={{
                  position: 'relative',
                  width: 44,
                  height: 24,
                  backgroundColor: notificationsEnabled ? 'var(--brand-color)' : (isDark ? '#2D3139' : '#E2E8F0'),
                  borderRadius: 12,
                  transition: 'background-color 0.2s',
                  flexShrink: 0,
                  marginTop: 2
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    left: notificationsEnabled ? 22 : 2,
                    width: 20,
                    height: 20,
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.text, display: 'block' }}>Enable Customer Notifications</span>
                  <span style={{ fontSize: 11, color: c.subText, display: 'block', marginTop: 2, lineHeight: 1.4 }}>
                    If disabled, every customer will be blocked from receiving and viewing notifications on their dashboard.
                  </span>
                </div>
              </label>

              {/* Exempt Customers Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Select Exempt Customers (Muted)
                </label>
                <span style={{ fontSize: 11, color: c.subText, marginBottom: 8 }}>
                  Select specific customers who should not receive or see notifications in the system (even when global notifications are enabled).
                </span>

                {/* Search Input */}
                <div style={{ position: 'relative', marginBottom: 4 }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
                  <input
                    type="text"
                    value={searchCustomerQuery}
                    onChange={(e) => setSearchCustomerQuery(e.target.value)}
                    placeholder="Search by name, email, or company..."
                    style={{
                      width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10,
                      background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                      color: c.text, fontSize: 12.5,
                      outline: 'none', transition: 'all 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--brand-color)'}
                    onBlur={(e) => e.target.style.borderColor = c.inputBorder}
                  />
                </div>

                {/* Customer Search / List */}
                <div style={{
                  border: `1px solid ${c.inputBorder}`,
                  borderRadius: 10,
                  background: c.inputBg,
                  maxHeight: 180,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {(() => {
                    const filtered = customers
                      .filter(customer => {
                        const query = searchCustomerQuery.toLowerCase().trim();
                        if (!query) return true;
                        return (
                          String(customer.name || '').toLowerCase().includes(query) ||
                          String(customer.email || '').toLowerCase().includes(query) ||
                          String(customer.company || '').toLowerCase().includes(query)
                        );
                      })
                      .sort((a, b) => {
                        const isAMuted = notificationExemptCustomers.includes(a.id);
                        const isBMuted = notificationExemptCustomers.includes(b.id);
                        if (isAMuted && !isBMuted) return -1;
                        if (!isAMuted && isBMuted) return 1;
                        return String(a.name || '').localeCompare(String(b.name || ''));
                      });

                    if (filtered.length === 0) {
                      return <div style={{ padding: 12, fontSize: 12, color: c.subText, textAlign: 'center' }}>No customers found</div>;
                    }

                    return filtered.map((customer) => {
                      const isSelected = notificationExemptCustomers.includes(customer.id);
                      return (
                        <label
                          key={customer.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderBottom: `1px solid ${c.border}`,
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            background: isSelected ? c.hover : 'transparent',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = c.hover; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNotificationExemptCustomers([...notificationExemptCustomers, customer.id]);
                              } else {
                                setNotificationExemptCustomers(notificationExemptCustomers.filter(id => id !== customer.id));
                              }
                            }}
                            style={{ width: 14, height: 14, accentColor: 'var(--brand-color)', cursor: 'pointer' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {customer.name || 'Unnamed Customer'}
                              {isSelected && (
                                <span style={{ fontSize: 9, fontWeight: 700, backgroundColor: isDark ? 'rgba(232,123,53,0.15)' : 'var(--brand-color-light)', color: 'var(--brand-color)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                                  Muted
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: 11, color: c.subText }}>
                              {customer.email || 'No Email'} {customer.company ? `• ${customer.company}` : ''}
                            </span>
                          </div>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Info block */}
          <div style={{ display: 'flex', gap: 12, padding: '16px 20px', borderRadius: 16, background: isDark ? 'rgba(99,102,241,0.08)' : '#eff6ff', border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : '#bfdbfe'}` }}>
            <Info size={20} style={{ color: isDark ? '#818cf8' : '#3b82f6', flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fff' : '#1e3a8a', margin: '0 0 4px 0' }}>Real-time Propagation</h4>
              <p style={{ fontSize: 12, color: isDark ? '#a5b4fc' : '#2563eb', margin: 0, lineHeight: 1.5 }}>
                When you click Save, the new configuration is synchronized using Supabase. Any users active on their dashboards will immediately see layout and preference changes propagate without needing a page refresh.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Preview, iPay & Security ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card: Live Components Preview */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layout size={16} style={{ color: themeColor }} />
              Live Components Preview
            </h2>
            <p style={{ fontSize: 12, color: c.subText, margin: '0 0 4px 0' }}>
              Preview how buttons, tabs, links, and banners will look dynamically in the portal UI:
            </p>

            {/* Custom Theme Injector for Live Preview */}
            <div style={{
              padding: 20, borderRadius: 12, border: `1px solid ${c.border}`, 
              background: c.panel2, display: 'flex', flexDirection: 'column', gap: 16,
              // Overwriting CSS variable locally for preview container
              '--brand-color': themeColor,
              '--brand-color-rgb': hexToRgb(themeColor) ? `${hexToRgb(themeColor).r}, ${hexToRgb(themeColor).g}, ${hexToRgb(themeColor).b}` : '232, 123, 53',
              '--brand-color-light': hexToRgb(themeColor) ? `rgba(${hexToRgb(themeColor).r}, ${hexToRgb(themeColor).g}, ${hexToRgb(themeColor).b}, 0.15)` : 'rgba(232, 123, 53, 0.15)',
            }}>
              {/* Preset 1: Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Buttons</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--brand-color)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Active Button
                  </button>
                  <button type="button" style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--brand-color-light)', border: 'none', color: 'var(--brand-color)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Light Tint Button
                  </button>
                  <button type="button" style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', border: '1.5px solid var(--brand-color)', color: 'var(--brand-color)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Outline Button
                  </button>
                </div>
              </div>

              {/* Preset 2: Badges & Tags */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Badges & Statuses</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--brand-color-light)', color: 'var(--brand-color)', fontSize: 11, fontWeight: 700 }}>
                    In Progress
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 11, fontWeight: 700 }}>
                    Completed
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--brand-color)', fontWeight: 600 }}>
                    <CheckCircle2 size={14} />
                    Verified Link
                  </div>
                </div>
              </div>

              {/* Preset 3: Side Menu Active Item */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sidebar Active Item (Hover/Focus)</span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--brand-color-light)',
                  borderLeft: '4px solid var(--brand-color)',
                  color: 'var(--brand-color)',
                  fontWeight: 700, fontSize: 13
                }}>
                  <Sliders size={16} />
                  Active Section Title
                </div>
              </div>

              {/* Preset 4: Warning Pulse Banner */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>System Banner (Theme matching)</span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--brand-color-light)',
                  border: '1px solid var(--brand-color)',
                  color: c.text, fontSize: 11.5
                }}>
                  <ShieldAlert size={14} style={{ color: 'var(--brand-color)' }} />
                  Theme modification is active and shown in preview.
                </div>
              </div>
            </div>
          </div>

          {/* Card: iPay Gateway Integration */}
          {role !== 'moderator' && (
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={16} style={{ color: themeColor }} />
                iPay Payment Gateway Integration
              </h2>
              <p style={{ fontSize: 12, color: c.subText, margin: '0 0 20px 0' }}>
                Configure your iPay Global Web Payments integration credentials.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Enable Toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{
                    position: 'relative',
                    width: 44,
                    height: 24,
                    backgroundColor: ipayEnabled ? 'var(--brand-color)' : (isDark ? '#2D3139' : '#E2E8F0'),
                    borderRadius: 12,
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 2,
                      left: ipayEnabled ? 22 : 2,
                      width: 20,
                      height: 20,
                      backgroundColor: '#fff',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                    <input
                      type="checkbox"
                      checked={ipayEnabled}
                      onChange={(e) => setIpayEnabled(e.target.checked)}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text, display: 'block' }}>Enable iPay Online Payments</span>
                    <span style={{ fontSize: 11, color: c.subText, display: 'block', marginTop: 2 }}>
                      Allow customers to pay invoices online using the iPay Payment Gateway.
                    </span>
                  </div>
                </label>

                {/* Web Token */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>IPG Integration Token (Public)</label>
                  <input
                    type="text"
                    value={ipayWebToken}
                    onChange={(e) => setIpayWebToken(e.target.value)}
                    placeholder="Enter IPG Integration Token..."
                    disabled={!ipayEnabled}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                      color: c.text, fontSize: 13,
                      outline: 'none', transition: 'border-color 0.15s',
                      opacity: ipayEnabled ? 1 : 0.6,
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--brand-color)'}
                    onBlur={(e) => e.target.style.borderColor = c.inputBorder}
                  />
                </div>

                {/* Sandbox Mode */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: ipayEnabled ? 'pointer' : 'not-allowed', userSelect: 'none', opacity: ipayEnabled ? 1 : 0.6 }}>
                  <div style={{
                    position: 'relative',
                    width: 44,
                    height: 24,
                    backgroundColor: ipaySandbox ? 'var(--brand-color)' : (isDark ? '#2D3139' : '#E2E8F0'),
                    borderRadius: 12,
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 2,
                      left: ipaySandbox ? 22 : 2,
                      width: 20,
                      height: 20,
                      backgroundColor: '#fff',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                    <input
                      type="checkbox"
                      checked={ipaySandbox}
                      disabled={!ipayEnabled}
                      onChange={(e) => setIpaySandbox(e.target.checked)}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text, display: 'block' }}>Sandbox Mode</span>
                    <span style={{ fontSize: 11, color: c.subText, display: 'block', marginTop: 2 }}>
                      Use the sandbox endpoint for testing transactions.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Card: Customer Deletion Security Passcode */}
          {role !== 'moderator' && (
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} style={{ color: themeColor }} />
                Customer Deletion Security Passcode
              </h2>
              <p style={{ fontSize: 12, color: c.subText, margin: '0 0 20px 0' }}>
                Require a passcode before permanently deleting any customer from the portal.
              </p>

              {!isPasscodeSet ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Set Security Passcode</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="password"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Enter a secure passcode..."
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 10,
                          background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                          color: c.text, fontSize: 13,
                          outline: 'none', transition: 'border-color 0.15s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--brand-color)'}
                        onBlur={(e) => e.target.style.borderColor = c.inputBorder}
                      />
                      <button
                        type="button"
                        onClick={handleSetPasscode}
                        disabled={saving || !passcode}
                        style={{
                          padding: '0 16px', borderRadius: 10, border: 'none',
                          background: passcode ? 'var(--brand-color)' : c.borderStrong,
                          color: passcode ? '#fff' : c.subText,
                          fontSize: 13, fontWeight: 700,
                          cursor: passcode && !saving ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(16,185,129,0.08)' : '#ecfdf5', border: `1px solid ${isDark ? 'rgba(16,185,129,0.15)' : '#a7f3d0'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={16} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? '#34d399' : '#047857' }}>Passcode protection is active</span>
                  </div>

                  {!showOtpSection ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0 }}>Change Passcode</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Passcode</label>
                          <input
                            type="password"
                            value={currentPasscode}
                            onChange={(e) => setCurrentPasscode(e.target.value)}
                            placeholder="Enter current passcode..."
                            style={{
                              width: '100%', padding: '10px 14px', borderRadius: 10,
                              background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                              color: c.text, fontSize: 13,
                              outline: 'none', transition: 'border-color 0.15s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--brand-color)'}
                            onBlur={(e) => e.target.style.borderColor = c.inputBorder}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Passcode</label>
                            <input
                              type="password"
                              value={newPasscode}
                              onChange={(e) => setNewPasscode(e.target.value)}
                              placeholder="Enter new passcode..."
                              style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10,
                                background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                                color: c.text, fontSize: 13,
                                outline: 'none', transition: 'border-color 0.15s',
                              }}
                              onFocus={(e) => e.target.style.borderColor = 'var(--brand-color)'}
                              onBlur={(e) => e.target.style.borderColor = c.inputBorder}
                            />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirm Passcode</label>
                            <input
                              type="password"
                              value={confirmNewPasscode}
                              onChange={(e) => setConfirmNewPasscode(e.target.value)}
                              placeholder="Confirm new..."
                              style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10,
                                background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                                color: c.text, fontSize: 13,
                                outline: 'none', transition: 'border-color 0.15s',
                              }}
                              onFocus={(e) => e.target.style.borderColor = 'var(--brand-color)'}
                              onBlur={(e) => e.target.style.borderColor = c.inputBorder}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => { setShowOtpSection(true); handleSendOtp(); }}
                            style={{
                              background: 'none', border: 'none', color: 'var(--brand-color)',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0
                            }}
                          >
                            Forgot Passcode? Reset via OTP
                          </button>
                          <button
                            type="button"
                            onClick={handleUpdatePasscode}
                            disabled={saving || !currentPasscode || !newPasscode || !confirmNewPasscode}
                            style={{
                              padding: '10px 20px', borderRadius: 10, border: 'none',
                              background: (currentPasscode && newPasscode && confirmNewPasscode) ? 'var(--brand-color)' : c.borderStrong,
                              color: (currentPasscode && newPasscode && confirmNewPasscode) ? '#fff' : c.subText,
                              fontSize: 13, fontWeight: 700,
                              cursor: (currentPasscode && newPasscode && confirmNewPasscode) && !saving ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0 }}>Reset Passcode via OTP</h3>
                      <p style={{ fontSize: 12, color: c.subText, margin: 0, lineHeight: 1.4 }}>
                        An OTP (One-Time Password) code has been generated and sent to the administrator's verification mobile number: <strong>0701766634</strong>.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Enter 6-Digit OTP</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 123456"
                            style={{
                              flex: 1, padding: '10px 14px', borderRadius: 10,
                              background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                              color: c.text, fontSize: 14, fontWeight: 'bold', letterSpacing: 2,
                              outline: 'none', transition: 'border-color 0.15s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--brand-color)'}
                            onBlur={(e) => e.target.style.borderColor = c.inputBorder}
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp || otpCode.length !== 6}
                            style={{
                              padding: '0 20px', borderRadius: 10, border: 'none',
                              background: otpCode.length === 6 ? 'var(--brand-color)' : c.borderStrong,
                              color: otpCode.length === 6 ? '#fff' : c.subText,
                              fontSize: 13, fontWeight: 700,
                              cursor: otpCode.length === 6 && !verifyingOtp ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {verifyingOtp ? 'Verifying...' : 'Verify & Reset'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp}
                          style={{
                            background: 'none', border: 'none', color: c.subText,
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0
                          }}
                        >
                          {sendingOtp ? 'Sending...' : 'Resend OTP'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowOtpSection(false); setOtpSent(false); setOtpCode(''); }}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
