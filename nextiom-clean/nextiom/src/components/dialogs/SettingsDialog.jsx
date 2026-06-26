import React, { useEffect, useState } from 'react';
import { Settings, Save, Mail, BellRing } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  DEFAULT_APP_SETTINGS,
  getSettings,
  saveSettings,
} from '@/lib/storage';

function SettingsDialog({ open, onOpenChange, onUpdate, isDark = false }) {
  const [settings, setSettings] = useState({ ...DEFAULT_APP_SETTINGS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const localSettings = await Promise.resolve(getSettings());
        if (mounted) {
          setSettings({
            ...DEFAULT_APP_SETTINGS,
            ...localSettings,
          });
        }
      } catch {
        if (mounted) {
          setSettings({ ...DEFAULT_APP_SETTINGS });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (settings.emailRemindersEnabled && !settings.adminEmail?.trim()) {
        throw new Error('Admin email is required when reminders are enabled.');
      }
      saveSettings({
        emailRemindersEnabled: settings.emailRemindersEnabled,
        reminderDaysBefore: settings.reminderDaysBefore,
        adminEmail: settings.adminEmail,
      });

      toast({
        title: 'Settings Saved',
        description: 'Email reminder preferences have been updated.',
      });
      onUpdate?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Email Reminders',
        description: err?.message || 'Failed to save email reminder settings.',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  const field = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/30 focus:border-[var(--brand-color)] outline-none transition-all text-sm';
  const theme = {
    shell: '#ffffff',
    shellBorder: 'rgba(15,23,42,0.08)',
    card: '#f8fafc',
    cardBorder: 'rgba(148,163,184,0.35)',
    text: '#0f172a',
    subText: '#64748b',
    fieldBg: '#ffffff',
    fieldBorder: '#e2e8f0',
    fieldText: '#0f172a',
    mutedCard: 'rgba(248,250,252,0.92)',
  };
  const darkTheme = {
    shell: '#1C1E24',
    shellBorder: 'rgba(255,255,255,0.08)',
    card: '#22252C',
    cardBorder: 'rgba(255,255,255,0.10)',
    text: '#ffffff',
    subText: '#a0a0a0',
    fieldBg: '#22252C',
    fieldBorder: 'rgba(255,255,255,0.10)',
    fieldText: '#ffffff',
    mutedCard: 'rgba(255,255,255,0.03)',
  };
  const ui = isDark ? darkTheme : theme;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-0 bg-transparent p-0 shadow-none">
        <div style={{ background: ui.shell, border: `1px solid ${ui.shellBorder}`, borderRadius: 24, boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.55)' : '0 24px 80px rgba(15,23,42,0.18)', overflow: 'hidden' }}>
        <div style={{ padding: 24 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: ui.text }}>
            <Settings className="w-5 h-5" />
            System Settings
          </DialogTitle>
          <DialogDescription style={{ color: ui.subText }}>
            Configure automated email reminder preferences for the portal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="mt-4 space-y-5" noValidate>
          <div style={{ border: `1px solid ${ui.cardBorder}`, background: ui.card, borderRadius: 20, padding: 16, boxShadow: isDark ? 'none' : '0 1px 0 rgba(255,255,255,0.7) inset' }} className="space-y-4">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold" style={{ color: ui.text }}>Email Reminders</h3>
            </div>

            <div style={{ background: ui.mutedCard, border: `1px solid ${ui.cardBorder}`, borderRadius: 16, padding: '12px 16px' }} className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="reminders" className="text-base font-medium" style={{ color: ui.text }}>Enable reminders</Label>
                <p className="text-xs" style={{ color: ui.subText }}>Automatically send emails for expiring licenses.</p>
              </div>
              <Switch
                id="reminders"
                checked={settings.emailRemindersEnabled}
                onCheckedChange={(checked) => setSettings((current) => ({ ...current, emailRemindersEnabled: checked }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="days" className="flex items-center gap-2" style={{ color: ui.text }}>
                  <BellRing className="w-4 h-4 text-slate-500" />
                  Reminder Threshold (Days)
                </Label>
                <input
                  id="days"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.reminderDaysBefore}
                  onChange={(e) => setSettings((current) => ({ ...current, reminderDaysBefore: parseInt(e.target.value, 10) || 0 }))}
                  className={field}
                  style={{ background: ui.fieldBg, borderColor: ui.fieldBorder, color: ui.fieldText }}
                  disabled={!settings.emailRemindersEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2" style={{ color: ui.text }}>
                  <Mail className="w-4 h-4 text-slate-500" />
                  Admin / Test Email
                </Label>
                <input
                  id="email"
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings((current) => ({ ...current, adminEmail: e.target.value }))}
                  className={field}
                  style={{ background: ui.fieldBg, borderColor: ui.fieldBorder, color: ui.fieldText }}
                  placeholder="admin@example.com"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={loading || saving}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl border-0 bg-[var(--brand-color)] text-white shadow-md transition-all font-medium hover:bg-[#d66a24]" disabled={loading || saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving…' : loading ? 'Loading…' : 'Save Changes'}
            </Button>
          </div>
        </form>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;