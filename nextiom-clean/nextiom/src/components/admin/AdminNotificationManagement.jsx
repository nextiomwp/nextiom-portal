import React, { useState, useEffect } from 'react';
import { Send, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { addNotification, getCustomers } from '@/lib/storage';

function AdminNotificationManagement() {
  const [formData, setFormData] = useState({
    recipientId: 'all',
    type: 'announcement',
    title: '',
    message: ''
  });

  const [customers, setCustomers] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    getCustomers().then(data => setCustomers(data || []));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();

    if (formData.recipientId === 'all') {
      await Promise.all(customers.map(c =>
        addNotification({
          customer_id: c.id,
          type: formData.type,
          title: formData.title,
          message: formData.message
        })
      ));
      toast({ title: "Sent to All Customers", description: `Notification sent to ${customers.length} users.` });
    } else {
      await addNotification({
        customer_id: formData.recipientId,
        type: formData.type,
        title: formData.title,
        message: formData.message
      });
      toast({ title: "Notification Sent" });
    }

    setFormData({ recipientId: 'all', type: 'announcement', title: '', message: '' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" /> Send Notification
          </h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <Label>Recipient</Label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.recipientId}
                onChange={e => setFormData({ ...formData, recipientId: e.target.value })}
              >
                <option value="all">All Customers</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Type</Label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="announcement">Announcement (General)</option>
                <option value="update">Product Update</option>
                <option value="expiration">Expiration Alert</option>
              </select>
            </div>

            <div>
              <Label>Title</Label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. System Maintenance"
                required
              />
            </div>

            <div>
              <Label>Message</Label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md h-32"
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                placeholder="Type your message here..."
                required
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Send Notification</Button>
          </form>
        </div>
      </div>

      <div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-full">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-500" /> Templates & Recent
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded border border-slate-100 cursor-pointer hover:bg-slate-100"
              onClick={() => setFormData({
                ...formData,
                title: 'Important Security Update',
                message: 'We have released a critical security update. Please update your plugins immediately.'
              })}
            >
              <h4 className="font-semibold text-sm">Template: Security Update</h4>
              <p className="text-xs text-slate-500">Click to use this template</p>
            </div>
            <div className="p-4 bg-slate-50 rounded border border-slate-100 cursor-pointer hover:bg-slate-100"
              onClick={() => setFormData({
                ...formData,
                title: 'Maintenance Schedule',
                message: 'Our servers will be undergoing maintenance on Sunday from 2AM to 4AM UTC.'
              })}
            >
              <h4 className="font-semibold text-sm">Template: Maintenance</h4>
              <p className="text-xs text-slate-500">Click to use this template</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminNotificationManagement;