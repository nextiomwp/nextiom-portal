import React, { useEffect, useState } from 'react';
import { Settings, Save, RotateCcw, Palette, Layout, ShieldAlert, CheckCircle2, Sliders, Info, Loader2, CreditCard, Shield, Key, Bell, Search, Eye, EyeOff } from 'lucide-react';
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

// ── Small toggle switch component ─────────────────────────────────────────────
function FormToggle({ checked, onChange, disabled, title, description, brandColor, isDark }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
      <div style={{
        position: 'relative',
        width: 44,
        height: 24,
        backgroundColor: checked ? brandColor : (isDark ? '#2D3139' : '#E2E8F0'),
        borderRadius: 12,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        marginTop: 2,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
      }}>
        <div style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          backgroundColor: '#fff',
          borderRadius: '50%',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} />
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ display: 'none' }}
        />
      </div>
      <div>
        <span style={{ fontSize: 13.5, fontWeight: 600, display: 'block' }}>{title}</span>
        {description && (
          <span style={{ fontSize: 11.5, color: 'var(--sub-text-color)', display: 'block', marginTop: 2, lineHeight: 1.4, opacity: 0.8 }}>
            {description}
          </span>
        )}
      </div>
    </label>
  );
}

export default function SystemSettingsPage({ isDark }) {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('appearance');
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
  const [showIpayToken, setShowIpayToken] = useState(false);

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

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Themes & branding' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Global & customer alerts' },
    ...(role !== 'moderator' ? [
      { id: 'ipay', label: 'Payment Gateway', icon: CreditCard, desc: 'iPay IPG integration' },
      { id: 'security', label: 'Access Security', icon: Shield, desc: 'Deletion passcode' }
    ] : [])
  ];

  return (
    <form onSubmit={handleSave} style={{ width: '100%', padding: '0 0 32px' }} noValidate>
      <style>{`
        :root {
          --brand-color: ${themeColor};
          --brand-color-rgb: ${hexToRgb(themeColor) ? `${hexToRgb(themeColor).r}, ${hexToRgb(themeColor).g}, ${hexToRgb(themeColor).b}` : '232, 123, 53'};
          --brand-color-light: ${hexToRgb(themeColor) ? `rgba(${hexToRgb(themeColor).r}, ${hexToRgb(themeColor).g}, ${hexToRgb(themeColor).b}, 0.12)` : 'rgba(232, 123, 53, 0.12)'};
          --hover-color: ${c.hover};
          --border-color: ${c.border};
          --text-color: ${c.text};
          --sub-text-color: ${c.subText};
        }
        
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 24px;
        }
        
        .settings-container {
          display: flex;
          gap: 24px;
          align-items: stretch;
          min-height: 600px;
        }
        
        .settings-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: ${c.card};
          border: 1px solid ${c.border};
          border-radius: 16px;
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          box-shadow: ${isDark ? '0 4px 20px rgba(0,0,0,0.15)' : '0 4px 20px rgba(0,0,0,0.02)'};
        }
        
        .settings-sidebar-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: ${c.subText};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
        }
        
        .settings-sidebar-btn:hover {
          background: ${c.hover} !important;
          color: ${c.text};
        }
        
        .settings-sidebar-btn.active {
          background: var(--brand-color-light) !important;
          color: var(--brand-color) !important;
          font-weight: 600;
        }
        
        .settings-content {
          flex: 1;
          min-width: 0;
          background: ${c.card};
          border: 1px solid ${c.border};
          border-radius: 16px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          box-shadow: ${isDark ? '0 4px 20px rgba(0,0,0,0.15)' : '0 4px 20px rgba(0,0,0,0.02)'};
        }
        
        .tab-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)'};
        }
        
        .premium-input {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .premium-input:focus {
          border-color: var(--brand-color) !important;
          box-shadow: 0 0 0 3px var(--brand-color-light) !important;
        }
        
        .customer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
          padding: 4px;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .tab-fade-in {
          animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        
        .floating-changed-bar {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        
        @media (max-width: 950px) {
          .appearance-grid, .gateway-grid, .security-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
        }
        
        @media (max-width: 768px) {
          .settings-container {
            flex-direction: column !important;
            gap: 16px !important;
            align-items: stretch !important;
          }
          .settings-sidebar {
            width: 100% !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            padding: 8px !important;
            white-space: nowrap !important;
            min-height: auto !important;
          }
          .settings-sidebar-btn {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            padding: 8px 12px !important;
            font-size: 11px !important;
            flex-shrink: 0 !important;
            gap: 6px !important;
          }
          .settings-sidebar-btn-desc {
            display: none !important;
          }
          .settings-content {
            padding: 20px !important;
          }
          .settings-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            margin-bottom: 20px;
          }
        }
        
        @media (max-width: 600px) {
          .passcode-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── Page Header ─────────────────────────── */}
      <div className="settings-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={22} style={{ color: 'var(--brand-color)' }} />
            System Settings
          </h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 4, maxWidth: 600 }}>
            Configure global brand theme colors, payment gateways, customer notifications, and deletion passcodes.
          </p>
        </div>
      </div>

      <div className="settings-container">
        {/* ── Left Sidebar Navigation ──────────────── */}
        <div className="settings-sidebar">
          {/* Upper Branding Section */}
          <div className="settings-sidebar-btn-desc" style={{ padding: '4px 8px 16px', borderBottom: `1px solid ${c.border}`, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--brand-color-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Sliders size={16} style={{ color: 'var(--brand-color)' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Control Center</div>
                <div style={{ fontSize: 10.5, color: c.subText, marginTop: 1 }}>Settings Dashboard</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              
              // Notification / Status dot calculations
              let showStatusDot = false;
              let statusDotColor = 'transparent';
              if (tab.id === 'notifications') {
                showStatusDot = notificationExemptCustomers.length > 0;
                statusDotColor = 'var(--brand-color)';
              } else if (tab.id === 'ipay') {
                showStatusDot = ipayEnabled;
                statusDotColor = '#10B981';
              } else if (tab.id === 'security') {
                showStatusDot = isPasscodeSet;
                statusDotColor = '#10B981';
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`settings-sidebar-btn ${isTabActive ? 'active' : ''}`}
                >
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <Icon size={18} style={{ color: isTabActive ? 'var(--brand-color)' : 'inherit' }} />
                    {showStatusDot && (
                      <span style={{
                        position: 'absolute',
                        top: -2, right: -4,
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: statusDotColor,
                        border: `1.5px solid ${isTabActive ? 'var(--brand-color-light)' : c.card}`
                      }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: isTabActive ? 600 : 500 }}>{tab.label}</span>
                    <span className="settings-sidebar-btn-desc" style={{ fontSize: 10.5, color: isTabActive ? 'var(--brand-color)' : c.subText, opacity: isTabActive ? 0.8 : 0.6, marginTop: 1, fontWeight: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tab.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Lower Sync State Section */}
          <div className="settings-sidebar-btn-desc" style={{ padding: '16px 8px 4px', borderTop: `1px solid ${c.border}`, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: c.subText }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#10B981', display: 'inline-block',
                boxShadow: '0 0 8px #10B981'
              }} />
              <span style={{ fontWeight: 500 }}>Supabase Connected</span>
            </div>
            <div style={{ fontSize: 10, color: c.subText, opacity: 0.6, marginTop: 4 }}>
              Active Session: {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Admin'}
            </div>
          </div>
        </div>

        {/* ── Right Content Area ──────────────────── */}
        <div className="settings-content">
          {/* TAB 1: APPEARANCE */}
          <div style={{ display: activeTab === 'appearance' ? 'flex' : 'none' }} className="tab-fade-in tab-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 28, flex: 1 }} className="appearance-grid">
              {/* Left Sub-column: Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Palette size={18} style={{ color: 'var(--brand-color)' }} />
                    Brand Aesthetics
                  </h3>
                  <p style={{ fontSize: 13, color: c.subText, margin: 0, lineHeight: 1.5 }}>
                    Personalize the color system of the Nextiom customer portal and administrator workspace.
                  </p>
                </div>

                {/* Preset grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Color Presets</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 10 }}>
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
                            height: 40,
                            borderRadius: 10,
                            background: preset.value,
                            border: isSelected ? `2.5px solid ${c.text}` : `1px solid ${c.borderStrong}`,
                            cursor: 'pointer',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isSelected ? `0 0 16px ${preset.value}60` : 'none',
                          }}
                        >
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: -4, right: -4,
                              width: 16, height: 16,
                              borderRadius: '50%',
                              background: '#10B981',
                              border: `2px solid ${c.card}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <CheckCircle2 size={10} style={{ color: '#fff' }} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Picker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${c.border}`, paddingTop: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Custom Hex Value</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${c.borderStrong}`, cursor: 'pointer', flexShrink: 0 }}>
                      <input
                        type="color"
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        style={{
                          position: 'absolute', top: -8, left: -8, width: 60, height: 60,
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
                        className="premium-input"
                        style={{
                          width: '100%', padding: '11px 14px', borderRadius: 10,
                          background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                          color: c.text, fontSize: 14, fontFamily: 'JetBrains Mono, monospace',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sub-column: Live Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Live Component Preview</label>
                <div style={{
                  padding: '16px 20px', 
                  borderRadius: 14, 
                  border: `1px solid ${c.border}`, 
                  background: c.panel2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 14,
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                  minHeight: 380,
                  justifyContent: 'space-between'
                }}>
                  {/* Mock Browser Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: `1px solid ${c.borderStrong}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                      </div>
                      <span style={{ fontSize: 10.5, color: c.subText, fontFamily: 'monospace', marginLeft: 8, background: isDark ? '#1C1E24' : '#fff', padding: '2.5px 10px', borderRadius: 6, border: `1px solid ${c.border}` }}>
                        portal.nextiom.com/dashboard
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} /> Live Demo
                    </span>
                  </div>
                  
                  {/* Mock Layout */}
                  <div style={{ display: 'flex', gap: 16, flex: 1, paddingTop: 6 }}>
                    {/* Mock Sidebar */}
                    <div style={{ width: 100, display: 'flex', flexDirection: 'column', gap: 6, borderRight: `1px solid ${c.border}`, paddingRight: 10 }}>
                      <div style={{ height: 12, width: 60, background: c.borderStrong, borderRadius: 3, marginBottom: 8 }} />
                      <div style={{ height: 24, borderRadius: 6, background: 'var(--brand-color-light)', borderLeft: '3px solid var(--brand-color)', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6 }}>
                        <div style={{ height: 10, width: 10, borderRadius: 2, background: 'var(--brand-color)' }} />
                        <div style={{ height: 6, width: 40, background: 'var(--brand-color)', borderRadius: 1.5 }} />
                      </div>
                      {['35', '45', '30'].map((w, idx) => (
                        <div key={idx} style={{ height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6 }}>
                          <div style={{ height: 10, width: 10, borderRadius: 2, background: c.borderStrong }} />
                          <div style={{ height: 6, width: parseInt(w), background: c.borderStrong, borderRadius: 1.5 }} />
                        </div>
                      ))}
                    </div>
                    
                    {/* Mock Page Content */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Mock Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ height: 12, width: 70, background: c.text, borderRadius: 2 }} />
                        <button type="button" style={{
                          padding: '5px 10px', borderRadius: 6,
                          background: 'var(--brand-color)', border: 'none',
                          color: '#fff', fontSize: 9, fontWeight: 700,
                          boxShadow: '0 2px 6px var(--brand-color-light)', cursor: 'pointer'
                        }}>
                          New Order
                        </button>
                      </div>
                      
                      {/* Mock Alert/Banner */}
                      <div style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--brand-color-light)',
                        border: '1px solid var(--brand-color)',
                        color: c.text, fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <ShieldAlert size={11} style={{ color: 'var(--brand-color)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Hosting renewal is due in 3 days.</span>
                      </div>
                      
                      {/* Mock Dashboard Card */}
                      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 6, width: 30, background: c.subText, borderRadius: 2 }} />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>$1,240.00</span>
                          <span style={{ fontSize: 8, color: '#10b981', fontWeight: 600 }}>+12%</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                          <span style={{ padding: '2px 5px', borderRadius: 4, background: 'var(--brand-color-light)', color: 'var(--brand-color)', fontSize: 7, fontWeight: 700 }}>
                            Active
                          </span>
                          <span style={{ padding: '2px 5px', borderRadius: 4, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: 7, fontWeight: 700 }}>
                            Done
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 2: NOTIFICATIONS */}
          <div style={{ display: activeTab === 'notifications' ? 'flex' : 'none' }} className="tab-fade-in tab-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={18} style={{ color: 'var(--brand-color)' }} />
                  System Alerts & Notifications
                </h3>
                <p style={{ fontSize: 13, color: c.subText, margin: 0, lineHeight: 1.5 }}>
                  Configure customer-facing notifications rules and exclusions list.
                </p>
              </div>

              {/* Toggle switch */}
              <div style={{ 
                padding: '16px 20px', 
                borderRadius: 12, 
                background: c.panel2, 
                border: `1px solid ${c.border}`,
              }}>
                <FormToggle 
                  checked={notificationsEnabled} 
                  onChange={setNotificationsEnabled}
                  title="Enable Customer Dashboard Notifications"
                  description="When disabled, all notifications are globally hidden from customers."
                  brandColor="var(--brand-color)"
                  isDark={isDark}
                />
              </div>

              {/* Exempt list section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Muted Customer Exceptions ({notificationExemptCustomers.length} Muted)
                </label>

                {/* Search spot */}
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
                  <input
                    type="text"
                    value={searchCustomerQuery}
                    onChange={(e) => setSearchCustomerQuery(e.target.value)}
                    placeholder="Search customers by name, email, or company..."
                    className="premium-input"
                    style={{
                      width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10,
                      background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                      color: c.text, fontSize: 13.5,
                      outline: 'none'
                    }}
                  />
                  {searchCustomerQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchCustomerQuery('')}
                      style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: c.subText, fontSize: 12, cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Customer list container (Grid Cards layout) */}
                <div className="customer-grid custom-scrollbar">
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
                      return (
                        <div style={{ gridColumn: '1 / -1', padding: '40px 16px', fontSize: 13, color: c.subText, textAlign: 'center' }}>
                          No active customer accounts found matching search criteria.
                        </div>
                      );
                    }

                    return filtered.map((customer) => {
                      const isSelected = notificationExemptCustomers.includes(customer.id);
                      const initials = (customer.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      
                      const statusColors = {
                        active: '#10b981',
                        pending: '#f59e0b',
                        rejected: '#ef4444'
                      };
                      const statusColor = statusColors[String(customer.status).toLowerCase()] || c.subText;

                      return (
                        <label
                          key={customer.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: 14,
                            borderRadius: 12,
                            border: isSelected ? `1.5px solid var(--brand-color)` : `1px solid ${c.border}`,
                            background: isSelected ? 'var(--brand-color-light)' : c.card,
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            userSelect: 'none',
                            position: 'relative',
                            boxShadow: isSelected ? '0 4px 12px var(--brand-color-light)' : 'none',
                          }}
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
                            style={{ display: 'none' }}
                          />
                          
                          {/* Card Top: Avatar, Checkbox */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: isSelected ? 'var(--brand-color)' : (isDark ? '#2D3139' : '#E2E8F0'),
                              color: isSelected ? '#fff' : c.text,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11.5, fontWeight: 700, transition: 'all 0.2s'
                            }}>
                              {initials}
                            </div>
                            
                            <div style={{
                              width: 18, height: 18, borderRadius: 4,
                              border: `1.5px solid ${isSelected ? 'var(--brand-color)' : c.borderStrong}`,
                              background: isSelected ? 'var(--brand-color)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}>
                              {isSelected && <CheckCircle2 size={10} style={{ color: '#fff' }} />}
                            </div>
                          </div>

                          {/* Card Content */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {customer.name || 'Unnamed'}
                            </span>
                            <span style={{ fontSize: 11, color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {customer.email || 'No email'}
                            </span>
                            {customer.company && (
                              <span style={{ fontSize: 11, color: c.subText, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4 }}>
                                🏢 {customer.company}
                              </span>
                            )}
                          </div>

                          {/* Card Bottom */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTop: `1px solid ${c.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                              <span style={{ fontSize: 10.5, color: c.subText, textTransform: 'capitalize' }}>{customer.status || 'Active'}</span>
                            </div>
                            {isSelected && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--brand-color)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Muted
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* TAB 3: IPAY GATEWAY */}
          {role !== 'moderator' && (
            <div style={{ display: activeTab === 'ipay' ? 'flex' : 'none' }} className="tab-fade-in tab-content">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, flex: 1 }} className="gateway-grid">
                {/* Left controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CreditCard size={18} style={{ color: 'var(--brand-color)' }} />
                      iPay Payment Gateway Setup
                    </h3>
                    <p style={{ fontSize: 13, color: c.subText, margin: 0, lineHeight: 1.5 }}>
                      Integrate iPay Global Web Payments to authorize customer online checkout and payment transactions.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Toggle Switch */}
                    <div style={{ 
                      padding: '16px 20px', 
                      borderRadius: 12, 
                      background: c.panel2, 
                      border: `1px solid ${c.border}`,
                    }}>
                      <FormToggle 
                        checked={ipayEnabled} 
                        onChange={setIpayEnabled}
                        title="Enable Online Payments via iPay"
                        description="Allow customers to process payment receipts and checkout invoices via integration."
                        brandColor="var(--brand-color)"
                        isDark={isDark}
                      />
                    </div>

                    {/* Integration Token */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: ipayEnabled ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Public Integration API Token
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type={showIpayToken ? "text" : "password"}
                          value={ipayWebToken}
                          onChange={(e) => setIpayWebToken(e.target.value)}
                          placeholder="Enter public IPG integration token..."
                          disabled={!ipayEnabled}
                          className="premium-input"
                          style={{
                            width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10,
                            background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                            color: c.text, fontSize: 13.5,
                            outline: 'none',
                            fontFamily: showIpayToken ? 'JetBrains Mono, monospace' : 'inherit'
                          }}
                        />
                        <button
                          type="button"
                          disabled={!ipayEnabled}
                          onClick={() => setShowIpayToken(!showIpayToken)}
                          style={{
                            position: 'absolute',
                            right: 14,
                            background: 'none',
                            border: 'none',
                            color: c.subText,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0,
                            opacity: ipayEnabled ? 0.8 : 0.4
                          }}
                        >
                          {showIpayToken ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Sandbox Switch */}
                    <div style={{ 
                      padding: '16px 20px', 
                      borderRadius: 12, 
                      background: c.panel2, 
                      border: `1px solid ${c.border}`,
                      opacity: ipayEnabled ? 1 : 0.5,
                      transition: 'opacity 0.2s'
                    }}>
                      <FormToggle 
                        checked={ipaySandbox} 
                        onChange={setIpaySandbox}
                        disabled={!ipayEnabled}
                        title="Sandbox Testing Mode"
                        description="Use mock transaction endpoints for payment development and validation cycles."
                        brandColor="var(--brand-color)"
                        isDark={isDark}
                      />
                    </div>

                    
                  </div>
                </div>

                {/* Right mockup checkout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Checkout Gateway Preview
                  </label>
                  <div style={{
                    padding: 20,
                    borderRadius: 14,
                    border: `1px solid ${c.border}`,
                    background: c.panel2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)',
                    opacity: ipayEnabled ? 1 : 0.5,
                    transition: 'all 0.2s',
                    height: '100%',
                    justifyContent: 'center',
                    minHeight: 320
                  }}>
                    {/* Merchant Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: c.text }}>Nextiom Solutions</div>
                        <div style={{ fontSize: 10, color: c.subText }}>Invoice #INV-2026-089</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand-color)' }}>$240.00</div>
                        <div style={{ fontSize: 9, color: c.subText }}>USD Amount</div>
                      </div>
                    </div>

                    {/* Gateway Indicator */}
                    <div style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: isDark ? '#1C1E24' : '#fff',
                      border: `1px solid ${c.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: c.text }}>Secure iPay IPG Gateway</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: ipaySandbox ? '#f59e0b' : '#10b981', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 4, background: ipaySandbox ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)' }}>
                        {ipaySandbox ? 'Sandbox' : 'Production'}
                      </span>
                    </div>

                    {/* Mock Card Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ height: 4, width: 40, background: c.borderStrong, borderRadius: 1 }} />
                        <div style={{ height: 28, borderRadius: 6, background: isDark ? '#15161A' : '#f8f8f7', border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 10, color: c.subText }}>
                          •••• •••• •••• 4242
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ height: 4, width: 30, background: c.borderStrong, borderRadius: 1 }} />
                          <div style={{ height: 28, borderRadius: 6, background: isDark ? '#15161A' : '#f8f8f7', border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 10, color: c.subText }}>
                            12/29
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ height: 4, width: 20, background: c.borderStrong, borderRadius: 1 }} />
                          <div style={{ height: 28, borderRadius: 6, background: isDark ? '#15161A' : '#f8f8f7', border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 10, color: c.subText }}>
                            •••
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pay button */}
                    <button type="button" disabled style={{
                      width: '100%', padding: '8px 0', borderRadius: 8,
                      background: 'var(--brand-color)', border: 'none',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 4px 12px var(--brand-color-light)'
                    }}>
                      Pay Securely ($240.00)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACCESS SECURITY */}
          {role !== 'moderator' && (
            <div style={{ display: activeTab === 'security' ? 'flex' : 'none' }} className="tab-fade-in tab-content">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, flex: 1 }} className="security-grid">
                {/* Left controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shield size={18} style={{ color: 'var(--brand-color)' }} />
                      Customer Deletion Passcode
                    </h3>
                    <p style={{ fontSize: 13, color: c.subText, margin: 0, lineHeight: 1.5 }}>
                      Add a high-security validation passcode layer to prevent accidental user account deletions.
                    </p>
                  </div>

                  {!isPasscodeSet ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <div style={{ display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <ShieldAlert size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 12.5, color: isDark ? '#fca5a5' : '#b91c1c', margin: 0, lineHeight: 1.5 }}>
                          Security passcode has not been set. Customer records can currently be deleted without secondary approval.
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Configure Access Passcode
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input
                            type="password"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            placeholder="Enter a secure passcode..."
                            className="premium-input"
                            style={{
                              flex: 1, padding: '11px 14px', borderRadius: 10,
                              background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                              color: c.text, fontSize: 14,
                              outline: 'none'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleSetPasscode}
                            disabled={saving || !passcode}
                            style={{
                              padding: '0 20px', borderRadius: 10, border: 'none',
                              background: passcode ? 'var(--brand-color)' : c.borderStrong,
                              color: passcode ? '#fff' : c.subText,
                              fontSize: 13.5, fontWeight: 700,
                              cursor: passcode && !saving ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s',
                              boxShadow: passcode ? '0 4px 12px var(--brand-color-light)' : 'none',
                            }}
                          >
                            Configure
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Active status */}
                      <div style={{ 
                        padding: '14px 18px', 
                        borderRadius: 12, 
                        background: isDark ? 'rgba(16,185,129,0.06)' : '#ecfdf5', 
                        border: `1px solid ${isDark ? 'rgba(16,185,129,0.12)' : '#a7f3d0'}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10 
                      }}>
                        <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: isDark ? '#34d399' : '#047857' }}>
                          Passcode protection is currently active
                        </span>
                      </div>

                      {!showOtpSection ? (
                        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>Update Passcode</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Passcode</label>
                              <input
                                type="password"
                                value={currentPasscode}
                                onChange={(e) => setCurrentPasscode(e.target.value)}
                                placeholder="Enter current passcode..."
                                className="premium-input"
                                style={{
                                  width: '100%', padding: '11px 14px', borderRadius: 10,
                                  background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                                  color: c.text, fontSize: 13.5,
                                  outline: 'none'
                                }}
                              />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="passcode-grid">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Passcode</label>
                                <input
                                  type="password"
                                  value={newPasscode}
                                  onChange={(e) => setNewPasscode(e.target.value)}
                                  placeholder="Enter new passcode..."
                                  className="premium-input"
                                  style={{
                                    width: '100%', padding: '11px 14px', borderRadius: 10,
                                    background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                                    color: c.text, fontSize: 13.5,
                                    outline: 'none'
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirm New Passcode</label>
                                <input
                                  type="password"
                                  value={confirmNewPasscode}
                                  onChange={(e) => setConfirmNewPasscode(e.target.value)}
                                  placeholder="Confirm new passcode..."
                                  className="premium-input"
                                  style={{
                                    width: '100%', padding: '11px 14px', borderRadius: 10,
                                    background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                                    color: c.text, fontSize: 13.5,
                                    outline: 'none'
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                              <button
                                type="button"
                                onClick={() => { setShowOtpSection(true); handleSendOtp(); }}
                                style={{
                                  background: 'none', border: 'none', color: 'var(--brand-color)',
                                  fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0,
                                  textDecoration: 'underline'
                                }}
                              >
                                Forgot passcode? Reset via SMS OTP
                              </button>
                              
                              <button
                                type="button"
                                onClick={handleUpdatePasscode}
                                disabled={saving || !currentPasscode || !newPasscode || !confirmNewPasscode}
                                style={{
                                  padding: '10px 20px', borderRadius: 10, border: 'none',
                                  background: (currentPasscode && newPasscode && confirmNewPasscode) ? 'var(--brand-color)' : c.borderStrong,
                                  color: (currentPasscode && newPasscode && confirmNewPasscode) ? '#fff' : c.subText,
                                  fontSize: 13.5, fontWeight: 700,
                                  cursor: (currentPasscode && newPasscode && confirmNewPasscode) && !saving ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s',
                                  boxShadow: (currentPasscode && newPasscode && confirmNewPasscode) ? '0 4px 12px var(--brand-color-light)' : 'none',
                                }}
                              >
                                Update Passcode
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>Reset Passcode via OTP</h4>
                          <p style={{ fontSize: 13, color: c.subText, margin: 0, lineHeight: 1.5 }}>
                            We have generated a 6-digit verification code and dispatched it to your primary security contact phone: <strong>0701766634</strong>.
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Enter 6-Digit Code</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••••"
                                className="premium-input"
                                style={{
                                  flex: 1, padding: '11px 14px', borderRadius: 10,
                                  background: c.inputBg, border: `1.5px solid ${c.inputBorder}`,
                                  color: c.text, fontSize: 18, fontWeight: 'bold', letterSpacing: 6,
                                  textAlign: 'center', outline: 'none'
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={verifyingOtp || otpCode.length !== 6}
                                style={{
                                  padding: '0 24px', borderRadius: 10, border: 'none',
                                  background: otpCode.length === 6 ? 'var(--brand-color)' : c.borderStrong,
                                  color: otpCode.length === 6 ? '#fff' : c.subText,
                                  fontSize: 13.5, fontWeight: 700,
                                  cursor: otpCode.length === 6 && !verifyingOtp ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s',
                                  boxShadow: otpCode.length === 6 ? '0 4px 12px var(--brand-color-light)' : 'none',
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
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0
                              }}
                            >
                              {sendingOtp ? 'Sending...' : 'Resend Verification SMS'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowOtpSection(false); setOtpSent(false); setOtpCode(''); }}
                              style={{
                                background: 'none', border: 'none', color: '#ef4444',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0
                              }}
                            >
                              Cancel Reset
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Protected Operations Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Guarded Portal Operations
                  </label>
                  <div style={{
                    padding: 20,
                    borderRadius: 14,
                    border: `1px solid ${c.border}`,
                    background: c.panel2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)',
                    height: '100%',
                    justifyContent: 'center',
                    minHeight: 280
                  }}>
                    <p style={{ fontSize: 12, color: c.subText, margin: 0, lineHeight: 1.4 }}>
                      The following sensitive operations require passcode confirmation to execute:
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                      {[
                        { label: 'Customer Account Deletion', desc: 'Permanently erases authentication records, active license configurations, and hosting logs.' },
                        { label: 'Billing Configuration Modifications', desc: 'Overrides default bank details, iPay integration keys, or invoice template defaults.' },
                        { label: 'System Logs Purging', desc: 'Cleans audit trails, edge executions, or error databases.' }
                      ].map((action, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: isPasscodeSet ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            color: isPasscodeSet ? '#10b981' : '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2
                          }}>
                            <Shield size={11} />
                          </div>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: c.text }}>{action.label}</div>
                            <div style={{ fontSize: 10.5, color: c.subText, marginTop: 2, lineHeight: 1.3 }}>{action.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Action Bar for Unsaved Changes ───── */}
      {isChanged && (
        <div className="floating-changed-bar" style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: isDark ? 'rgba(28, 30, 36, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 16,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(12px)',
          zIndex: 100,
          width: '90%',
          maxWidth: 680,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-color)', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: c.text }}>You have unsaved changes</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${c.borderStrong}`,
                background: 'transparent', color: c.text, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = c.hover}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Revert
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: 'var(--brand-color)',
                color: '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px var(--brand-color-light)',
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Settings
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
