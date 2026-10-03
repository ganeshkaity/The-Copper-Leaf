'use client';

import React, { useEffect, useState } from 'react';
import { WaiterShell } from '@/components/layout/waiter-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { TableReservation, ReservationStatus } from '@/types/table';
import { CalendarCheck, Clock, Users, Phone, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function WaiterBookingsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [bookings, setBookings] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'tableReservations'),
      where('restaurantId', '==', activeRestaurantId),
      orderBy('startAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: TableReservation[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as TableReservation));
      setBookings(list);
      setLoading(false);
    });

    return () => unsub();
  }, [activeRestaurantId]);

  const handleCheckIn = async (booking: TableReservation) => {
    try {
      await updateDoc(doc(db, 'tableReservations', booking.id), {
        status: 'CHECKED_IN',
        checkedInAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success(`Guest ${booking.customerName} checked in for Table ${booking.tableId}`);
    } catch (err: any) {
      toast.error('Check-in failed');
    }
  };

  const filtered = bookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.customerName.toLowerCase().includes(q) ||
      b.reservationNumber.toLowerCase().includes(q) ||
      b.tableId.toLowerCase().includes(q)
    );
  });

  return (
    <WaiterShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Today's Table Reservations ({bookings.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Verify arriving diner names and perform guest check-in at the host stand.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reservation..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No Reservations for Today"
            description="All same-day reservations will stream live to this host list."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => {
              const time = b.startAt?.seconds
                ? new Date(b.startAt.seconds * 1000).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Today';

              return (
                <Card
                  key={b.id}
                  className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-sm transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-serif font-bold text-lg text-gray-900 dark:text-white">
                        {b.customerName}
                      </span>
                      <span className="font-mono text-xs text-gray-400">#{b.reservationNumber}</span>
                      <StatusBadge status={b.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1 font-semibold text-primary">
                        <Clock className="w-3.5 h-3.5" />
                        {time}
                      </span>
                      <span>Table: {b.tableId}</span>
                      <span>Party: {b.partySize} Guests</span>
                      {b.phone && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Phone className="w-3.5 h-3.5" />
                          {b.phone}
                        </span>
                      )}
                    </div>

                    {b.note && (
                      <p className="text-xs text-amber-600 italic mt-1">"{b.note}"</p>
                    )}
                  </div>

                  {b.status === 'CONFIRMED' && (
                    <Button
                      onClick={() => handleCheckIn(b)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Check-in Seated
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </WaiterShell>
  );
}
