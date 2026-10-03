'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { TableReservation } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime, formatTime } from '@/lib/utils';
import { CalendarCheck, Clock, Users, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BookingDetailPage() {
  const params = useParams();
  const restaurantSlug = params?.restaurantSlug as string;
  const bookingId = params?.bookingId as string;

  const [booking, setBooking] = useState<TableReservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    const unsub = onSnapshot(doc(db, 'tableReservations', bookingId), (snap) => {
      if (snap.exists()) {
        setBooking({ ...snap.data(), id: snap.id } as TableReservation);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [bookingId]);

  if (loading) {
    return (
      <CustomerShell currentSlug={restaurantSlug}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#C8622A]/20 border-t-[#C8622A] rounded-full animate-spin" />
        </div>
      </CustomerShell>
    );
  }

  if (!booking) {
    return (
      <CustomerShell currentSlug={restaurantSlug}>
        <div className="max-w-md mx-auto py-20 px-4 text-center">
          <CalendarCheck className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">Booking Not Found</h2>
          <p className="text-sm text-[#78716C] mt-2 mb-6">
            We could not find a reservation matching this confirmation code.
          </p>
          <Link href={`/r/${restaurantSlug}/booking`}>
            <Button>Make a Reservation</Button>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell currentSlug={restaurantSlug}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-3xl border border-[#E8E0D5] bg-white p-8 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
            RESERVATION CONFIRMED
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1C1917] mt-1 mb-2">
            Table #{booking.tableNumberSnapshot} Reserved
          </h1>
          <p className="text-sm text-[#78716C] mb-6">
            We look forward to hosting you, <strong>{booking.customerName}</strong>! A confirmation
            email has been dispatched to {booking.email}.
          </p>

          <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E8E0D5] text-left space-y-3 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-[#78716C]">Booking Number:</span>
              <span className="font-mono font-bold text-[#1C1917]">{booking.reservationNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#78716C]">Arrival Time:</span>
              <span className="font-semibold text-[#1C1917]">{formatDateTime(booking.startAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#78716C]">Duration:</span>
              <span className="font-semibold text-[#1C1917]">
                3 Hours (until {formatTime(booking.endAt)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#78716C]">Party Size:</span>
              <span className="font-semibold text-[#1C1917]">{booking.partySize} Guests</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#78716C]">Check-In Status:</span>
              <StatusBadge status={booking.status} size="sm" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left mb-6 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              <strong>Arrival Window Notice:</strong> Please check in with the host upon arrival within
              60 minutes of your reservation time. The table will be held for your party.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/r/${restaurantSlug}/menu`} className="flex-1">
              <Button className="w-full">Browse Chef&apos;s Menu</Button>
            </Link>
            <Link href={`/r/${restaurantSlug}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Branch Details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}
