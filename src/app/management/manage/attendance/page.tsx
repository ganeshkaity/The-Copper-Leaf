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
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { StaffAttendance } from '@/types/attendance';
import { Clock, CheckCircle2, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function WaiterAttendancePage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const { profile, user } = useAuth();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [activeShift, setActiveShift] = useState<StaffAttendance | null>(null);
  const [pastShifts, setPastShifts] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAttendance = async () => {
    if (!user || !activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'staffAttendance');
      const q = query(
        ref,
        where('staffUid', '==', user.uid),
        where('restaurantId', '==', activeRestaurantId),
        orderBy('clockIn', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const list: StaffAttendance[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as StaffAttendance));

      // Check if there is an active shift without clockOut
      const active = list.find((s) => !s.clockOut);
      setActiveShift(active || null);
      setPastShifts(list.filter((s) => s.clockOut));
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user, activeRestaurantId]);

  const handleClockIn = async () => {
    if (!user || !activeRestaurantId) return;

    setActionLoading(true);
    try {
      await addDoc(collection(db, 'staffAttendance'), {
        staffUid: user.uid,
        staffName: profile?.displayName || user.displayName || user.email || 'Staff Member',
        restaurantId: activeRestaurantId,
        clockIn: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      toast.success('Clocked in successfully! Have a productive shift.');
      await fetchAttendance();
    } catch (err: any) {
      toast.error('Clock in failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;

    setActionLoading(true);
    try {
      const clockInTime = activeShift.clockIn?.seconds ? activeShift.clockIn.seconds * 1000 : Date.now();
      const diffMinutes = Math.max(1, Math.round((Date.now() - clockInTime) / 60000));

      await updateDoc(doc(db, 'staffAttendance', activeShift.id), {
        clockOut: serverTimestamp(),
        totalMinutes: diffMinutes,
        updatedAt: serverTimestamp(),
      });

      toast.success(`Clocked out! Shift logged (${Math.round(diffMinutes / 60)} hrs). Great job today!`);
      await fetchAttendance();
    } catch (err: any) {
      toast.error('Clock out failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <WaiterShell>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Shift Attendance Clock
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Clock in when arriving on the floor and clock out upon shift completion.
          </p>
        </div>

        {/* Big Action Clock In / Clock Out Card */}
        <Card className="p-8 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/40 text-primary flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>

          <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-white">
            {activeShift ? 'You are Currently On Shift' : 'You are Clocked Out'}
          </h2>

          <p className="text-xs text-gray-500 mt-1 mb-6">
            {activeShift
              ? `Shift commenced at ${
                  activeShift.clockIn?.seconds
                    ? new Date(activeShift.clockIn.seconds * 1000).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Just now'
                }`
              : 'Press below to start recording shift hours.'}
          </p>

          {activeShift ? (
            <Button
              onClick={handleClockOut}
              disabled={actionLoading}
              variant="destructive"
              className="px-8 py-3 text-sm font-bold rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {actionLoading ? 'Clocking Out...' : 'Clock Out of Shift'}
            </Button>
          ) : (
            <Button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="px-8 py-3 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {actionLoading ? 'Clocking In...' : 'Clock In for Shift'}
            </Button>
          )}
        </Card>

        {/* Past Shift Logs */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
            Recent Completed Shifts
          </h3>

          {loading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : pastShifts.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No previous shift records logged.</p>
          ) : (
            <div className="space-y-2">
              {pastShifts.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#18181D] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {s.clockIn?.seconds
                        ? new Date(s.clockIn.seconds * 1000).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'Shift'}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {s.clockIn?.seconds
                        ? new Date(s.clockIn.seconds * 1000).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}{' '}
                      —{' '}
                      {s.clockOut?.seconds
                        ? new Date(s.clockOut.seconds * 1000).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                  </div>

                  <span className="font-mono font-bold text-emerald-600">
                    {s.totalMinutes ? `${(s.totalMinutes / 60).toFixed(1)} hrs` : 'Completed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WaiterShell>
  );
}
