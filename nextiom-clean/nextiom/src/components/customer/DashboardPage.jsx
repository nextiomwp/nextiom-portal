import React, { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import NewsAnnouncementsCard from './NewsAnnouncementsCard';
import RateUsCard from './RateUsCard';

function DashboardPage({ user }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
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
        const { data: orders } = await supabase
          .from('invoices')
          .select('amount')
          .eq('customer_id', user.id);

        const safeOrders = Array.isArray(orders) ? orders : [];
        const totalSpend = safeOrders.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        setStats({
          totalOrders: safeOrders.length,
          totalSpend,
          joinDate: user.created_at || new Date().toISOString()
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
        <RateUsCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Total Orders</div>
          <div className="text-2xl font-bold text-slate-800">{stats.totalOrders}</div>
          <ShoppingCart className="w-8 h-8 text-indigo-200 absolute top-6 right-6" />
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
