import React, { useState, useEffect, useMemo } from 'react';
import { UserCog, Plus, Search, Shield, RefreshCw, Edit, Trash2, CheckCircle2, XCircle, Key, Lock, AlertTriangle, Eye, EyeOff, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getModerators, createModerator, updateModeratorPermissions, updateModeratorStatus, deleteModerator, updateModeratorPassword, DEFAULT_MODERATOR_PERMISSIONS } from '@/lib/storage';
import { format } from '@/lib/supabaseHelpers';

const PERMISSION_GROUPS = [
  {
    title: 'Customer Management',
    items: [
      { key: 'can_manage_customers', label: 'View & Edit Customers', desc: 'Can create and update customer profile details' },
      { key: 'can_delete_customers', label: 'Delete Customers', desc: 'Can permanently remove customer accounts (Privileged)' },
    ]
  },
  {
    title: 'Invoices & Billing',
    items: [
      { key: 'can_manage_invoices', label: 'View & Create Invoices', desc: 'Can generate invoices and record payment receipts' },
      { key: 'can_delete_invoices', label: 'Delete Invoices', desc: 'Can delete invoices from billing records (Privileged)' },
    ]
  },
  {
    title: 'Quotations',
    items: [
      { key: 'can_manage_quotations', label: 'View & Create Quotations', desc: 'Can manage customer project quotations' },
      { key: 'can_delete_quotations', label: 'Delete Quotations', desc: 'Can delete project quotations (Privileged)' },
    ]
  },
  {
    title: 'Products & Licenses',
    items: [
      { key: 'can_manage_products', label: 'View & Manage Products', desc: 'Can add, edit, and assign software products' },
      { key: 'can_delete_products', label: 'Delete Products', desc: 'Can delete products from system catalog (Privileged)' },
    ]
  },
  {
    title: 'Hosting & Services',
    items: [
      { key: 'can_manage_hosting', label: 'Manage Hosting & Domains', desc: 'Can process and manage hosting and domain requests' },
      { key: 'can_delete_hosting', label: 'Delete Hosting Packages', desc: 'Can remove hosting packages and domains (Privileged)' },
    ]
  },
  {
    title: 'Support Tickets & Operations',
    items: [
      { key: 'can_manage_tickets', label: 'Support Tickets', desc: 'Can view and reply to customer support tickets' },
      { key: 'can_manage_jobs', label: 'Jobs & Progress', desc: 'Can create and update on-progress jobs' },
      { key: 'can_manage_announcements', label: 'Announcements', desc: 'Can post system-wide broadcast announcements' },
      { key: 'can_manage_agreements', label: 'Customer Agreements', desc: 'Can manage legal and project agreements' },
    ]
  },
  {
    title: 'System & Audit',
    items: [
      { key: 'can_view_activity_logs', label: 'View Activity Logs', desc: 'Can inspect system audit logs' },
      { key: 'can_manage_system_settings', label: 'System Settings', desc: 'Can adjust SMS, maintenance, and system configurations (Privileged)' },
    ]
  }
];

