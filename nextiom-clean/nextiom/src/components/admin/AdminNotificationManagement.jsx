import React, { useState, useEffect } from 'react';
import { Send, Megaphone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { addNotification, getCustomers } from '@/lib/storage';

const TEMPLATES = [
  {
    label: 'Security Update',
    title: 'Important Security Update',
    message: 'We have released a critical security update for our platform. Please log in and review your account settings to ensure everything is up to date. If you have any questions, please contact our support team.',
  },
  {
    label: 'Scheduled Maintenance',
    title: 'Scheduled Maintenance Notice',
    message: 'Our servers will undergo scheduled maintenance this Sunday from 2:00 AM to 4:00 AM UTC. During this window, some services may be temporarily unavailable. We apologize for any inconvenience and appreciate your patience.',
  },
  {
    label: 'New Feature',
    title: 'Exciting New Features Now Live',
    message: 'We\'re thrilled to announce new features on the Nextiom platform! Log in to your dashboard to explore the latest improvements and enhancements made just for you.',
  },
  {
    label: 'Renewal Reminder',
    title: 'Service Renewal Reminder',
    message: 'This is a friendly reminder that one or more of your services is approaching its renewal date. Please visit your dashboard to review your subscriptions and ensure uninterrupted service.',
  },
];

function AdminNotificationManagement({ isDark = true }) {
  const [formData, setFormData] = useState({
    recipientId: 'all',
    type: 'announcement',
    title: '',
    message: ''
  });
  const [customers, setCustomers] = useState([]);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', input: '#22252C', panel: '#22252C' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', input: '#f5f5f5', panel: '#f5f5f5' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const inpS = { width: '100%', padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 9, background: c.input, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelS = { display: 'block', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 };

  useEffect(() => {
    getCustomers().then(data => setCustomers(data || []));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({ title: 'Required', description: 'Title and message cannot be empty.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      if (formData.recipientId === 'all') {
        await Promise.all(customers.map(cu =>
          addNotification({ customer_id: cu.id, type: formData.type, title: formData.title, message: formData.message })
        ));
        toast({ title: 'Announcement Sent', description: `Sent to all ${customers.length} customers.` });
      } else {
        await addNotification({ customer_id: formData.recipientId, type: formData.type, title: formData.title, message: formData.message });
        toast({ title: 'Announcement Sent', description: 'Notification delivered to the selected customer.' });
      }
      setFormData({ recipientId: 'all', type: 'announcement', title: '', message: '' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send announcement.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'stretch' }}>

      {/* Send Announcement */}
      <div style={{ ...cardS, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: c.brand, flexShrink: 0 }} />
          <Megaphone size={16} style={{ color: c.brand }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>Send Announcement</span>
        </div>
        <form onSubmit={handleSend} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          <div>
            <label style={labelS}>Recipient</label>
            <select style={{ ...inpS, appearance: 'none' }} value={formData.recipientId} onChange={e => setFormData(f => ({ ...f, recipientId: e.target.value }))}>
              <option value="all">All Customers</option>
              {customers.map(cu => (
                <option key={cu.id} value={cu.id}>{cu.name} ({cu.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelS}>Type</label>
            <select style={{ ...inpS, appearance: 'none' }} value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}>
              <option value="announcement">Announcement (General)</option>
              <option value="update">Product Update</option>
              <option value="expiration">Expiration Alert</option>
              <option value="security">Security Notice</option>
            </select>
          </div>
          <div>
            <label style={labelS}>Title</label>
            <input style={inpS} placeholder="e.g. Scheduled Maintenance on May 5th" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label style={labelS}>Message</label>
            <textarea style={{ ...inpS, minHeight: 120, resize: 'vertical' }} placeholder="Write your announcement here..." value={formData.message} onChange={e => setFormData(f => ({ ...f, message: e.target.value }))} required />
          </div>
          <button type="submit" disabled={sending} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', borderRadius: 10, border: 'none', background: c.brand, color: '#fff', fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
            <Send size={15} /> {sending ? 'Sending…' : 'Send Announcement'}
          </button>
        </form>
      </div>

      {/* Templates & Recent */}
      <div style={{ ...cardS, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: c.brand, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>Templates & Recent</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <p style={{ fontSize: 12, color: c.subText, marginBottom: 4 }}>Click a template to auto-fill the form.</p>
          {TEMPLATES.map((t, i) => (
            <div key={i}
              onClick={() => setFormData(f => ({ ...f, title: t.title, message: t.message }))}
              style={{ padding: '12px 14px', background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = c.brand}
              onMouseLeave={e => e.currentTarget.style.borderColor = c.border}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 3 }}>Template: {t.label}</div>
              <div style={{ fontSize: 11, color: c.subText }}>Click to use this template</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminNotificationManagement;
