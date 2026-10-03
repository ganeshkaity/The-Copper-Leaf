'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { StaffCommission } from '@/types/commission';
import { Percent, TrendingUp, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCommissionsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState('2.5');
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    async function loadCommissions() {
      if (!activeRestaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const ref = collection(db, 'staffCommissions');
        const q = query(
          ref,
          where('restaurantId', '==', activeRestaurantId),
          limit(50)
        );
        const snap = await getDocs(q);
        const list: StaffCommission[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as StaffCommission);
        });
        setCommissions(list);
      } catch (err) {
        console.error('Commissions load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCommissions();
  }, [activeRestaurantId]);

  const handleSaveCommissionRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId) return;

    setSavingRate(true);
    try {
      await updateDoc(doc(db, 'restaurants', activeRestaurantId), {
        'commissionSettings.defaultPercentage': parseFloat(commissionRate) || 0,
        updatedAt: serverTimestamp(),
      });
      toast.success('Commission policy updated');
    } catch (err: any) {
      toast.error('Failed to update commission rate');
    } finally {
      setSavingRate(false);
    }
  };

  const totalCommissionsPaid = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Staff Sales Commissions ({commissions.length})
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Incentivize front-of-house waitstaff on completed dining checks.
          </p>
        </div>

        {/* Global Rate Policy Card */}
        <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
              Waitstaff Commission Policy
            </h2>
          </div>

          <form onSubmit={handleSaveCommissionRate} className="flex items-center gap-3 max-w-md">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Default Commission on Completed Sales (%)
              </label>
              <Input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="2.5"
                step="0.1"
              />
            </div>
            <Button type="submit" disabled={savingRate} className="mt-5">
              {savingRate ? 'Updating...' : 'Update Policy'}
            </Button>
          </form>
        </Card>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : commissions.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No Commissions Calculated Yet"
            description="When assigned waiters complete and settle customer dining bills, eligible commission records will accrue here."
          />
        ) : (
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Staff Name</th>
                    <th className="pb-3">Order Number</th>
                    <th className="pb-3">Order Total</th>
                    <th className="pb-3">Rate</th>
                    <th className="pb-3 text-right">Commission Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#22222A]/50">
                      <td className="py-3 font-semibold text-gray-900 dark:text-white">
                        {c.staffName}
                      </td>
                      <td className="py-3 font-mono text-gray-500">#{c.orderNumber}</td>
                      <td className="py-3">₹{c.orderTotal}</td>
                      <td className="py-3 text-gray-500">{c.percentage}%</td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600">
                        ₹{c.commissionAmount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
