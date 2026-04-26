import React, { useState, useEffect } from 'react';
import { Settings, Save, Mail, BellRing } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { getSettings, saveSettings } from '@/lib/storage';

function SettingsDialog({ open, onOpenChange, onUpdate }) {
  const [settings, setSettings] = useState({
    emailRemindersEnabled: false,
    reminderDaysBefore: 15,
    adminEmail: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSettings(getSettings());
    }
  }, [open]);

  const handleSave = (e) => {
    e.preventDefault();
    saveSettings(settings);
    toast({
      title: "Settings Saved",
      description: "Email reminder preferences have been updated.",
    });
    onUpdate();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Settings
          </DialogTitle>
          <DialogDescription>
            Configure automated email notifications and system preferences.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6 mt-4">

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-0.5">
              <Label htmlFor="reminders" className="text-base font-medium">Email Reminders</Label>
              <p className="text-xs text-slate-500">Automatically send emails for expiring licenses</p>
            </div>
            <Switch
              id="reminders"
              checked={settings.emailRemindersEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, emailRemindersEnabled: checked })}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="days" className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-slate-500" />
                Reminder Threshold (Days)
              </Label>
              <input
                id="days"
                type="number"
                min="1"
                max="60"
                value={settings.reminderDaysBefore}
                onChange={(e) => setSettings({ ...settings, reminderDaysBefore: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all text-sm"
                disabled={!settings.emailRemindersEnabled}
              />
              <p className="text-xs text-slate-500">
                Emails will be sent when licenses have this many days or fewer remaining.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                Admin / Test Email
              </Label>
              <input
                id="email"
                type="email"
                value={settings.adminEmail}
                onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#e87b35]/30 focus:border-[#e87b35] outline-none transition-all text-sm"
                placeholder="admin@example.com"
                required
              />
              <p className="text-xs text-slate-500">
                Copies of reminders or test notifications will be sent here.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="bg-[#e87b35] hover:bg-[#d66a24] text-white shadow-md rounded-xl transition-all font-medium border-0">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;