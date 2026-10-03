'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant, RestaurantTable, TableReservation } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { acquireTableLock, releaseTableLock } from '@/lib/services/table-lock-service';
import { generateReservationNumber, formatTime } from '@/lib/utils';
import { useAuth } from '@/lib/context/auth-context';
import {
  CalendarCheck,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function RestaurantBookingPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantSlug = params?.restaurantSlug as string;
  const { profile, firebaseUser } = useAuth();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [partySize, setPartySize] = useState<number>(2);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('19:00');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);

  // Time slots for same-day bookings: 12:00 to 21:30 (every 30 mins)
  const timeSlots = [
    '12:00', '12:30', '13:00', '13:30', '14:00',
    '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
  ];

  useEffect(() => {
    async function loadData() {
      if (!restaurantSlug) return;
      try {
        const restSnap = await getDocs(
          query(collection(db, 'restaurants'), where('slug', '==', restaurantSlug), where('active', '==', true))
        );
        if (restSnap.empty) {
          setLoading(false);
          return;
        }

        const restData = { ...restSnap.docs[0].data(), id: restSnap.docs[0].id } as Restaurant;
        setRestaurant(restData);

        // Fetch tables for this restaurant
        const tablesSnap = await getDocs(
          query(collection(db, 'tables'), where('restaurantId', '==', restData.id), where('active', '==', true))
        );
        const tableList: RestaurantTable[] = [];
        tablesSnap.forEach((d) => tableList.push({ ...d.data(), id: d.id } as RestaurantTable));
        setTables(tableList);

        if (profile) {
          setCustomerName(profile.displayName || '');
          setCustomerEmail(profile.email || '');
          setCustomerPhone(profile.phone || '');
        }
      } catch (err) {
        console.error('Error loading booking data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [restaurantSlug, profile]);

  // Clean up table lock if user leaves
  useEffect(() => {
    return () => {
      if (selectedTable && restaurant && firebaseUser) {
        releaseTableLock(restaurant.id, selectedTable.id, firebaseUser.uid);
      }
    };
  }, [selectedTable, restaurant, firebaseUser]);

  const handleSelectTable = async (table: RestaurantTable) => {
    if (table.status !== 'AVAILABLE') {
      toast.error(`Table #${table.tableNumber} is currently ${table.status.toLowerCase()}.`);
      return;
    }
    if (table.capacity < partySize) {
      toast.error(`Table #${table.tableNumber} seats up to ${table.capacity} guests. Please select a larger table.`);
      return;
    }

    const uid = firebaseUser?.uid || 'guest_booking_uid';
    const lockResult = await acquireTableLock(
      restaurant!.id,
      table.id,
      uid,
      'BOOKING',
      'booking_attempt'
    );

    if (!lockResult.success) {
      toast.error(lockResult.error || 'Could not place temporary hold on this table.');
      return;
    }

    setSelectedTable(table);
    setLockExpiresAt(lockResult.expiresAt || Date.now() + 10 * 60 * 1000);
    toast.success(`Table #${table.tableNumber} reserved for you for 10 minutes.`);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !selectedTable) return;
    if (!customerName || !customerEmail) {
      toast.error('Please provide your name and email address.');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const [hours, mins] = selectedTimeSlot.split(':').map(Number);
      const startAtDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
      const startAt = startAtDate.getTime();
      const endAt = startAt + 3 * 60 * 60 * 1000; // 3 hours duration

      const reservationNumber = generateReservationNumber();
      const resRef = doc(collection(db, 'tableReservations'));

      const newReservation: TableReservation = {
        id: resRef.id,
        reservationNumber,
        restaurantId: restaurant.id,
        tableId: selectedTable.id,
        tableNumberSnapshot: selectedTable.tableNumber,
        customerUid: firebaseUser?.uid || 'anonymous',
        customerName,
        email: customerEmail,
        phone: customerPhone || undefined,
        partySize,
        startAt,
        endAt,
        status: 'CONFIRMED',
        source: 'ONLINE_CUSTOMER',
        note: note.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(resRef, newReservation);

      // Update Table Status to RESERVED in Firestore
      const tableRef = doc(db, 'tables', selectedTable.id);
      await updateDoc(tableRef, {
        status: 'RESERVED',
        updatedAt: Date.now(),
      });

      // Release temporary lock
      if (firebaseUser) {
        await releaseTableLock(restaurant.id, selectedTable.id, firebaseUser.uid);
      }

      toast.success('Reservation confirmed!');
      router.push(`/r/${restaurant.slug}/bookings/${resRef.id}`);
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      toast.error(err?.message || 'Failed to complete booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleTables = tables.filter((t) => t.capacity >= partySize);

  return (
    <CustomerShell currentSlug={restaurantSlug} restaurant={restaurant}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF4ED] text-[#C8622A] text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SAME-DAY DINING RESERVATIONS</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] mb-2">
            Reserve Your Table
          </h1>
          <p className="text-sm text-[#78716C]">
            Select your preferred time, choose an available table from the floor layout, and confirm in seconds.
          </p>
        </div>

        {loading ? (
          <div className="h-96 rounded-3xl bg-white border border-[#E8E0D5] animate-pulse" />
        ) : tables.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-white p-12 text-center max-w-md mx-auto">
            <CalendarCheck className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
            <h3 className="font-serif text-xl font-bold text-[#1C1917]">No Tables Configured</h3>
            <p className="text-sm text-[#78716C] mt-2 mb-6">
              Dining room tables have not been configured for this branch yet.
            </p>
            <Link href={`/r/${restaurantSlug}/menu`}>
              <Button>Order Takeaway Instead</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Step 1 & 2: Slot Selection & Table Grid (Left) */}
            <div className="lg:col-span-7 space-y-8">
              {/* Party Size & Time Slot */}
              <div className="p-6 rounded-3xl border border-[#E8E0D5] bg-white shadow-sm space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1C1917] block mb-3">
                    1. Party Size
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPartySize(size);
                          setSelectedTable(null);
                        }}
                        className={`h-11 px-4 rounded-xl text-sm font-bold border transition-colors ${
                          partySize === size
                            ? 'border-[#C8622A] bg-[#C8622A] text-white shadow-sm'
                            : 'border-[#E8E0D5] bg-white text-[#1C1917] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        {size} {size === 1 ? 'Guest' : 'Guests'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1C1917] block mb-3">
                    2. Select Today&apos;s Arrival Time
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                          selectedTimeSlot === slot
                            ? 'border-[#C8622A] bg-[#FDF4ED] text-[#C8622A]'
                            : 'border-[#E8E0D5] bg-white text-[#1C1917] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#78716C] mt-2">
                    Reservations last for 3 hours. Please check in within 60 minutes of your selected time.
                  </p>
                </div>
              </div>

              {/* Table Selection Grid matching reference tables.png layout */}
              <div className="p-6 rounded-3xl border border-[#E8E0D5] bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                      3. Select an Available Table
                    </h3>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      Showing tables for {partySize} guests or more.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#C8622A]">
                    {eligibleTables.filter((t) => t.status === 'AVAILABLE').length} Available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {eligibleTables.map((table) => {
                    const isSelected = selectedTable?.id === table.id;
                    const isAvailable = table.status === 'AVAILABLE';

                    return (
                      <div
                        key={table.id}
                        onClick={() => isAvailable && handleSelectTable(table)}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? 'border-[#C8622A] bg-[#FDF4ED] shadow-md ring-2 ring-[#C8622A]'
                            : isAvailable
                            ? 'border-[#E8E0D5] bg-white hover:border-[#C8622A]/50 hover:bg-[#FAF6F0] cursor-pointer'
                            : 'border-[#E8E0D5] bg-[#F3ECE2]/40 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-serif font-bold text-base text-[#1C1917]">
                            Table #{table.tableNumber}
                          </span>
                          <StatusBadge status={table.status} size="sm" />
                        </div>

                        {/* Chair visual illustration */}
                        <div className="py-2 flex items-center justify-center">
                          <div className="w-24 h-12 rounded-xl border border-[#E8E0D5] bg-white flex items-center justify-center text-xs font-semibold text-[#78716C] shadow-inner">
                            {table.capacity} Seats
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#E8E0D5]/70 flex items-center justify-between text-[11px] text-[#78716C]">
                          <span>{table.floor || 'Dining Hall'}</span>
                          <span>{table.landmark || `${table.size} Table`}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 4: Reservation Confirmation Card (Right) */}
            <div className="lg:col-span-5 sticky top-28">
              <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-xl">
                <h3 className="font-serif text-xl font-bold text-[#1C1917] mb-4">
                  Reservation Summary
                </h3>

                {selectedTable ? (
                  <div className="mb-6 p-4 rounded-2xl bg-[#FDF4ED] border border-[#E8E0D5] space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-sm text-[#1C1917]">
                      <span>Table #{selectedTable.tableNumber}</span>
                      <span className="text-[#C8622A]">Held for 10 mins</span>
                    </div>
                    <div className="flex justify-between text-[#78716C]">
                      <span>Party Size:</span>
                      <span className="font-semibold text-[#1C1917]">{partySize} Guests</span>
                    </div>
                    <div className="flex justify-between text-[#78716C]">
                      <span>Arrival Time:</span>
                      <span className="font-semibold text-[#1C1917]">Today at {selectedTimeSlot}</span>
                    </div>
                    <div className="flex justify-between text-[#78716C]">
                      <span>Duration:</span>
                      <span className="font-semibold text-[#1C1917]">3 Hours (Complimentary)</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 rounded-2xl bg-[#FAF6F0] border border-dashed border-[#E8E0D5] text-center text-xs text-[#78716C]">
                    Please select an available table from the list.
                  </div>
                )}

                <form onSubmit={handleConfirmBooking} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#1C1917] block mb-1">
                      Guest Name
                    </label>
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1C1917] block mb-1">
                      Email Address (for confirmation)
                    </label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1C1917] block mb-1">
                      Phone Number (optional)
                    </label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1C1917] block mb-1">
                      Special Requests / Occasion
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Birthday celebration, anniversary, quiet table..."
                      rows={2}
                      className="w-full rounded-xl border border-[#E8E0D5] p-3 text-sm focus:border-[#C8622A] focus:outline-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!selectedTable}
                    loading={submitting}
                    className="w-full h-12 text-base font-bold shadow-lg rounded-2xl mt-2"
                  >
                    Confirm Reservation
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
