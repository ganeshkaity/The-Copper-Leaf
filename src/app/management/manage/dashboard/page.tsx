'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { WaiterShell } from '@/components/layout/waiter-shell';
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
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order } from '@/types/order';
import { Table } from '@/types/table';
import { ServiceRequest } from '@/types/service-request';
import { TableReservation } from '@/types/table';
import {
  LayoutDashboard,
  Clock,
  LayoutGrid,
  ShoppingBag,
  BellRing,
  DollarSign,
  Laptop,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function WaiterDashboardPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Real-time Orders Stream
    const ordQ = query(
      collection(db, 'orders'),
      where('restaurantId', '==', activeRestaurantId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubOrders = onSnapshot(ordQ, (snap) => {
      const list: Order[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));
      setOrders(list);
    });

    // 2. Real-time Tables Stream
    const tabQ = query(
      collection(db, 'tables'),
      where('restaurantId', '==', activeRestaurantId)
    );
    const unsubTables = onSnapshot(tabQ, (snap) => {
      const list: Table[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Table));
      setTables(list);
    });

    // 3. Pending Waiter Requests
    const reqQ = query(
      collection(db, 'serviceRequests'),
      where('restaurantId', '==', activeRestaurantId),
      where('status', '==', 'PENDING')
    );
    const unsubReqs = onSnapshot(reqQ, (snap) => {
      const list: ServiceRequest[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServiceRequest));
      setRequests(list);
      setLoading(false);
    });

    // 4. Same-day reservations
    const resQ = query(
      collection(db, 'tableReservations'),
      where('restaurantId', '==', activeRestaurantId),
      where('status', 'in', ['CONFIRMED', 'CHECKED_IN'])
    );
    const unsubRes = onSnapshot(resQ, (snap) => {
      const list: TableReservation[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as TableReservation));
      setReservations(list);
    });

    return () => {
      unsubOrders();
      unsubTables();
      unsubReqs();
      unsubRes();
    };
  }, [activeRestaurantId]);

  // Operational metrics
  const pendingOrders = orders.filter((o) => o.orderStatus === 'PENDING').length;
  const inProgressOrders = orders.filter(
    (o) => o.orderStatus === 'CONFIRMED' || o.orderStatus === 'PREPARING' || o.orderStatus === 'READY'
  ).length;
  const completedOrders = orders.filter((o) => o.orderStatus === 'COMPLETED').length;
  const unpaidBills = orders.filter(
    (o) => o.orderStatus !== 'CANCELLED' && o.paymentStatus !== 'PAID'
  ).length;

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'PLACING_ORDER').length;
  const reservedTables = tables.filter((t) => t.status === 'RESERVED').length;

  // Today's revenue
  const now = new Date();
  const todayRevenue = orders
    .filter((o) => {
      if (o.paymentStatus !== 'PAID' || !o.createdAt?.seconds) return false;
      const d = new Date(o.createdAt.seconds * 1000);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, o) => sum + (o.finalPayable || 0), 0);

  return (
    <WaiterShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Floor & Service Operations
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Active tables, guest service requests, and live floor orders for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'Assigned Branch'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/management/manage/pos">
              <Button size="sm">
                <Laptop className="w-4 h-4 mr-1.5" />
                Launch POS Terminal
              </Button>
            </Link>
          </div>
        </div>

        {/* Urgent Alert Banner: Customer Waiter Assistance Calls */}
        {requests.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <p className="font-serif text-base font-bold text-rose-900 dark:text-rose-200">
                  {requests.length} Active Customer Request{requests.length > 1 ? 's' : ''}!
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Tables are calling for service or assistance.
                </p>
              </div>
            </div>

            <Link href="/management/manage/requests">
              <Button size="sm" variant="destructive" className="text-xs">
                Attend Requests <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Top 4 Operational Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Available Tables"
              value={`${availableTables} / ${tables.length}`}
              icon={LayoutGrid}
              subtitle={`${occupiedTables} active • ${reservedTables} booked`}
            />
            <StatCard
              title="Active Kitchen Orders"
              value={inProgressOrders}
              icon={Clock}
              subtitle={`${pendingOrders} awaiting confirmation`}
            />
            <StatCard
              title="Unpaid Dining Checks"
              value={unpaidBills}
              icon={ShoppingBag}
              subtitle="Tables with open tabs"
            />
            <StatCard
              title="Today's Shift Revenue"
              value={`₹${todayRevenue.toLocaleString('en-IN')}`}
              icon={DollarSign}
              subtitle={`${completedOrders} orders fulfilled`}
            />
          </div>
        )}

        {/* Live Active Tables Mini Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
              Live Floor Snapshot ({tables.length} Tables)
            </h2>
            <Link href="/management/manage/tables" className="text-xs text-primary font-semibold hover:underline">
              Full Floor Management →
            </Link>
          </div>

          {loading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : tables.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 border rounded-2xl">
              No tables configured for this restaurant branch.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {tables.map((t) => {
                const colorClass =
                  t.status === 'AVAILABLE'
                    ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                    : t.status === 'OCCUPIED' || t.status === 'PLACING_ORDER'
                    ? 'border-primary bg-orange-50 dark:bg-orange-950/30 text-primary'
                    : t.status === 'RESERVED'
                    ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300'
                    : 'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-500';

                return (
                  <Link
                    key={t.id}
                    href={`/management/manage/pos?tableId=${t.tableNumber}`}
                    className={`p-3 rounded-xl border text-center transition-transform hover:scale-105 ${colorClass}`}
                  >
                    <p className="font-serif font-bold text-base">{t.tableNumber}</p>
                    <p className="text-[10px] uppercase font-semibold mt-0.5 truncate">{t.status}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Incoming Orders Stream */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
              Recent Service Orders
            </h2>
            <Link href="/management/manage/orders" className="text-xs text-primary font-semibold hover:underline">
              View All Orders →
            </Link>
          </div>

          {loading ? (
            <Skeleton className="h-44 rounded-2xl" />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No Active Orders"
              description="Orders placed via POS or table QR will display in real time here."
            />
          ) : (
            <div className="space-y-2.5">
              {orders.slice(0, 5).map((order) => (
                <Card
                  key={order.id}
                  className="p-4 rounded-xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
                    </span>
                    <p className="text-xs text-gray-500 truncate max-w-xs hidden sm:block">
                      {order.items?.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                      ₹{order.finalPayable}
                    </span>
                    <StatusBadge status={order.orderStatus} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </WaiterShell>
  );
}
