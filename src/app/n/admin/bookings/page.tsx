'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
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
  getDocs,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { TableReservation, ReservationStatus } from '@/types/table';
import {
  CalendarCheck,
  Search,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBookingsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [bookings, setBookings] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const bookingsRef = collection(db, 'tableReservations');
    const q = query(
      bookingsRef,
      where('restaurantId', '==', activeRestaurantId),
      orderBy('startAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TableReservation[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as TableReservation);
        });
        setBookings(list);
        setLoading(false);
      },
      (err) => {
        console.error('Bookings streaming error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeRestaurantId]);

  const handleUpdateStatus = async (bookingId: string, newStatus: ReservationStatus) => {
    try {
      const payload: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      if (newStatus === 'CHECKED_IN') {
        payload.checkedInAt = serverTimestamp();
      } else if (newStatus === 'NO_SHOW') {
        payload.noShowAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'tableReservations', bookingId), payload);
      toast.success(`Reservation status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error('Failed to update reservation: ' + err.message);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.customerName?.toLowerCase().includes(q) ||
        b.reservationNumber?.toLowerCase().includes(q) ||
        b.phone?.includes(q) ||
        b.tableId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countConfirmed = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const countCheckedIn = bookings.filter((b) => b.status === 'CHECKED_IN').length;
  const countNoShow = bookings.filter((b) => b.status === 'NO_SHOW').length;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Table Reservations ({bookings.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Same-day reservations, guest check-in verification, and table holds.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest name, phone, table..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Reservations</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{bookings.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-amber-600 font-semibold uppercase">Confirmed & Awaiting</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{countConfirmed}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-emerald-600 font-semibold uppercase">Checked In & Seated</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{countCheckedIn}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-rose-600 font-semibold uppercase">No-Show / Cancelled</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{countNoShow}</p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 border-b border-[#E8E0D5] dark:border-[#2A2A33] pb-2">
          {['ALL', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                selectedStatus === st
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {st.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No Reservations Recorded"
            description="When diners book a table via the public portal or staff walk-in, the reservation records will stream here in real time."
          />
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b) => {
              const dateStr = b.startAt?.seconds
                ? new Date(b.startAt.seconds * 1000).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : typeof b.startAt === 'number'
                ? new Date(b.startAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Today';

              return (
                <Card
                  key={b.id}
                  className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-sm transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                        {b.customerName}
                      </span>
                      <span className="font-mono text-xs text-gray-400">#{b.reservationNumber}</span>
                      <StatusBadge status={b.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1 font-medium text-gray-800 dark:text-gray-200">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {b.partySize} Guests
                      </span>
                      <span>Table: {b.tableId}</span>
                      {b.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {b.phone}
                        </span>
                      )}
                    </div>

                    {b.note && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 italic pt-1">
                        Note: "{b.note}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {b.status === 'CONFIRMED' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(b.id, 'CHECKED_IN')}
                          className="text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Check-in Guest
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(b.id, 'NO_SHOW')}
                          className="text-xs text-rose-600 hover:text-rose-700"
                        >
                          Mark No-Show
                        </Button>
                      </>
                    )}

                    {b.status === 'CHECKED_IN' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                        className="text-xs"
                      >
                        Complete Dining
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
