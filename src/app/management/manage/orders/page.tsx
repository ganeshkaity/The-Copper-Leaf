'use client';

import React, { useEffect, useState } from 'react';
import { WaiterShell } from '@/components/layout/waiter-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order, OrderStatus } from '@/types/order';
import { ShoppingBag, Clock, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function WaiterOrdersPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<string>('ACTIVE');

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const ordQ = query(
      collection(db, 'orders'),
      where('restaurantId', '==', activeRestaurantId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(ordQ, (snap) => {
      const list: Order[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));
      setOrders(list);
      setLoading(false);
    });

    return () => unsub();
  }, [activeRestaurantId]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const payload: any = {
        orderStatus: nextStatus,
        updatedAt: serverTimestamp(),
      };
      if (nextStatus === 'COMPLETED') {
        payload.completedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'orders', orderId), payload);
      toast.success(`Order marked as ${nextStatus}`);
    } catch (err: any) {
      toast.error('Failed to update order status');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterTab === 'ACTIVE') {
      return o.orderStatus !== 'COMPLETED' && o.orderStatus !== 'CANCELLED';
    }
    if (filterTab === 'READY') return o.orderStatus === 'READY';
    if (filterTab === 'COMPLETED') return o.orderStatus === 'COMPLETED';
    return true;
  });

  return (
    <WaiterShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Table Orders & Service ({filteredOrders.length})
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track kitchen preparation, serve ready courses to tables, and finalize dining sessions.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 border-b border-[#E8E0D5] dark:border-[#2A2A33] pb-2">
          {[
            { id: 'ACTIVE', label: 'Active Floor Orders' },
            { id: 'READY', label: 'Ready at Pass' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'ALL', label: 'All Orders' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No Orders in this View"
            description="There are currently no active orders matching your filter."
          />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const time = order.createdAt?.seconds
                ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Just now';

              return (
                <Card
                  key={order.id}
                  className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-sm transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-lg text-gray-900 dark:text-white">
                        {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
                      </span>
                      <span className="font-mono text-xs text-gray-400">#{order.orderNumber}</span>
                      <StatusBadge status={order.orderStatus} />
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-3">
                      <span>{time}</span>
                      <span>•</span>
                      <span>Total: ₹{order.finalPayable}</span>
                      <span>•</span>
                      <span className="capitalize">Payment: {order.paymentStatus.toLowerCase()}</span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-1">
                      {order.items?.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(', ')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {order.orderStatus === 'READY' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Serve to Table
                      </Button>
                    )}

                    {order.orderStatus === 'SERVED' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        className="text-xs"
                      >
                        Mark Completed
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </WaiterShell>
  );
}
