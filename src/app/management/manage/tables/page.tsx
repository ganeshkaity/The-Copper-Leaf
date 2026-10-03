'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WaiterShell } from '@/components/layout/waiter-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { useAuth } from '@/lib/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Table, TableStatus } from '@/types/table';
import { TableReservation } from '@/types/table';
import {
  LayoutGrid,
  Users,
  MapPin,
  Clock,
  Laptop,
  CheckCircle2,
  Combine,
  Sparkles,
  ArrowRightLeft,
  Brush,
} from 'lucide-react';
import { toast } from 'sonner';

export default function WaiterTablesPage() {
  const router = useRouter();
  const { currentRestaurant, restaurants } = useRestaurant();
  const { profile, user } = useAuth();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Walk-in modal
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [guestCount, setGuestCount] = useState('2');
  const [guestName, setGuestName] = useState('Walk-in Diner');
  const [seatingWalkIn, setSeatingWalkIn] = useState(false);

  // Table Move / Merge modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetTableId, setTargetTableId] = useState('');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // 1. Real-time Tables
    const tabQ = query(
      collection(db, 'tables'),
      where('restaurantId', '==', activeRestaurantId)
    );
    const unsubTables = onSnapshot(tabQ, (snap) => {
      const list: Table[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Table));
      setTables(list.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })));
      setLoading(false);
    });

    // 2. Real-time Reservations
    const resQ = query(
      collection(db, 'tableReservations'),
      where('restaurantId', '==', activeRestaurantId),
      where('status', '==', 'CONFIRMED')
    );
    const unsubRes = onSnapshot(resQ, (snap) => {
      const list: TableReservation[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as TableReservation));
      setReservations(list);
    });

    return () => {
      unsubTables();
      unsubRes();
    };
  }, [activeRestaurantId]);

  const handleSeatWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !activeRestaurantId) return;

    setSeatingWalkIn(true);
    try {
      // 1. Create a dining session
      const sessionRef = await addDoc(collection(db, 'diningSessions'), {
        restaurantId: activeRestaurantId,
        tableIds: [selectedTable.tableNumber],
        guestCount: parseInt(guestCount) || 2,
        guestName: guestName.trim() || 'Walk-in Guest',
        status: 'ACTIVE',
        assignedWaiterId: user?.uid,
        startedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // 2. Mark table OCCUPIED
      await updateDoc(doc(db, 'tables', selectedTable.id), {
        status: 'OCCUPIED',
        activeSessionId: sessionRef.id,
        updatedAt: serverTimestamp(),
      });

      toast.success(`Guests seated at Table ${selectedTable.tableNumber}`);
      setIsWalkInModalOpen(false);
      router.push(`/management/manage/pos?tableId=${selectedTable.tableNumber}`);
    } catch (err: any) {
      toast.error('Failed to seat walk-in: ' + err.message);
    } finally {
      setSeatingWalkIn(false);
    }
  };

  const handleUpdateStatus = async (table: Table, nextStatus: TableStatus) => {
    try {
      await updateDoc(doc(db, 'tables', table.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Table ${table.tableNumber} is now ${nextStatus}`);
    } catch (err: any) {
      toast.error('Failed to update table status');
    }
  };

  const handleMergeTables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !targetTableId || !activeRestaurantId) return;

    setMerging(true);
    try {
      const target = tables.find((t) => t.id === targetTableId);
      if (!target) throw new Error('Target table not found');

      // Create merged dining session
      await addDoc(collection(db, 'diningSessions'), {
        restaurantId: activeRestaurantId,
        tableIds: [selectedTable.tableNumber, target.tableNumber],
        status: 'ACTIVE',
        merged: true,
        assignedWaiterId: user?.uid,
        startedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // Mark both tables OCCUPIED
      await updateDoc(doc(db, 'tables', selectedTable.id), {
        status: 'OCCUPIED',
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'tables', target.id), {
        status: 'OCCUPIED',
        updatedAt: serverTimestamp(),
      });

      toast.success(`Tables ${selectedTable.tableNumber} & ${target.tableNumber} merged successfully!`);
      setIsMergeModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to merge tables');
    } finally {
      setMerging(false);
    }
  };

  return (
    <WaiterShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Dining Tables & Floor Status
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Live seat occupancy, walk-in guest check-ins, table merging, and turnover management.
            </p>
          </div>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : tables.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No Tables Configured"
            description="Tables must be generated by the Administrator in Table Management or the initial Setup Wizard."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => {
              const hasConfirmedReservation = reservations.some((r) => r.tableId === table.tableNumber);

              return (
                <Card
                  key={table.id}
                  className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-serif text-2xl font-bold text-gray-900 dark:text-white">
                        {table.tableNumber}
                      </span>
                      <StatusBadge status={table.status} />
                    </div>

                    <div className="space-y-1 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>Capacity: {table.capacity} Guests</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{table.floor} • {table.section}</span>
                      </div>
                      {hasConfirmedReservation && (
                        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Reserved today
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    {table.status === 'AVAILABLE' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTable(table);
                            setGuestCount(table.capacity.toString());
                            setIsWalkInModalOpen(true);
                          }}
                          className="w-full text-xs"
                        >
                          Seat Walk-in
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTable(table);
                            setIsMergeModalOpen(true);
                          }}
                          className="px-2 text-xs"
                          title="Merge with adjacent table"
                        >
                          <Combine className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    {(table.status === 'OCCUPIED' || table.status === 'PLACING_ORDER') && (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/management/manage/pos?tableId=${table.tableNumber}`}
                          className="flex-1"
                        >
                          <Button size="sm" className="w-full text-xs">
                            <Laptop className="w-3.5 h-3.5 mr-1" />
                            Open POS
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(table, 'CLEANING')}
                          className="px-2 text-xs text-yellow-600"
                          title="Mark for bussing / cleaning"
                        >
                          <Brush className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    {table.status === 'CLEANING' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(table, 'AVAILABLE')}
                        className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Mark Clean & Ready
                      </Button>
                    )}

                    {table.status === 'RESERVED' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(table, 'OCCUPIED')}
                        className="w-full text-xs"
                      >
                        Check-in Seated
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Seat Walk-in Guests */}
        <Modal
          isOpen={isWalkInModalOpen}
          onClose={() => setIsWalkInModalOpen(false)}
          title={`Seat Walk-in at Table ${selectedTable?.tableNumber || ''}`}
        >
          <form onSubmit={handleSeatWalkIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Number of Guests
              </label>
              <Input
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                min="1"
                max="20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Primary Guest Name (Optional)
              </label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Walk-in Diner"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWalkInModalOpen(false)}
                disabled={seatingWalkIn}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={seatingWalkIn}>
                {seatingWalkIn ? 'Opening Session...' : 'Seat & Open POS'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Merge Tables */}
        <Modal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          title={`Merge Table ${selectedTable?.tableNumber || ''}`}
        >
          <form onSubmit={handleMergeTables} className="space-y-4">
            <p className="text-xs text-gray-500">
              Select an adjacent available table to combine with Table {selectedTable?.tableNumber}. Both tables will be linked under one shared dining session.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Merge With
              </label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
                required
              >
                <option value="">Select table...</option>
                {tables
                  .filter((t) => t.id !== selectedTable?.id && t.status === 'AVAILABLE')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tableNumber} ({t.capacity} seats • {t.section})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMergeModalOpen(false)}
                disabled={merging}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={merging}>
                {merging ? 'Merging...' : 'Merge Tables'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </WaiterShell>
  );
}
