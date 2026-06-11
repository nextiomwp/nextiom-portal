import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Mail, AlertCircle, ShoppingBag, Info, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotifications, markAsRead, markAllNotificationsAsRead, getCustomerDomainRequests, getCustomerHostingRequests } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';

function NotificationBell({ userId, onViewAll, onNavigate, isDark = false, c = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const brand = c.brand || '#E87B35';
  const card = c.card || '#fff';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';

  const getReadState = () => {
    const markAllAt = localStorage.getItem('cust_notif_mark_all_at');
    const readVirtIds = (() => { try { return JSON.parse(localStorage.getItem('cust_notif_read_virt') || '[]'); } catch { return []; } })();
    return { markAllAt, readVirtIds };
  };

  const applyReadState = (notif) => {
    if (notif.read_status) return notif;
    const { markAllAt, readVirtIds } = getReadState();
    if (markAllAt && notif.created_at && notif.created_at < markAllAt) return { ...notif, read_status: true };
    if (notif.virtual && readVirtIds.includes(notif.id)) return { ...notif, read_status: true };
    return notif;
  };

  const loadNotifications = async () => {
    try {
      // Sync mark-all-at from user metadata (cross-browser)
      const { data: { user } } = await supabase.auth.getUser();
      const metaMarkAllAt = user?.user_metadata?.cust_notif_mark_all_at;
      if (metaMarkAllAt) {
        const local = localStorage.getItem('cust_notif_mark_all_at');
        if (!local || metaMarkAllAt > local) {
          localStorage.setItem('cust_notif_mark_all_at', metaMarkAllAt);
        }
      }

      const [all, domainReqs, hostingReqs, customerRes] = await Promise.all([
        getNotifications(userId),
        getCustomerDomainRequests(userId).catch(() => []),
        getCustomerHostingRequests(userId).catch(() => []),
        supabase
          .from('customers')
          .select('notifications_cleared_at')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      const clearedAt = customerRes?.data?.notifications_cleared_at;
      const clearedTime = clearedAt ? new Date(clearedAt).getTime() : 0;

      let dbNotifications = Array.isArray(all) ? all : [];
      if (clearedTime > 0) {
        dbNotifications = dbNotifications.filter(n => !n.created_at || new Date(n.created_at).getTime() > clearedTime);
      }

      const existingTitles = new Set(dbNotifications.map(n => n.title));
      const virtualNotifs = [];

      (domainReqs || []).forEach(r => {
        const st = String(r.status || '').toLowerCase();
        if (st === 'approved' || st === 'completed' || st === 'rejected') {
          const timestamp = r.updated_at || r.created_at;
          if (clearedTime > 0 && timestamp && new Date(timestamp).getTime() <= clearedTime) {
            return;
          }
          const title = st === 'rejected'
            ? `Domain Request Rejected — ${r.domain_name}`
            : `Domain Request Approved — ${r.domain_name}`;
          if (!existingTitles.has(title)) {
            virtualNotifs.push({
              id: `virt-domain-${r.id}`,
              title,
              message: st === 'rejected'
                ? `Your domain request for ${r.domain_name} has been declined.`
                : `Your domain request for ${r.domain_name} has been approved.`,
              type: st === 'rejected' ? 'expiration' : 'update',
              read_status: false,
              created_at: timestamp,
              virtual: true,
            });
          }
        }
      });

      (hostingReqs || []).forEach(r => {
        const st = String(r.status || '').toLowerCase();
        if (st === 'approved' || st === 'completed' || st === 'rejected') {
          const timestamp = r.updated_at || r.created_at;
          if (clearedTime > 0 && timestamp && new Date(timestamp).getTime() <= clearedTime) {
            return;
          }
          const planName = r.package_type?.split('|')[0]?.trim() || 'Hosting';
          const title = st === 'rejected'
            ? `Hosting Request Rejected — ${planName}`
            : `Hosting Request Approved — ${planName}`;
          if (!existingTitles.has(title)) {
            virtualNotifs.push({
              id: `virt-hosting-${r.id}`,
              title,
              message: st === 'rejected'
                ? `Your hosting request for ${planName} has been declined.`
                : `Your hosting request for ${planName} has been approved.`,
              type: st === 'rejected' ? 'expiration' : 'update',
              read_status: false,
              created_at: timestamp,
              virtual: true,
            });
          }
        }
      });

      const combined = [...dbNotifications, ...virtualNotifs]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .map(applyReadState);

      setUnreadCount(combined.filter(n => !n.read_status).length);
      setRecentNotifications(combined.slice(0, 5));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    const now = new Date().toISOString();
    localStorage.setItem('cust_notif_mark_all_at', now);
    const virtUnreadIds = recentNotifications
      .filter(n => n.virtual && !n.read_status)
      .map(n => n.id);
    if (virtUnreadIds.length > 0) {
      const { readVirtIds } = getReadState();
      localStorage.setItem('cust_notif_read_virt', JSON.stringify([...new Set([...readVirtIds, ...virtUnreadIds])]));
    }
    setRecentNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
    setUnreadCount(0);
    await markAllNotificationsAsRead(userId);
    supabase.auth.updateUser({ data: { cust_notif_mark_all_at: now } });
  };

  const getNavTarget = (notification) => {
    const title = (notification.title || '').toLowerCase();
    const type = (notification.type || '').toLowerCase();
    if (type === 'announcement') return null;
    if (type === 'quotation' || title.includes('quotation')) return 'quotations';
    if (type === 'product_assigned' || title.includes('product')) return 'products';
    if (type === 'invoice' || type.startsWith('payment_') || title.includes('invoice') || title.includes('payment')) return 'invoices';
    if (type === 'email_request' || type.startsWith('email') || title.includes('email request') || title.includes('email')) return 'emails_my';
    if (title.includes('domain')) return 'domains_my';
    if (title.includes('hosting')) return 'hosting_my';
    if (type === 'ticket' || title.includes('ticket')) return 'support_tickets';
    return null;
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read_status) {
      if (notification.virtual) {
        const { readVirtIds } = getReadState();
        localStorage.setItem('cust_notif_read_virt', JSON.stringify([...new Set([...readVirtIds, notification.id])]));
        setRecentNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read_status: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        await markAsRead(notification.id);
      }
    }
    
    // Navigate to target page
    const target = getNavTarget(notification);
    setIsOpen(false);
    if (target && onNavigate) onNavigate(target);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'expiration': return <AlertCircle className="w-3.5 h-3.5" style={{ color: brand }} />;
      case 'new_product': return <ShoppingBag className="w-3.5 h-3.5 text-green-500" />;
      case 'update': return <Info className="w-3.5 h-3.5 text-blue-500" />;
      case 'invoice': return <Receipt className="w-3.5 h-3.5 text-purple-500" />;
      default: return <Mail className="w-3.5 h-3.5" style={{ color: subText }} />;
    }
  };

  const getIconBg = (type) => {
    if (isDark) {
      switch (type) {
        case 'expiration': return 'rgba(232,123,53,0.15)';
        case 'new_product': return 'rgba(34,197,94,0.15)';
        case 'update': return 'rgba(59,130,246,0.15)';
        case 'invoice': return 'rgba(168,85,247,0.15)';
        default: return 'rgba(100,116,139,0.15)';
      }
    }
    switch (type) {
      case 'expiration': return '#fff7ed';
      case 'new_product': return '#dcfce7';
      case 'update': return '#dbeafe';
      case 'invoice': return '#f3e8ff';
      default: return '#f1f5f9';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full transition-colors focus:outline-none"
        style={{ color: isOpen ? text : subText, backgroundColor: isOpen ? hover : 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = hover}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = isOpen ? hover : 'transparent'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
            style={{ backgroundColor: '#ef4444', borderColor: card }}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 rounded-xl z-50 overflow-hidden"
            style={{
              background: card,
              border: `1px solid ${border}`,
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex justify-between items-center"
              style={{ borderBottom: `1px solid ${border}`, background: panel2 }}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" style={{ color: brand }} />
                <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: subText }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: brand, color: '#fff' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors"
                    style={{ color: brand, background: c.brandLight || 'rgba(232,123,53,0.1)' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Mark all as read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} style={{ color: subText }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[340px] overflow-y-auto">
              {recentNotifications.length > 0 ? (
                <div>
                  {recentNotifications.map(notification => {
                    const isRead = notification.read_status;
                    return (
                      <div
                        key={notification.id}
                        className="px-4 py-3 transition-colors cursor-pointer"
                        style={{
                          borderBottom: `1px solid ${border}`,
                          backgroundColor: !isRead
                            ? (isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)')
                            : 'transparent',
                        }}
                        onClick={() => handleNotificationClick(notification)}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = hover}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = !isRead
                          ? (isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)')
                          : 'transparent'}
                      >
                        <div className="flex gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: getIconBg(notification.type) }}
                          >
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <p
                                className="text-xs font-semibold truncate pr-2"
                                style={{ color: !isRead ? text : subText }}
                              >
                                {notification.title}
                              </p>
                              <span className="text-[10px] flex-shrink-0" style={{ color: subText }}>
                                {notification.created_at ? new Date(notification.created_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <p className="text-xs line-clamp-2 leading-snug" style={{ color: subText }}>
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" style={{ color: subText }} />
                  <p className="text-xs" style={{ color: subText }}>No notifications</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2" style={{ borderTop: `1px solid ${border}`, background: panel2 }}>
              <button
                onClick={() => { setIsOpen(false); onViewAll(); }}
                className="w-full py-1.5 text-xs font-semibold rounded-lg transition-colors"
                style={{ color: brand, backgroundColor: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = c.brandLight}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                View All Notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
