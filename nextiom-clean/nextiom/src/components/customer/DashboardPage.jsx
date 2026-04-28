import React, { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import NewsAnnouncementsCard from './NewsAnnouncementsCard';
import RateUsCard from './RateUsCard';

function DashboardPage({ user }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    approvedOrders: 0,
    totalSpend: 0,
    joinDate: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const customerId = user.id;

        const [domainRes, hostingRes, customerRes, invoiceRes] = await Promise.all([
          supabase.from('domain_requests').select('id, status').eq('customer_id', customerId),
          supabase.from('hosting_requests').select('id, status').eq('customer_id', customerId),
          supabase.from('customers').select('created_at').eq('id', customerId).single(),
          supabase.from('invoices').select('amount').eq('customer_id', customerId)
        ]);

        const allOrders = [
          ...(domainRes.data || []),
          ...(hostingRes.data || [])
        ];

        const approved = allOrders.filter(o =>
          ['approved', 'completed'].includes(String(o.status || '').toLowerCase())
        );

        const totalSpend = (invoiceRes.data || []).reduce(
          (acc, curr) => acc + (Number(curr.amount) || 0), 0
        );

        setStats({
          totalOrders: allOrders.length,
          approvedOrders: approved.length,
          totalSpend,
          joinDate: customerRes.data?.created_at || user.created_at || new Date().toISOString()
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NewsAnnouncementsCard />
        <RateUsCard user={user} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Total Orders</div>
          <div className="text-2xl font-bold text-slate-800">{stats.totalOrders}</div>
          <ShoppingCart className="w-8 h-8 text-indigo-200 absolute top-6 right-6" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Approved Orders</div>
          <div className="text-2xl font-bold text-green-700">{stats.approvedOrders}</div>
          <CheckCircle className="w-8 h-8 text-green-100 absolute top-6 right-6" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Total Spend</div>
          <div className="text-2xl font-bold text-slate-800">${stats.totalSpend.toFixed(2)}</div>
          <DollarSign className="w-8 h-8 text-emerald-200 absolute top-6 right-6" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Member Since</div>
          <div className="text-lg font-bold text-slate-800">
            {new Date(stats.joinDate).toLocaleDateString()}
          </div>
          <Calendar className="w-8 h-8 text-blue-200 absolute top-6 right-6" />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
