import React, { useState, useEffect, useMemo } from 'react';
import { Send, Megaphone, Search, Trash2, Edit, Users, CheckCircle, Calendar, AlertTriangle, X, Shield, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { addNotification, getCustomers } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';

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

function AdminNotificationManagement({ isDark = true, isMobile = false }) {
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' or 'sent'
  const [formData, setFormData] = useState({
    recipientId: 'all',
    type: 'announcement',
    title: '',
    message: '',
    startDate: '',
    endDate: '',
    useDateRange: false
  });
  const [customers, setCustomers] = useState([]);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Sent Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog/Modal states
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', message: '', type: 'announcement', startDate: '', endDate: '', useDateRange: false });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingAnnouncement, setDeletingAnnouncement] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35', input: '#22252C', panel: '#22252C', brandLight: 'rgba(232,123,53,0.15)' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35', input: '#f5f5f5', panel: '#f5f5f5', brandLight: 'rgba(232,123,53,0.1)' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const inpS = { width: '100%', padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 9, background: c.input, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelS = { display: 'block', fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 };

  useEffect(() => {
    getCustomers().then(data => setCustomers(data || []));
  }, []);

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'announcement')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group them by title, message, and created_at (within 15s)
      const groups = [];
      data.forEach(notif => {
        const notifTime = new Date(notif.created_at).getTime();
        const existingGroup = groups.find(g =>
          g.title === notif.title &&
          g.message === notif.message &&
          Math.abs(new Date(g.created_at).getTime() - notifTime) < 15000
        );

        if (existingGroup) {
          existingGroup.ids.push(notif.id);
          existingGroup.recipients.push({
            id: notif.customer_id,
            read_status: notif.read_status
          });
        } else {
          groups.push({
            title: notif.title,
            message: notif.message,
            type: notif.type,
            created_at: notif.created_at,
            start_date: notif.start_date,
            end_date: notif.end_date,
            ids: [notif.id],
            recipients: [{
              id: notif.customer_id,
              read_status: notif.read_status
            }]
          });
        }
      });

      setAnnouncements(groups);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      toast({ title: 'Error', description: 'Failed to load sent announcements.', variant: 'destructive' });
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sent') {
      fetchAnnouncements();
    }
  }, [activeTab]);

  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach(cu => {
      map[cu.id] = cu;
    });
    return map;
  }, [customers]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({ title: 'Required', description: 'Title and message cannot be empty.', variant: 'destructive' });
      return;
    }
    if (formData.useDateRange && formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({ title: 'Invalid Dates', description: 'Start date cannot be after end date.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const payload = {
        type: formData.type,
        title: formData.title,
        message: formData.message,
        start_date: formData.useDateRange && formData.startDate ? new Date(formData.startDate + 'T00:00:00Z').toISOString() : null,
        end_date: formData.useDateRange && formData.endDate ? new Date(formData.endDate + 'T23:59:59.999Z').toISOString() : null,
      };

      if (formData.recipientId === 'all') {
        await Promise.all(customers.map(cu =>
          addNotification({ customer_id: cu.id, ...payload })
        ));
        toast({ title: 'Announcement Sent', description: `Sent to all ${customers.length} customers.` });
      } else {
        await addNotification({ customer_id: formData.recipientId, ...payload });
        toast({ title: 'Announcement Sent', description: 'Notification delivered to the selected customer.' });
      }
      setFormData({ recipientId: 'all', type: 'announcement', title: '', message: '', startDate: '', endDate: '', useDateRange: false });
      setActiveTab('sent');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send announcement.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim() || !editFormData.message.trim()) {
      toast({ title: 'Required', description: 'Title and message cannot be empty.', variant: 'destructive' });
      return;
    }
    if (editFormData.useDateRange && editFormData.startDate && editFormData.endDate && new Date(editFormData.startDate) > new Date(editFormData.endDate)) {
      toast({ title: 'Invalid Dates', description: 'Start date cannot be after end date.', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          title: editFormData.title,
          message: editFormData.message,
          type: editFormData.type,
          start_date: editFormData.useDateRange && editFormData.startDate ? new Date(editFormData.startDate + 'T00:00:00Z').toISOString() : null,
          end_date: editFormData.useDateRange && editFormData.endDate ? new Date(editFormData.endDate + 'T23:59:59.999Z').toISOString() : null,
        })
        .in('id', editingAnnouncement.ids);

      if (error) throw error;

      toast({ title: 'Success', description: 'Announcement updated successfully.' });
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error updating announcement:', err);
      toast({ title: 'Error', description: 'Failed to update announcement.', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', deletingAnnouncement.ids);

      if (error) throw error;

      toast({ title: 'Success', description: 'Announcement deleted successfully.' });
      setDeletingAnnouncement(null);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast({ title: 'Error', description: 'Failed to delete announcement.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(g =>
      (g.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.message || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [announcements, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tab Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, borderBottom: `1px solid ${c.border}`, paddingBottom: 12 }}>
        <button 
          onClick={() => setActiveTab('compose')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'compose' ? c.brandLight : 'transparent',
            color: activeTab === 'compose' ? c.brand : c.subText,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Compose Announcement
        </button>
        <button 
          onClick={() => setActiveTab('sent')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'sent' ? c.brandLight : 'transparent',
            color: activeTab === 'sent' ? c.brand : c.subText,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Sent Announcements
        </button>
      </div>

      {activeTab === 'compose' ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: isMobile ? 16 : 24, alignItems: 'stretch' }}>
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
              
              {/* Date to Announcement Option */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', border: `1px solid ${c.border}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input 
                    type="checkbox" 
                    id="enable-date-range"
                    checked={formData.useDateRange} 
                    onChange={e => {
                      const checked = e.target.checked;
                      setFormData(f => ({ 
                        ...f, 
                        useDateRange: checked,
                        startDate: checked ? f.startDate || new Date().toISOString().substring(0, 10) : '',
                        endDate: checked ? f.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) : ''
                      }));
                    }}
                    style={{ accentColor: c.brand, cursor: 'pointer' }}
                  />
                  <label htmlFor="enable-date-range" style={{ fontSize: 12, fontWeight: 600, color: c.text, cursor: 'pointer' }}>Date to Announcement (Scheduled Period)</label>
                </div>
                
                {formData.useDateRange && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelS}>Start Date</label>
                      <input 
                        type="date" 
                        style={inpS} 
                        value={formData.startDate} 
                        onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))} 
                        required={formData.useDateRange}
                      />
                    </div>
                    <div>
                      <label style={labelS}>End Date</label>
                      <input 
                        type="date" 
                        style={inpS} 
                        value={formData.endDate} 
                        onChange={e => setFormData(f => ({ ...f, endDate: e.target.value }))} 
                        required={formData.useDateRange}
                      />
                    </div>
                  </div>
                )}
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
      ) : (
        <div style={{ ...cardS, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Search bar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
              <input
                style={{ ...inpS, paddingLeft: 34 }}
                placeholder="Search sent announcements..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ padding: '8px 14px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* List items */}
          {loadingAnnouncements ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0', color: c.subText, fontSize: 13.5 }}>
              Loading sent announcements...
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: c.subText, fontSize: 13.5 }}>
              {searchTerm ? 'No announcements match your search.' : 'No sent announcements found.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredAnnouncements.map((group, idx) => {
                const notifTime = new Date(group.created_at);
                const formattedDate = notifTime.toLocaleDateString(undefined, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                const totalRecipients = group.recipients.length;
                const readCount = group.recipients.filter(r => r.read_status).length;
                const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;
                
                let TypeIcon = Megaphone;
                let iconColor = c.brand;
                let iconBg = isDark ? 'rgba(232,123,53,0.15)' : 'rgba(232,123,53,0.1)';
                
                if (group.type === 'security') {
                  TypeIcon = Shield;
                  iconColor = '#ef4444';
                  iconBg = 'rgba(239,68,68,0.15)';
                } else if (group.type === 'update') {
                  TypeIcon = Info;
                  iconColor = '#3b82f6';
                  iconBg = 'rgba(59,130,246,0.15)';
                } else if (group.type === 'expiration') {
                  TypeIcon = AlertTriangle;
                  iconColor = '#f59e0b';
                  iconBg = 'rgba(245,158,11,0.15)';
                }

                return (
                  <div key={idx} style={{ 
                    background: c.panel, 
                    border: `1px solid ${c.border}`, 
                    borderRadius: 12, 
                    padding: 18, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 14 
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: 8, 
                          background: iconBg, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0 
                        }}>
                          <TypeIcon size={16} style={{ color: iconColor }} />
                        </div>
                        <div>
                          <h4 style={{ color: c.text, fontSize: 14.5, fontWeight: 700, margin: '0 0 4px 0', lineHeight: 1.3 }}>{group.title}</h4>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ 
                              fontSize: 10, 
                              fontWeight: 700, 
                              color: iconColor, 
                              textTransform: 'uppercase', 
                              background: iconBg,
                              padding: '2px 6px',
                              borderRadius: 4
                            }}>
                              {group.type === 'announcement' ? 'General' : group.type}
                            </span>
                            <span style={{ fontSize: 11.5, color: c.subText, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} /> {formattedDate}
                            </span>
                            {(group.start_date || group.end_date) && (
                              <span style={{ 
                                fontSize: 10, 
                                fontWeight: 700, 
                                color: c.brand, 
                                textTransform: 'uppercase', 
                                background: c.brandLight,
                                padding: '2px 6px',
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <Calendar size={10} />
                                {group.start_date ? new Date(group.start_date).toLocaleDateString() : 'Immediate'} - {group.end_date ? new Date(group.end_date).toLocaleDateString() : 'Forever'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          onClick={() => {
                            setEditingAnnouncement(group);
                            setEditFormData({
                              title: group.title,
                              message: group.message,
                              type: group.type,
                              startDate: group.start_date ? group.start_date.substring(0, 10) : '',
                              endDate: group.end_date ? group.end_date.substring(0, 10) : '',
                              useDateRange: !!(group.start_date || group.end_date)
                            });
                          }}
                          style={{ 
                            padding: 6, 
                            borderRadius: 6, 
                            border: 'none', 
                            background: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6', 
                            color: c.text, 
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                          title="Edit Announcement"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => setDeletingAnnouncement(group)}
                          style={{ 
                            padding: 6, 
                            borderRadius: 6, 
                            border: 'none', 
                            background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)', 
                            color: '#ef4444', 
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                          title="Delete Announcement"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Message Body */}
                    <p style={{ 
                      color: c.text, 
                      fontSize: 13.5, 
                      margin: 0, 
                      lineHeight: 1.5, 
                      whiteSpace: 'pre-wrap',
                      opacity: 0.9
                    }}>
                      {group.message}
                    </p>
                    
                    {/* Recipients & Read Status */}
                    <div style={{ 
                      borderTop: `1px solid ${c.border}`, 
                      paddingTop: 12, 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center', 
                      gap: 12 
                    }}>
                      {/* Recipients */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: c.subText, overflow: 'hidden', width: '100%', maxWidth: isMobile ? '100%' : '60%' }}>
                        <Users size={13} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, flexShrink: 0 }}>Sent to:</span>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={
                          group.recipients.map(r => customerMap[r.id]?.name || 'Unknown Customer').filter(Boolean).join(', ')
                        }>
                          {group.recipients.length === customers.length && customers.length > 0 ? (
                            'All Customers'
                          ) : (
                            group.recipients.map(r => customerMap[r.id]?.name || 'Unknown').filter(Boolean).join(', ') || 'No Recipients'
                          )}
                        </span>
                      </div>
                      
                      {/* Read Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: c.subText, fontWeight: 500 }}>
                          {readCount} / {totalRecipients} read ({readPercentage}%)
                        </span>
                        <div style={{ width: 80, height: 6, background: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${readPercentage}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingAnnouncement && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, maxWidth: 500, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: c.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={16} color={c.brand} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>Edit Announcement</div>
                  <div style={{ fontSize: 11, color: c.subText }}>Updating {editingAnnouncement.ids.length} sent notifications</div>
                </div>
              </div>
              <button 
                onClick={() => setEditingAnnouncement(null)} 
                style={{ background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelS}>Type</label>
                  <select 
                    style={{ ...inpS, appearance: 'none' }} 
                    value={editFormData.type} 
                    onChange={e => setEditFormData(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="announcement">Announcement (General)</option>
                    <option value="update">Product Update</option>
                    <option value="expiration">Expiration Alert</option>
                    <option value="security">Security Notice</option>
                  </select>
                </div>
                 <div>
                  <label style={labelS}>Title</label>
                  <input 
                    style={inpS} 
                    value={editFormData.title} 
                    onChange={e => setEditFormData(f => ({ ...f, title: e.target.value }))} 
                    required 
                  />
                </div>

                {/* Date to Announcement Option for Edit Modal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', border: `1px solid ${c.border}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input 
                      type="checkbox" 
                      id="edit-enable-date-range"
                      checked={editFormData.useDateRange} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setEditFormData(f => ({ 
                          ...f, 
                          useDateRange: checked,
                          startDate: checked ? f.startDate || new Date().toISOString().substring(0, 10) : '',
                          endDate: checked ? f.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) : ''
                        }));
                      }}
                      style={{ accentColor: c.brand, cursor: 'pointer' }}
                    />
                    <label htmlFor="edit-enable-date-range" style={{ fontSize: 12, fontWeight: 600, color: c.text, cursor: 'pointer' }}>Date to Announcement (Scheduled Period)</label>
                  </div>
                  
                  {editFormData.useDateRange && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={labelS}>Start Date</label>
                        <input 
                          type="date" 
                          style={inpS} 
                          value={editFormData.startDate} 
                          onChange={e => setEditFormData(f => ({ ...f, startDate: e.target.value }))} 
                          required={editFormData.useDateRange}
                        />
                      </div>
                      <div>
                        <label style={labelS}>End Date</label>
                        <input 
                          type="date" 
                          style={inpS} 
                          value={editFormData.endDate} 
                          onChange={e => setEditFormData(f => ({ ...f, endDate: e.target.value }))} 
                          required={editFormData.useDateRange}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelS}>Message</label>
                  <textarea 
                    style={{ ...inpS, minHeight: 140, resize: 'vertical' }} 
                    value={editFormData.message} 
                    onChange={e => setEditFormData(f => ({ ...f, message: e.target.value }))} 
                    required 
                  />
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button"
                  onClick={() => setEditingAnnouncement(null)} 
                  style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none', background: c.brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: savingEdit ? 'not-allowed' : 'pointer', opacity: savingEdit ? 0.7 : 1 }}
                >
                  {savingEdit ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAnnouncement && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: '32px 28px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle size={26} color="#ef4444" />
            </div>
            <h3 style={{ color: c.text, fontSize: 17, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>Are you sure you want to permanently delete this announcement?</h3>
            <p style={{ color: c.subText, fontSize: 13.5, marginBottom: 28, lineHeight: 1.5 }}>
              This will delete the announcement for both the administrator and all {deletingAnnouncement.recipients.length} customer recipients. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                onClick={() => setDeletingAnnouncement(null)} 
                style={{ padding: '10px 24px', borderRadius: 9, border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm} 
                disabled={deleting} 
                style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete for All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNotificationManagement;
