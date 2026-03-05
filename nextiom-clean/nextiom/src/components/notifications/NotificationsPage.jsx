import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getNotifications, markAsRead } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = getCurrentUser();

  useEffect(() => {
    const load = () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const data = getNotifications(currentUser.id);
            setNotifications(data);
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    load();
  }, []);

  const handleRead = (id) => {
      markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {notifications.length > 0 ? (
            <div className="divide-y divide-slate-100">
                {notifications.map(n => (
                    <div key={n.id} className={`p-4 ${!n.read_status ? 'bg-blue-50/30' : ''}`}>
                        <div className="flex justify-between">
                            <h3 className="font-semibold text-sm">{n.title}</h3>
                            <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                        {!n.read_status && (
                            <button onClick={() => handleRead(n.id)} className="text-xs text-blue-600 mt-2 font-medium">Mark as Read</button>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <div className="p-12 text-center text-slate-500">No notifications</div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;