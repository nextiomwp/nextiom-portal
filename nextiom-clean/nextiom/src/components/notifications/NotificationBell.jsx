import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, X, Mail, AlertCircle, ShoppingBag, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getNotifications, markAsRead } from '@/lib/storage';

function NotificationBell({ userId, onViewAll }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const all = await getNotifications(userId);
      
      if (!Array.isArray(all)) {
        console.warn('Notifications data is not an array:', all);
        setRecentNotifications([]);
        setUnreadCount(0);
        return;
      }

      // Sort by created_at (handling potential snake_case from DB)
      const sorted = all.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA;
      });
      
      // Filter unread (handling potential snake_case from DB)
      setUnreadCount(sorted.filter(n => !(n.read_status || n.readStatus)).length);
      setRecentNotifications(sorted.slice(0, 5));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    await markAsRead(id);
    loadNotifications();
  };

  const getIcon = (type) => {
    switch(type) {
      case 'expiration': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'new_product': return <ShoppingBag className="w-4 h-4 text-green-600" />;
      case 'update': return <Info className="w-4 h-4 text-blue-600" />;
      default: return <Mail className="w-4 h-4 text-slate-500" />;
    }
  };

  const getBgColor = (type) => {
    switch(type) {
      case 'expiration': return 'bg-orange-50';
      case 'new_product': return 'bg-green-50';
      case 'update': return 'bg-blue-50';
      default: return 'bg-slate-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors focus:outline-none ${isOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden ring-1 ring-black ring-opacity-5"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notifications</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto">
              {recentNotifications.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {recentNotifications.map((notification) => {
                    const isRead = notification.read_status || notification.readStatus;
                    const dateStr = notification.created_at || notification.createdAt;
                    
                    return (
                      <div 
                        key={notification.id} 
                        className={`px-4 py-3 hover:bg-slate-50 transition-colors relative group ${!isRead ? 'bg-blue-50/20' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getBgColor(notification.type)}`}>
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <p className={`text-xs font-semibold truncate pr-2 ${!isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                {notification.title}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {dateStr ? new Date(dateStr).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-snug">
                              {notification.message}
                            </p>
                          </div>
                           {!isRead && (
                              <button 
                               onClick={(e) => handleMarkAsRead(e, notification.id)}
                               className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-500 opacity-0 group-hover:opacity-100 hover:bg-blue-50 rounded transition-all"
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
                <div className="p-8 text-center text-slate-500">
                  <p className="text-xs">No notifications</p>
                </div>
              )}
            </div>

            <div className="p-2 border-t border-slate-100 bg-slate-50/30">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsOpen(false);
                  onViewAll();
                }}
                className="w-full text-xs font-medium text-blue-600 h-8"
              >
                View All
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;