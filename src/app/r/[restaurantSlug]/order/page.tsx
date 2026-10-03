'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant, RestaurantTable } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { acquireTableLock } from '@/lib/services/table-lock-service';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAuth } from '@/lib/context/auth-context';
import { QrCode, UtensilsCrossed, AlertCircle, ArrowRight, BellRing } from 'lucide-react';
import { toast } from 'sonner';

function QrTableOrderContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const restaurantSlug = params?.restaurantSlug as string;
  const tableIdParam = searchParams.get('tableId');

  const { firebaseUser } = useAuth();
  const setTableContext = useCartStore((s) => s.setTableContext);
  const setRestaurantContext = useCartStore((s) => s.setRestaurantContext);
  const forceSwitchRestaurant = useCartStore((s) => s.forceSwitchRestaurant);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lockedSuccessfully, setLockedSuccessfully] = useState(false);

  useEffect(() => {
    async function verifyAndLockTable() {
      if (!restaurantSlug || !tableIdParam) {
        setError('Invalid QR code scan. Missing restaurant or table identification.');
        setLoading(false);
        return;
      }

      try {
        // 1. Authoritative verification of restaurant
        const restSnap = await getDocs(
          query(collection(db, 'restaurants'), where('slug', '==', restaurantSlug), where('active', '==', true))
        );
        if (restSnap.empty) {
          setError('Restaurant location not found or currently inactive.');
          setLoading(false);
          return;
        }

        const restData = { ...restSnap.docs[0].data(), id: restSnap.docs[0].id } as Restaurant;
        setRestaurant(restData);

        // 2. Authoritative verification of table
        // tableIdParam could be either the document ID or tableNumber
        let tableDocSnap = await getDoc(doc(db, 'tables', tableIdParam));
        let tableData: RestaurantTable | null = null;

        if (tableDocSnap.exists()) {
          tableData = { ...tableDocSnap.data(), id: tableDocSnap.id } as RestaurantTable;
        } else {
          // Fallback: search by tableNumber in this restaurant
          const byNumberSnap = await getDocs(
            query(
              collection(db, 'tables'),
              where('restaurantId', '==', restData.id),
              where('tableNumber', '==', tableIdParam)
            )
          );
          if (!byNumberSnap.empty) {
            tableData = {
              ...byNumberSnap.docs[0].data(),
              id: byNumberSnap.docs[0].id,
            } as RestaurantTable;
          }
        }

        if (!tableData || tableData.restaurantId !== restData.id) {
          setError('This QR code does not belong to an active table in this restaurant branch.');
          setLoading(false);
          return;
        }

        setTable(tableData);

        // Check if table is occupied by another dining session
        if (tableData.status === 'OCCUPIED') {
          setError(
            `Table #${tableData.tableNumber} is currently occupied with an active dining session. If you are already seated here, you may call your waiter for assistance.`
          );
          setLoading(false);
          return;
        }

        if (tableData.status === 'BLOCKED' || tableData.status === 'CLEANING') {
          setError(`Table #${tableData.tableNumber} is currently ${tableData.status.toLowerCase()}. Please ask a team member for seating.`);
          setLoading(false);
          return;
        }

        // 3. Acquire 10-minute temporary table lock in RTDB
        const uid = firebaseUser?.uid || 'guest_table_scanner';
        const lockRes = await acquireTableLock(
          restData.id,
          tableData.id,
          uid,
          'QR_ORDER',
          `qr_session_${Date.now()}`
        );

        if (!lockRes.success) {
          setError(lockRes.error || 'This table is currently being ordered by another guest.');
          setLoading(false);
          return;
        }

        // Set cart store context authoritatively to this restaurant and table
        forceSwitchRestaurant(restData.id, restData.slug, restData.name);
        setTableContext(tableData.id, tableData.tableNumber);
        setLockedSuccessfully(true);

        toast.success(`Welcome to Table #${tableData.tableNumber}! 10-min order hold active.`);
      } catch (err: any) {
        console.error('Error verifying QR order:', err);
        setError(err?.message || 'Failed to verify table session.');
      } finally {
        setLoading(false);
      }
    }

    verifyAndLockTable();
  }, [restaurantSlug, tableIdParam, firebaseUser, forceSwitchRestaurant, setTableContext]);

  return (
    <CustomerShell currentSlug={restaurantSlug} restaurant={restaurant}>
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-[#C8622A]/20 border-t-[#C8622A] rounded-full animate-spin" />
            <p className="text-sm font-medium text-[#78716C]">
              Connecting to table #{tableIdParam}...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm text-left">
            <div className="flex items-center gap-3 text-red-700 font-bold text-lg mb-2">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <span>Table Verification Issue</span>
            </div>
            <p className="text-sm text-red-800 leading-relaxed mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/r/${restaurantSlug}/menu`}>
                <Button variant="outline" className="w-full">
                  Browse Takeaway Menu
                </Button>
              </Link>
              <Link href="/">
                <Button className="w-full">Back to Home</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-[#E8E0D5] bg-white p-8 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#FDF4ED] text-[#C8622A] flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
              TABLE SENSING VERIFIED
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1C1917] mt-1 mb-2">
              Welcome to Table #{table?.tableNumber}
            </h1>
            <p className="text-sm text-[#78716C] mb-6">
              You are seated at <strong>{restaurant?.name}</strong> ({table?.floor || 'Main Hall'}).
              A 10-minute order session has been reserved exclusively for your device.
            </p>

            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E0D5] mb-6 flex justify-around text-xs">
              <div>
                <span className="text-[#78716C] block">Status</span>
                <span className="font-bold text-emerald-700">Ordering Active</span>
              </div>
              <div>
                <span className="text-[#78716C] block">Hold Duration</span>
                <span className="font-bold text-[#C8622A]">10 Minutes</span>
              </div>
              <div>
                <span className="text-[#78716C] block">Table Capacity</span>
                <span className="font-bold text-[#1C1917]">{table?.capacity} Guests</span>
              </div>
            </div>

            <Link href={`/r/${restaurantSlug}/menu`}>
              <Button size="lg" className="w-full h-12 text-base font-bold shadow-lg">
                <span>Browse Menu & Order Now</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

export default function QrTableOrderPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Connecting to Table Session...</div>}>
      <QrTableOrderContent />
    </React.Suspense>
  );
}
