'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order } from '@/types/order';
import { TableReservation } from '@/types/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  ShoppingBag,
  CalendarCheck,
  RotateCcw,
  Percent,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeRestaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Orders
        const ordRef = collection(db, 'orders');
        const ordQ = query(
          ordRef,
          where('restaurantId', '==', activeRestaurantId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const ordSnap = await getDocs(ordQ);
        const ordList: Order[] = [];
        ordSnap.forEach((d) => {
          ordList.push({ id: d.id, ...d.data() } as Order);
        });
        setOrders(ordList);

        // Reservations
        const resRef = collection(db, 'tableReservations');
        const resQ = query(
          resRef,
          where('restaurantId', '==', activeRestaurantId),
          limit(100)
        );
        const resSnap = await getDocs(resQ);
        const resList: TableReservation[] = [];
        resSnap.forEach((d) => {
          resList.push({ id: d.id, ...d.data() } as TableReservation);
        });
        setReservations(resList);
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeRestaurantId]);

  // Aggregate daily sales trend from real orders
  const salesByDayMap: { [day: string]: number } = {};
  orders.forEach((o) => {
    if (o.paymentStatus === 'PAID' && o.createdAt?.seconds) {
      const d = new Date(o.createdAt.seconds * 1000);
      const dayKey = `${d.getDate()}/${d.getMonth() + 1}`;
      salesByDayMap[dayKey] = (salesByDayMap[dayKey] || 0) + (o.finalPayable || 0);
    }
  });

  const salesTrendData = Object.entries(salesByDayMap).map(([day, revenue]) => ({
    day,
    revenue,
  }));

  // Aggregate Order types breakdown (Dine In vs Takeaway)
  const dineInCount = orders.filter((o) => o.orderType === 'DINE_IN').length;
  const takeawayCount = orders.filter((o) => o.orderType === 'TAKEAWAY').length;
  const orderTypeData = [
    { name: 'Dine-In', value: dineInCount, color: '#C8622A' },
    { name: 'Takeaway', value: takeawayCount, color: '#3B82F6' },
  ].filter((d) => d.value > 0);

  // Cancellation and Refund counts
  const cancelledOrdersCount = orders.filter((o) => o.orderStatus === 'CANCELLED').length;
  const refundCount = orders.filter((o) => o.paymentStatus === 'REFUNDED').length;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Performance & Trends Analytics
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Authoritative trends, order distribution, reservation volumes, and fulfillment ratios for{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {currentRestaurant?.name || 'All Locations'}
            </span>
          </p>
        </div>

        {/* 4 Analytics Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Reservations</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{reservations.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500 uppercase font-semibold">Completed Orders</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {orders.filter((o) => o.orderStatus === 'COMPLETED').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-rose-500 uppercase font-semibold">Cancellations</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{cancelledOrdersCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-amber-500 uppercase font-semibold">Processed Refunds</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{refundCount}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend Line (2 cols) */}
          <Card className="lg:col-span-2 p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <h2 className="font-serif text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Daily Sales Trend (₹)
            </h2>

            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : salesTrendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                No paid orders recorded yet to chart daily sales trends.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="day" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip
                      formatter={(val: any) => [`₹${val}`, 'Revenue']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#C8622A"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#C8622A' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Dine-In vs Takeaway Ratio (1 col) */}
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <h2 className="font-serif text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" />
              Order Channel Distribution
            </h2>

            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : orderTypeData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                No orders recorded yet.
              </div>
            ) : (
              <div className="h-64 w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={orderTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {orderTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex items-center gap-4 text-xs mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#C8622A]" />
                    <span>Dine-In ({dineInCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                    <span>Takeaway ({takeawayCount})</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
