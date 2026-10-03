'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
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
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminKitchenPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const ordersRef = collection(db, 'orders');
    // Live queue contains CONFIRMED, PREPARING, and READY
    const q = query(
      ordersRef,
      where('restaurantId', '==', activeRestaurantId),
      where('orderStatus', 'in', ['CONFIRMED', 'PREPARING', 'READY']),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Order);
        });
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error('Kitchen live stream error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeRestaurantId]);

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'PREPARING';
    if (currentStatus === 'CONFIRMED') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'READY';
    else if (currentStatus === 'READY') nextStatus = 'SERVED';

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Order moved to ${nextStatus}`);
    } catch (err: any) {
      toast.error('Failed to update kitchen status');
    }
  };

  const confirmedOrders = orders.filter((o) => o.orderStatus === 'CONFIRMED');
  const preparingOrders = orders.filter((o) => o.orderStatus === 'PREPARING');
  const readyOrders = orders.filter((o) => o.orderStatus === 'READY');

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <ChefHat className="w-7 h-7 text-primary" />
              Kitchen Live Queue (KDS)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time culinary dispatch and preparation line oversight for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'All Locations'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181D] text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chime On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                  <span>Muted</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 Kitchen Line Lanes: CONFIRMED -> PREPARING -> READY */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ChefHat}
            title="Kitchen Queue is Clear"
            description="There are currently no active orders awaiting preparation in the kitchen. New incoming orders will appear here automatically in real-time."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lane 1: New / Confirmed Orders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
                <span className="font-serif font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                  New Incoming ({confirmedOrders.length})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-bold">
                  Queue
                </span>
              </div>

              {confirmedOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed rounded-2xl">
                  No pending tickets
                </div>
              ) : (
                confirmedOrders.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={() => handleAdvanceStatus(order.id, 'CONFIRMED')}
                    actionText="Start Cooking"
                  />
                ))
              )}
            </div>

            {/* Lane 2: Cooking in Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-primary">
                <span className="font-serif font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                  On the Stove ({preparingOrders.length})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-primary dark:bg-orange-950/40 font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Preparing
                </span>
              </div>

              {preparingOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed rounded-2xl">
                  Stoves are idle
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={() => handleAdvanceStatus(order.id, 'PREPARING')}
                    actionText="Mark Ready"
                  />
                ))
              )}
            </div>

            {/* Lane 3: Ready for Pass / Service */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
                <span className="font-serif font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                  Ready at Pass ({readyOrders.length})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold">
                  Pass
                </span>
              </div>

              {readyOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed rounded-2xl">
                  No plates on pass
                </div>
              ) : (
                readyOrders.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={() => handleAdvanceStatus(order.id, 'READY')}
                    actionText="Served to Table"
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function KitchenOrderCard({
  order,
  onAdvance,
  actionText,
}: {
  order: Order;
  onAdvance: () => void;
  actionText: string;
}) {
  const elapsedMinutes = order.createdAt?.seconds
    ? Math.max(0, Math.floor((Date.now() / 1000 - order.createdAt.seconds) / 60))
    : 0;

  const isUrgent = elapsedMinutes > 20;

  return (
    <Card className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <span className="font-serif text-lg font-bold text-gray-900 dark:text-white">
            {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
          </span>
          <span className="font-mono text-xs text-gray-400 ml-2">#{order.orderNumber}</span>
        </div>

        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
            isUrgent
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{elapsedMinutes}m</span>
        </div>
      </div>

      {/* Ticket items */}
      <div className="py-3 space-y-2">
        {order.items?.map((item, idx) => (
          <div key={idx} className="text-xs">
            <div className="flex justify-between font-bold text-gray-900 dark:text-white">
              <span>
                {item.quantity}x {item.nameSnapshot}
              </span>
            </div>

            {item.variantSnapshot && (
              <p className="text-[11px] text-gray-500 font-medium">
                Variant: {item.variantSnapshot.name}
              </p>
            )}

            {item.modifierSnapshot && item.modifierSnapshot.length > 0 && (
              <p className="text-[11px] text-gray-500">
                + {item.modifierSnapshot.map((m) => m.name).join(', ')}
              </p>
            )}

            {item.removedIngredients && item.removedIngredients.length > 0 && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                NO: {item.removedIngredients.join(', ')}
              </p>
            )}

            {item.specialInstructions && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                Note: "{item.specialInstructions}"
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
        <Button onClick={onAdvance} className="w-full text-xs font-semibold py-2">
          {actionText}
        </Button>
      </div>
    </Card>
  );
}
