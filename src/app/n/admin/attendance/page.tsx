'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { StaffAttendance } from '@/types/attendance';
import { Clock, UserCheck, Calendar } from 'lucide-react';

export default function AdminAttendancePage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [records, setRecords] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttendance() {
      if (!activeRestaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const ref = collection(db, 'staffAttendance');
        const q = query(
          ref,
          where('restaurantId', '==', activeRestaurantId),
          orderBy('clockIn', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        const list: StaffAttendance[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as StaffAttendance);
        });
        setRecords(list);
      } catch (err) {
        console.error('Attendance load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, [activeRestaurantId]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Staff Attendance & Shifts ({records.length})
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real clock-in and clock-out operational logs recorded by front-of-house and kitchen team members.
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : records.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No Attendance Logs Yet"
            description="When waiters and kitchen staff clock in or out from their mobile or terminal management interface, shift records will appear here."
          />
        ) : (
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Staff Name</th>
                    <th className="pb-3">Clock In</th>
                    <th className="pb-3">Clock Out</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {records.map((rec) => {
                    const inTime = rec.clockIn?.seconds
                      ? new Date(rec.clockIn.seconds * 1000).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A';

                    const outTime = rec.clockOut?.seconds
                      ? new Date(rec.clockOut.seconds * 1000).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'On Shift';

                    return (
                      <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-[#22222A]/50">
                        <td className="py-3 font-semibold text-gray-900 dark:text-white">
                          {rec.staffName || 'Staff Member'}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-300">{inTime}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-300">{outTime}</td>
                        <td className="py-3 text-gray-500">
                          {rec.totalMinutes ? `${Math.round(rec.totalMinutes / 60)} hrs` : 'Active'}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.clockOut
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 animate-pulse'
                            }`}
                          >
                            {rec.clockOut ? 'Completed' : 'On Shift'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
