import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getOrders } from '@/lib/storage';
import { Eye } from 'lucide-react';

function RecentOrdersTable({ customerId }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const allOrders = getOrders();
    setOrders(allOrders.slice(0, 5)); 
  }, [customerId]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Recent Orders</h2>
            <Button variant="link" size="sm" className="text-blue-600 h-auto p-0 text-xs font-medium">View All</Button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                        <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.length > 0 ? orders.map((order, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-6 text-sm text-slate-700 font-medium">#{order.id}</td>
                            <td className="py-3 px-6 text-sm text-slate-600">
                                {new Date(order.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-3 px-6">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                    order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {order.status || 'Completed'}
                                </span>
                            </td>
                            <td className="py-3 px-6 text-sm text-slate-700 font-medium">${Number(order.amount).toFixed(2)}</td>
                            <td className="py-3 px-6 text-right">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Eye className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                                </Button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">No recent orders found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
}

export default RecentOrdersTable;