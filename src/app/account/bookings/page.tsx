'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { TableReservation } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { AccountNav } from '@/components/customer/account-nav';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/lib/context/auth-context';
import { formatDateTime, formatTime } from '@/lib/utils';
import { CalendarCheck, Clock, Users, ArrowRight } from 'lucide-react';

export default function CustomerBookingsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    async function fetchBookings() {
      try {
        const q = query(
          collection(db, 'tableReservations'),
          where('customerUid', '==', firebaseUser!.uid)
        );
        const snap = await getDocs(q);
        const list: TableReservation[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as TableReservation));
        list.sort((a, b) => b.startAt - a.startAt);
        setBookings(list);
      } catch (err) {
        console.warn('Error loading bookings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [firebaseUser]);

  return (
    <CustomerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <AccountNav />

          <main className="flex-1 w-full space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
                RESERVATIONS
              </span>
              <h1 className="font-serif text-3xl font-bold text-[#1C1917] mt-1">
                Your Table Bookings
              </h1>
            </div>

            {loading || authLoading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="rounded-3xl border border-[#E8E0D5] bg-white p-6 h-36 animate-pulse" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-white p-12 text-center">
                <CalendarCheck className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-30" />
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">No Reservations Found</h3>
                <p className="text-sm text-[#78716C] mt-2 mb-6">
                  You have not made any dining room reservations yet.
                </p>
                <Link href="/">
                  <Button>Reserve a Table</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((res) => (
                  <div
                    key={res.id}
                    className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8E0D5] gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                            Booking {res.reservationNumber}
                          </h3>
                          <StatusBadge status={res.status} size="sm" />
                        </div>
                        <p className="text-xs text-[#78716C] mt-1">
                          Table #{res.tableNumberSnapshot} • {res.partySize} Guests
                        </p>
                      </div>

                      <Link href={`/r/${res.restaurantId}/bookings/${res.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>

                    <div className="pt-4 flex items-center justify-between text-xs text-[#44403C]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#C8622A]" />
                        <span>
                          {formatDateTime(res.startAt)} (until {formatTime(res.endAt)})
                        </span>
                      </div>
                      <span className="text-[#78716C]">Same-Day Booking</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </CustomerShell>
  );
}
