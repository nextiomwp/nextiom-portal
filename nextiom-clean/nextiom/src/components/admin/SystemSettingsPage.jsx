import React, { useEffect, useState } from 'react';
import { Settings, Save, RotateCcw, Palette, Layout, ShieldAlert, CheckCircle2, Sliders, Info, Loader2 } from 'lucide-react';
import { getPortalSettings, savePortalSettings, addNotification, hexToRgb } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeColor, setThemeColor] = useState('#E87B35');
  const [originalColor, setOriginalColor] = useState('#E87B35');
  const [allSettings, setAllSettings] = useState({});
  const { toast } = useToast();

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const portal = await getPortalSettings();
        if (mounted) {
          setAllSettings(portal);
          setThemeColor(portal.themeColor || '#E87B35');
          setOriginalColor(portal.themeColor || '#E87B35');
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
      // Preserve other portal settings while updating the theme color
      const updated = await savePortalSettings({
        ...allSettings,
        themeColor: themeColor,
      });
      setAllSettings(updated);
      setOriginalColor(themeColor);

      // Create admin activity notification
      await addNotification({
        customer_id: null,
        type: 'admin_activity',
        title: 'Theme Color Updated',
        message: `The administrator changed the system brand theme color to ${themeColor}.`,
      }).catch(() => {});

      toast({
        title: 'Settings Saved',
        description: 'System theme color has been successfully updated and applied.',
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
    toast({
      title: 'Reset Theme Picker',
      description: 'Reverted color changes back to the saved system color.',
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

  const isColorChanged = themeColor !== originalColor;

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 32px' }} noValidate>
      {/* ── Page Header ─────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={22} style={{ color: c.brand }} />
            System Settings
          </h1>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 4, maxWidth: 500 }}>
            Configure global look-and-feel variables. Updating the theme color here immediately propagates the brand styling to all customer and admin pages.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {isColorChanged && (
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
            disabled={saving || !isColorChanged}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 10, border: 'none',
              background: isColorChanged ? 'var(--brand-color)' : c.borderStrong,
              color: isColorChanged ? '#fff' : c.subText,
              fontSize: 13, fontWeight: 700,
              cursor: isColorChanged && !saving ? 'pointer' : 'not-allowed',
              opacity: saving ? 0.7 : 1,
              transition: 'opacity 0.2s, background-color 0.2s',
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* ── Left Column: Configuration ──────────────── */}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = themeColor.toLowerCase() === preset.value.toLowerCase();
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleSelectPreset(preset.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 8,
                        background: isSelected ? c.hover : 'transparent',
                        border: `1.5px solid ${isSelected ? 'var(--brand-color)' : c.border}`,
                        color: c.text, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: preset.value, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{preset.name.split(' ')[0]}</span>
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

          {/* Info block */}
          <div style={{ display: 'flex', gap: 12, padding: '16px 20px', borderRadius: 16, background: isDark ? 'rgba(99,102,241,0.08)' : '#eff6ff', border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : '#bfdbfe'}` }}>
            <Info size={20} style={{ color: isDark ? '#818cf8' : '#3b82f6', flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fff' : '#1e3a8a', margin: '0 0 4px 0' }}>Real-time Propagation</h4>
              <p style={{ fontSize: 12, color: isDark ? '#a5b4fc' : '#2563eb', margin: 0, lineHeight: 1.5 }}>
                When you click Save, the new color is synchronized using Supabase. Any users active on their dashboards (both customers and other admins) will immediately see the layout refresh with the new color without reload.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Live Preview ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layout size={16} style={{ color: themeColor }} />
              Live Components Preview
            </h2>
            <p style={{ fontSize: 12, color: c.subText, margin: '0 0 6px 0' }}>
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
        </div>
      </div>
    </form>
  );
}
