'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
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
import { Table } from '@/types/table';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  Users,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customerCount, setCustomerCount] = useState(0);

  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!activeRestaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch orders for this restaurant
        const ordersRef = collection(db, 'orders');
        const ordersQ = query(
          ordersRef,
          where('restaurantId', '==', activeRestaurantId),
          orderBy('createdAt', 'desc'),
          limit(200)
        );
        const ordersSnap = await getDocs(ordersQ);
        const loadedOrders: Order[] = [];
        ordersSnap.forEach((d) => {
          loadedOrders.push({ id: d.id, ...d.data() } as Order);
        });
        setOrders(loadedOrders);

        // 2. Fetch tables for this restaurant
        const tablesRef = collection(db, 'tables');
        const tablesQ = query(
          tablesRef,
          where('restaurantId', '==', activeRestaurantId)
        );
        const tablesSnap = await getDocs(tablesQ);
        const loadedTables: Table[] = [];
        tablesSnap.forEach((d) => {
          loadedTables.push({ id: d.id, ...d.data() } as Table);
        });
        setTables(loadedTables);

        // 3. Count unique customers who placed orders or are registered
        const custRef = collection(db, 'users');
        const custQ = query(custRef, where('role', '==', 'CUSTOMER'), limit(100));
        const custSnap = await getDocs(custQ);
        setCustomerCount(custSnap.size);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [activeRestaurantId]);

  // Filter orders by time range
  const now = new Date();
  const filteredOrders = orders.filter((order) => {
    if (timeRange === 'all') return true;
    if (!order.createdAt?.seconds) return true;
    const orderDate = new Date(order.createdAt.seconds * 1000);

    if (timeRange === 'today') {
      return (
        orderDate.getDate() === now.getDate() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }
    if (timeRange === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return orderDate >= oneWeekAgo;
    }
    if (timeRange === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return orderDate >= oneMonthAgo;
    }
    return true;
  });

  // Calculate real metrics from filtered orders
  const pendingOrders = filteredOrders.filter((o) => o.orderStatus === 'PENDING').length;
  const inProgressOrders = filteredOrders.filter(
    (o) => o.orderStatus === 'CONFIRMED' || o.orderStatus === 'PREPARING' || o.orderStatus === 'READY'
  ).length;
  const completedOrders = filteredOrders.filter((o) => o.orderStatus === 'COMPLETED').length;

  const totalRevenue = filteredOrders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.finalPayable || 0), 0);

  const averageOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

  // Table status breakdown
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'PLACING_ORDER').length;
  const reservedTables = tables.filter((t) => t.status === 'RESERVED').length;

  // Top dishes sold calculation from line-item snapshots
  const dishSalesMap: { [name: string]: { count: number; revenue: number } } = {};
  filteredOrders.forEach((order) => {
    order.items?.forEach((item) => {
      const name = item.nameSnapshot || 'Unknown Dish';
      if (!dishSalesMap[name]) {
        dishSalesMap[name] = { count: 0, revenue: 0 };
      }
      dishSalesMap[name].count += item.quantity || 1;
      dishSalesMap[name].revenue += (item.unitPriceSnapshot || 0) * (item.quantity || 1);
    });
  });

  const topDishes = Object.entries(dishSalesMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <AdminShell>
      <div className="space-y-8">
        {/* Top Header & Range Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Operational Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Live metrics and sales performance for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'All Locations'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-[#18181D] p-1.5 rounded-xl border border-[#E8E0D5] dark:border-[#2A2A33] shadow-sm">
            {(['today', 'week', 'month', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  timeRange === r
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {r === 'all' ? 'All Time' : r}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Primary Top KPI Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Revenue"
              value={`₹${totalRevenue.toLocaleString('en-IN')}`}
              icon={DollarSign}
              subtitle="Paid customer orders"
            />
            <StatCard
              title="Orders in Progress"
              value={inProgressOrders}
              icon={Clock}
              subtitle={`${pendingOrders} pending confirmation`}
            />
            <StatCard
              title="Average Order Value"
              value={`₹${averageOrderValue.toLocaleString('en-IN')}`}
              icon={TrendingUp}
              subtitle="Per completed order"
            />
            <StatCard
              title="Table Occupancy"
              value={`${tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0}%`}
              icon={LayoutGrid}
              subtitle={`${occupiedTables} of ${tables.length} tables active`}
            />
          </div>
        )}

        {/* Secondary Operational Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500">Pending Orders</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingOrders}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500">Completed Orders</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedOrders}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500">Available Tables</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{availableTables}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500">Registered Customers</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{customerCount}</p>
          </div>
        </div>

        {/* Two-Column Layout: Top Dishes & Recent Incoming Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders List (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                Live Orders ({filteredOrders.length})
              </h2>
              <Link href="/n/admin/orders">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All Orders <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card className="p-8 text-center bg-white dark:bg-[#18181D] border-[#E8E0D5] dark:border-[#2A2A33]">
                <EmptyState
                  icon={ShoppingBag}
                  title="No Orders Yet"
                  description="When customers place dine-in, QR, or takeaway orders, they will appear here with live updates."
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredOrders.slice(0, 6).map((order) => (
                  <Card
                    key={order.id}
                    className="p-4 rounded-xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-sm transition-shadow flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {order.tableId ? `#${order.tableId}` : 'Take'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {order.orderType.replace('_', ' ').toLowerCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                          {order.items?.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          ₹{order.finalPayable}
                        </p>
                        <p className="text-[10px] text-gray-400 capitalize">
                          {order.paymentStatus.toLowerCase()}
                        </p>
                      </div>
                      <StatusBadge status={order.orderStatus} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Top Culinary Dishes Sold (1 Column) */}
          <div className="space-y-4">
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
              Top Selling Dishes
            </h2>

            <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
              ) : topDishes.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No dish sales recorded in this time range.
                </div>
              ) : (
                <div className="space-y-4">
                  {topDishes.map((dish, idx) => (
                    <div key={dish.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {dish.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {dish.count} sold
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          ₹{dish.revenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Action Shortcuts */}
            <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] space-y-3">
              <h3 className="font-medium text-xs text-gray-500 uppercase tracking-wider mb-2">
                Operational Shortcuts
              </h3>
              <Link href="/n/admin/tables" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#22222A] text-xs font-medium text-gray-700 dark:text-gray-300">
                <span>Manage Floor & Tables</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/n/admin/menu" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#22222A] text-xs font-medium text-gray-700 dark:text-gray-300">
                <span>Menu Catalog & Prices</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/management/manage/pos" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#22222A] text-xs font-medium text-gray-700 dark:text-gray-300">
                <span>Open Waiter POS Terminal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/management/kitchen" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#22222A] text-xs font-medium text-gray-700 dark:text-gray-300">
                <span>Open Kitchen Display (KDS)</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
