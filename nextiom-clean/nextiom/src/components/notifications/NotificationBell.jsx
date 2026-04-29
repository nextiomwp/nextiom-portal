import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, X, Mail, AlertCircle, ShoppingBag, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotifications, markAsRead, getCustomerDomainRequests, getCustomerHostingRequests } from '@/lib/storage';

function NotificationBell({ userId, onViewAll, isDark = false, c = {} }) {
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

  const loadNotifications = async () => {
    try {
      const [all, domainReqs, hostingReqs] = await Promise.all([
        getNotifications(userId),
        getCustomerDomainRequests(userId).catch(() => []),
        getCustomerHostingRequests(userId).catch(() => []),
      ]);

      const dbNotifications = Array.isArray(all) ? all : [];
      const existingTitles = new Set(dbNotifications.map(n => n.title));
      const virtualNotifs = [];

      (domainReqs || []).forEach(r => {
        const st = String(r.status || '').toLowerCase();
        if (st === 'approved' || st === 'completed' || st === 'rejected') {
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
              created_at: r.updated_at || r.created_at,
              virtual: true,
            });
          }
        }
      });

      (hostingReqs || []).forEach(r => {
        const st = String(r.status || '').toLowerCase();
        if (st === 'approved' || st === 'completed' || st === 'rejected') {
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
              created_at: r.updated_at || r.created_at,
              virtual: true,
            });
          }
        }
      });

      const combined = [...dbNotifications, ...virtualNotifs].sort((a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );

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

  const handleMarkAsRead = async (e, notification) => {
    e.stopPropagation();
    if (notification.virtual) {
      setRecentNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read_status: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    await markAsRead(notification.id);
    loadNotifications();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'expiration': return <AlertCircle className="w-3.5 h-3.5" style={{ color: brand }} />;
      case 'new_product': return <ShoppingBag className="w-3.5 h-3.5 text-green-500" />;
      case 'update': return <Info className="w-3.5 h-3.5 text-blue-500" />;
      default: return <Mail className="w-3.5 h-3.5" style={{ color: subText }} />;
    }
  };

  const getIconBg = (type) => {
    if (isDark) {
      switch (type) {
        case 'expiration': return 'rgba(232,123,53,0.15)';
        case 'new_product': return 'rgba(34,197,94,0.15)';
        case 'update': return 'rgba(59,130,246,0.15)';
        default: return 'rgba(100,116,139,0.15)';
      }
    }
    switch (type) {
      case 'expiration': return '#fff7ed';
      case 'new_product': return '#dcfce7';
      case 'update': return '#dbeafe';
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
              <button onClick={() => setIsOpen(false)} style={{ color: subText }}>
                <X className="w-3.5 h-3.5" />
              </button>
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
                        className="px-4 py-3 relative group transition-colors cursor-pointer"
                        style={{
                          borderBottom: `1px solid ${border}`,
                          backgroundColor: !isRead
                            ? (isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)')
                            : 'transparent',
                        }}
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
                          {!isRead && (
                            <button
                              onClick={e => handleMarkAsRead(e, notification)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: brand }}
                              title="Mark as read"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
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