function AddModeratorModal({ open, onClose, onSuccess, isDark, c }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState({ ...DEFAULT_MODERATOR_PERMISSIONS });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setPermissions({ ...DEFAULT_MODERATOR_PERMISSIONS });
      setShowPassword(false);
      setSearchQuery('');
    }
  }, [open]);

  if (!open) return null;

  const handleTogglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = (val) => {
    const updated = {};
    Object.keys(DEFAULT_MODERATOR_PERMISSIONS).forEach(k => {
      if (!val && (k.includes('delete') || k.includes('settings'))) {
        updated[k] = false;
      } else {
        updated[k] = val;
      }
    });
    setPermissions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Validation Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let formattedName = name.trim();
      if (!formattedName.toLowerCase().startsWith('moderator_')) {
        formattedName = `Moderator_${formattedName}`;
      }

      await createModerator({
        name: formattedName,
        email: email.trim(),
        password,
        phone: phone.trim(),
        permissions
      });

      toast({ title: 'Success', description: `${formattedName} created successfully!` });
      onSuccess();
      onClose();
    } catch (err) {
      toast({ title: 'Creation Failed', description: err.message || 'Failed to create moderator.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const modalBg = c.card;
  const inputBg = isDark ? '#22252C' : '#f5f5f5';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: modalBg, border: `1px solid ${c.border}`, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(232, 123, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCog size={20} color={c.brand} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: c.text, margin: 0 }}>Add New Moderator</h3>
              <p style={{ fontSize: 12, color: c.subText, margin: 0 }}>Create a moderator account with customized permissions</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}>
            <XCircle size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>
                Name <span style={{ color: '#f87171' }}>*</span> (Will be saved as Moderator_Name)
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. John (becomes Moderator_John)"
                required
                style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${c.border}`, borderRadius: 10, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>
                Email Address <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="moderator@company.com"
                required
                style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${c.border}`, borderRadius: 10, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>
                Password <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  style={{ width: '100%', padding: '9px 40px 9px 12px', background: inputBg, border: `1px solid ${c.border}`, borderRadius: 10, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +1234567890"
                style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${c.border}`, borderRadius: 10, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Permissions Matrix */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={16} color={c.brand} /> System Permissions & Privileges
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 11, cursor: 'pointer' }}
                >
                  Standard All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 11, cursor: 'pointer' }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: inputBg, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 14 }}>
              <Search size={14} color={c.subText} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search permissions..."
                style={{ width: '100%', background: 'transparent', border: 'none', color: c.text, fontSize: 12, outline: 'none' }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer', fontSize: 11 }}>
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PERMISSION_GROUPS.map(group => {
                const filteredItems = group.items.filter(item =>
                  item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.desc.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filteredItems.length === 0) return null;
                const allChecked = filteredItems.every(item => !!permissions[item.key]);

                return (
                  <div key={group.title} style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: c.brand, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {group.title}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPermissions(prev => {
                            const updated = { ...prev };
                            filteredItems.forEach(item => {
                              updated[item.key] = !allChecked;
                            });
                            return updated;
                          });
                        }}
                        style={{ background: 'transparent', border: 'none', color: allChecked ? '#f87171' : c.brand, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {allChecked ? 'Clear Group' : 'Select Group'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {filteredItems.map(item => {
                        const active = !!permissions[item.key];
                        const isPrivileged = item.key.includes('delete') || item.key.includes('settings');
                        return (
                          <div
                            key={item.key}
                            onClick={() => handleTogglePermission(item.key)}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              padding: '9px 10px',
                              borderRadius: 8,
                              border: `1px solid ${active ? (isPrivileged ? '#f87171' : c.brand) : c.border}`,
                              background: active ? (isPrivileged ? 'rgba(248, 113, 113, 0.08)' : 'rgba(232, 123, 53, 0.12)') : 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${active ? (isPrivileged ? '#f87171' : c.brand) : c.subText}`, background: active ? (isPrivileged ? '#f87171' : c.brand) : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 }}>
                              {active && <CheckCircle2 size={12} color="#fff" />}
                            </div>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: active ? c.text : c.subText }}>
                                {item.label}
                                {isPrivileged && <span style={{ marginLeft: 6, fontSize: 10, color: '#f87171', fontWeight: 700 }}>Privileged</span>}
                              </div>
                              <div style={{ fontSize: 11, color: c.subText, marginTop: 2 }}>{item.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 16, marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(232, 123, 53, 0.3)' }}
            >
              {loading ? 'Creating Moderator...' : 'Create Moderator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPermissionsModal({ moderator, open, onClose, onSuccess, isDark, c }) {
  const [permissions, setPermissions] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (moderator && open) {
      setPermissions({ ...DEFAULT_MODERATOR_PERMISSIONS, ...(moderator.permissions || {}) });
      setSearchQuery('');
    }
  }, [moderator, open]);

  if (!open || !moderator) return null;

  const handleTogglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = (val) => {
    const updated = {};
    Object.keys(DEFAULT_MODERATOR_PERMISSIONS).forEach(k => {
      if (!val && (k.includes('delete') || k.includes('settings'))) {
        updated[k] = false;
      } else {
        updated[k] = val;
      }
    });
    setPermissions(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateModeratorPermissions(moderator.id, permissions);
      toast({ title: 'Permissions Updated', description: `Permissions for ${moderator.name} updated successfully.` });
      onSuccess();
      onClose();
    } catch (err) {
      toast({ title: 'Update Failed', description: err.message || 'Could not update permissions.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const inputBg = isDark ? '#22252C' : '#f5f5f5';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(232, 123, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color={c.brand} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: c.text, margin: 0 }}>Permissions — {moderator.name}</h3>
              <p style={{ fontSize: 12, color: c.subText, margin: 0 }}>{moderator.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}>
            <XCircle size={20} />
          </button>
        </div>

        {/* Bulk Action Buttons */}
        <div style={{ padding: '12px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 12, color: c.subText }}>Quick Toggles:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 11, cursor: 'pointer' }}
            >
              Standard All
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 11, cursor: 'pointer' }}
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderBottom: `1px solid ${c.border}`, background: 'transparent' }}>
          <Search size={14} color={c.subText} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search permissions..."
            style={{ width: '100%', background: 'transparent', border: 'none', color: c.text, fontSize: 13, outline: 'none' }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer', fontSize: 11 }}>
              Clear
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PERMISSION_GROUPS.map(group => {
            const filteredItems = group.items.filter(item =>
              item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.desc.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (filteredItems.length === 0) return null;
            const allChecked = filteredItems.every(item => !!permissions[item.key]);

            return (
              <div key={group.title} style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.brand, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {group.title}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPermissions(prev => {
                        const updated = { ...prev };
                        filteredItems.forEach(item => {
                          updated[item.key] = !allChecked;
                        });
                        return updated;
                      });
                    }}
                    style={{ background: 'transparent', border: 'none', color: allChecked ? '#f87171' : c.brand, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {allChecked ? 'Clear Group' : 'Select Group'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {filteredItems.map(item => {
                    const active = !!permissions[item.key];
                    const isPrivileged = item.key.includes('delete') || item.key.includes('settings');
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleTogglePermission(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '9px 10px',
                          borderRadius: 8,
                          border: `1px solid ${active ? (isPrivileged ? '#f87171' : c.brand) : c.border}`,
                          background: active ? (isPrivileged ? 'rgba(248, 113, 113, 0.08)' : 'rgba(232, 123, 53, 0.12)') : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${active ? (isPrivileged ? '#f87171' : c.brand) : c.subText}`, background: active ? (isPrivileged ? '#f87171' : c.brand) : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 }}>
                          {active && <CheckCircle2 size={12} color="#fff" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: active ? c.text : c.subText }}>
                            {item.label}
                            {isPrivileged && <span style={{ marginLeft: 6, fontSize: 10, color: '#f87171', fontWeight: 700 }}>Privileged</span>}
                          </div>
                          <div style={{ fontSize: 11, color: c.subText, marginTop: 2 }}>{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${c.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(232, 123, 53, 0.3)' }}
          >
            {loading ? 'Saving Changes...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeModeratorPasswordModal({ moderator, open, onClose, isDark, c }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    }
  }, [open]);

  if (!open || !moderator) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Validation Error', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Validation Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Validation Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await updateModeratorPassword(moderator.user_id, newPassword, moderator.name);
      toast({ title: 'Success', description: `Password for ${moderator.name} has been updated successfully.` });
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to update password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const inputBg = isDark ? '#22252C' : '#f5f5f5';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, maxWidth: 440, width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(232, 123, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={20} color={c.brand} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: c.text, margin: 0 }}>Change Password</h3>
              <p style={{ fontSize: 12, color: c.subText, margin: 0 }}>For {moderator.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}>
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>
              New Password <span style={{ color: '#f87171' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                style={{ width: '100%', padding: '9px 40px 9px 12px', background: inputBg, border: `1px solid ${c.border}`, borderRadius: 10, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.subText, marginBottom: 6 }}>
              Confirm New Password <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${c.border}`, borderRadius: 10, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(232, 123, 53, 0.3)' }}
            >
              {loading ? 'Updating Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminModeratorManagement({ isDark = true }) {
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingModerator, setEditingModerator] = useState(null);
  const [passwordChangeModerator, setPasswordChangeModerator] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: 'var(--brand-color)', panel: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: 'var(--brand-color)', panel: '#f5f5f5' };

  useEffect(() => {
    loadModerators();
  }, []);

  const loadModerators = async () => {
    setLoading(true);
    try {
      const data = await getModerators();
      setModerators(data || []);
    } catch (err) {
      console.error('Failed to load moderators:', err);
      toast({ title: 'Error', description: 'Failed to load moderators list.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (mod) => {
    const newStatus = mod.status === 'active' ? 'disabled' : 'active';
    try {
      await updateModeratorStatus(mod.id, newStatus);
      toast({ title: 'Status Updated', description: `${mod.name} is now ${newStatus}.` });
      loadModerators();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const handleDelete = async (mod) => {
    if (!window.confirm(`Are you sure you want to delete moderator "${mod.name}"? This action cannot be undone.`)) return;

    setDeletingId(mod.id);
    try {
      await deleteModerator(mod.id, mod.user_id);
      toast({ title: 'Moderator Deleted', description: `${mod.name} was removed.` });
      loadModerators();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to delete moderator.', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return moderators.filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    });
  }, [moderators, search]);

  const cardStyle = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };

  return (
    <div>
      {/* Modals */}
      <AddModeratorModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadModerators}
        isDark={isDark}
        c={c}
      />

      <EditPermissionsModal
        moderator={editingModerator}
        open={!!editingModerator}
        onClose={() => setEditingModerator(null)}
        onSuccess={loadModerators}
        isDark={isDark}
        c={c}
      />

      <ChangeModeratorPasswordModal
        moderator={passwordChangeModerator}
        open={!!passwordChangeModerator}
        onClose={() => setPasswordChangeModerator(null)}
        isDark={isDark}
        c={c}
      />

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: c.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCog size={22} color={c.brand} /> Moderator Management
          </h2>
          <p style={{ fontSize: 13, color: c.subText, margin: '4px 0 0' }}>
            Add moderators and customize granular permissions across the entire platform
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(232, 123, 53, 0.3)' }}
        >
          <Plus size={16} /> Add Moderator
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search moderators by name or email..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <button
          onClick={loadModerators}
          style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, color: c.subText, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Moderators List Card */}
      <div style={cardStyle}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>Active Moderators ({filtered.length})</span>
          <span style={{ fontSize: 12, color: c.subText }}>All actions logged in Activity Logs</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: c.subText, fontSize: 14 }}>Loading moderators...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: c.subText }}>
            <UserCog size={36} color={c.subText} style={{ opacity: 0.5, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text }}>No Moderators Found</div>
            <div style={{ fontSize: 13, color: c.subText, marginTop: 4 }}>Click "+ Add Moderator" to create your first moderator user.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
              <thead>
                <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1 }}>Moderator Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1 }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1 }}>Active Permissions</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1 }}>Created Date</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((mod, index) => {
                  const permCount = mod.permissions ? Object.values(mod.permissions).filter(Boolean).length : 0;
                  const totalPerms = Object.keys(DEFAULT_MODERATOR_PERMISSIONS).length;
                  const isActive = mod.status === 'active';

                  return (
                    <tr key={mod.id} style={{ borderTop: index > 0 ? `1px solid ${c.border}` : 'none' }}>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(232, 123, 53, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: c.brand, flexShrink: 0 }}>
                            {mod.name ? mod.name.replace('Moderator_', '').charAt(0).toUpperCase() : 'M'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: c.text }}>{mod.name}</div>
                            <div style={{ fontSize: 11, color: c.brand, fontWeight: 600 }}>Moderator Role</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: c.subText, verticalAlign: 'middle' }}>
                        {mod.email}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: c.subText, verticalAlign: 'middle' }}>
                        {mod.phone || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: isActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)', color: isActive ? '#34d399' : '#f87171', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: c.text }}>
                          {permCount} / {totalPerms} Granted
                        </div>
                        <div style={{ fontSize: 11, color: c.subText }}>
                          {mod.permissions?.can_delete_customers || mod.permissions?.can_delete_invoices ? 'Has Privileged Access' : 'Standard Privileges'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12.5, color: c.subText, verticalAlign: 'middle' }}>
                        {mod.created_at ? format(new Date(mod.created_at), 'yyyy-MM-dd') : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => setEditingModerator(mod)}
                            title="Edit Permissions"
                            style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.brand, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Shield size={13} /> Permissions
                          </button>
                          <button
                            onClick={() => setPasswordChangeModerator(mod)}
                            title="Change Password"
                            style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <Key size={13} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(mod)}
                            title={isActive ? 'Disable Moderator' : 'Activate Moderator'}
                            style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: isActive ? '#fb923c' : '#34d399', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            {isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDelete(mod)}
                            disabled={deletingId === mod.id}
                            title="Delete Moderator"
                            style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid rgba(248, 113, 113, 0.3)`, background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminModeratorManagement;
