import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNotifications, markAsRead, deleteNotification, getCustomers } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    // In real app, we use currentUser.id. Here we need to find the linked customer ID if role is customer
    let userId = currentUser.id;
    if (currentUser.role === 'customer') {
        const customers = getCustomers();
        const customer = customers.find(c => c.email === currentUser.email);
        if (customer) userId = customer.id;
    }

    const all = getNotifications(userId);
    // Sort by date desc
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setNotifications(all);
  };

  const handleMarkAsRead = (id) => {
    markAsRead(id);
    loadNotifications();
  };

  const handleDelete = (id) => {
    deleteNotification(id);
    loadNotifications();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.readStatus;
    return true;
  });

  return (
    <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Notifications
            </h1>
            <p className="text-slate-600">
                Stay updated with important announcements and alerts.
            </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex gap-2">
                <Button 
                    variant={filter === 'all' ? 'default' : 'ghost'} 
                    onClick={() => setFilter('all')}
                    className="text-sm"
                >
                    All
                </Button>
                <Button 
                    variant={filter === 'unread' ? 'default' : 'ghost'} 
                    onClick={() => setFilter('unread')}
                    className="text-sm"
                >
                    Unread
                </Button>
            </div>
            
            <div className="divide-y divide-slate-100">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notification => (
                        <div key={notification.id} className={`p-6 hover:bg-slate-50 transition-colors ${!notification.readStatus ? 'bg-blue-50/50' : ''}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-full flex-shrink-0 ${
                                    notification.type === 'announcement' ? 'bg-blue-100 text-blue-600' :
                                    notification.type === 'expiration' ? 'bg-orange-100 text-orange-600' :
                                    'bg-green-100 text-green-600'
                                }`}>
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`font-semibold text-slate-800 mb-1 ${!notification.readStatus ? 'text-blue-700' : ''}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-slate-500">
                                            {new Date(notification.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm mb-3">
                                        {notification.message}
                                    </p>
                                    <div className="flex gap-2">
                                        {!notification.readStatus && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="h-8 text-xs"
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" /> Mark as Read
                                            </Button>
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDelete(notification.id)}
                                            className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-12 text-center text-slate-500">
                        No notifications found.
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}

export default NotificationCenter;