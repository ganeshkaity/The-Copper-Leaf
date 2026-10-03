'use client';

import React, { useEffect, useState } from 'react';
import { WaiterShell } from '@/components/layout/waiter-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { useAuth } from '@/lib/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { ServiceRequest } from '@/types/service-request';
import {
  BellRing,
  CheckCircle2,
  Clock,
  Droplet,
  Receipt,
  HelpCircle,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function WaiterRequestsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const { profile, user } = useAuth();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const reqQ = query(
      collection(db, 'serviceRequests'),
      where('restaurantId', '==', activeRestaurantId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(reqQ, (snap) => {
      const list: ServiceRequest[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServiceRequest));
      setRequests(list);
      setLoading(false);
    });

    return () => unsub();
  }, [activeRestaurantId]);

  const handleMarkHandled = async (reqId: string) => {
    try {
      await updateDoc(doc(db, 'serviceRequests', reqId), {
        status: 'HANDLED',
        handledAt: serverTimestamp(),
        handledBy: profile?.displayName || user?.email || 'Staff Waiter',
      });
      toast.success('Customer request marked handled');
    } catch (err: any) {
      toast.error('Failed to update request');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const handledRequests = requests.filter((r) => r.status === 'HANDLED');

  return (
    <WaiterShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <BellRing className="w-7 h-7 text-primary" />
            Table Service Calls ({pendingRequests.length} Active)
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time notifications sent by dining patrons requesting assistance, water refills, or paper checks.
          </p>
        </div>

        {/* Pending Urgent Requests */}
        <div className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
            Awaiting Staff Response
          </h2>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All Table Calls Handled"
              description="No customers are currently waiting for service assistance."
            />
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => {
                const time = req.createdAt?.seconds
                  ? new Date(req.createdAt.seconds * 1000).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Just now';

                return (
                  <Card
                    key={req.id}
                    className="p-5 rounded-2xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                        {req.tableId}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-base text-gray-900 dark:text-white">
                            Table {req.tableId}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                            {req.reason}
                          </span>
                        </div>

                        {req.note && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-0.5">
                            "{req.note}"
                          </p>
                        )}

                        <p className="text-[11px] text-gray-400 mt-1">Called at {time}</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleMarkHandled(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Mark Attended
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently Handled History */}
        {handledRequests.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wider">
              Recently Handled ({handledRequests.length})
            </h3>

            <div className="space-y-2">
              {handledRequests.slice(0, 5).map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#22222A]/50 flex items-center justify-between text-xs text-gray-500"
                >
                  <div>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      Table {req.tableId}
                    </span>{' '}
                    — {req.reason}
                  </div>
                  <span>Handled by {req.handledBy || 'Staff'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WaiterShell>
  );
}
