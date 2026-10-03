'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { LoyaltyAccount, LoyaltyTransaction } from '@/types/loyalty';
import {
  Coins,
  Sparkles,
  TrendingUp,
  Settings,
  Plus,
  Minus,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLoyaltyPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseSpend, setBaseSpend] = useState('50');
  const [pointValue, setPointValue] = useState('1');
  const [savingSettings, setSavingSettings] = useState(false);

  // Adjustment modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<LoyaltyAccount | null>(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('Courtesy Goodwill Credit');
  const [isCredit, setIsCredit] = useState(true);
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const fetchLoyaltyData = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const accountsRef = collection(db, 'loyaltyAccounts');
      const q = query(
        accountsRef,
        where('restaurantId', '==', activeRestaurantId),
        limit(50)
      );
      const snap = await getDocs(q);
      const list: LoyaltyAccount[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as LoyaltyAccount);
      });
      setAccounts(list.sort((a, b) => b.balance - a.balance));
    } catch (err) {
      console.error('Failed to load loyalty accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, [activeRestaurantId]);

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId) return;

    setSavingSettings(true);
    try {
      // Store in siteSettings or restaurant document
      const restRef = doc(db, 'restaurants', activeRestaurantId);
      await updateDoc(restRef, {
        'loyaltyRules.baseSpendAmount': parseFloat(baseSpend) || 50,
        'loyaltyRules.pointValueInINR': parseFloat(pointValue) || 1,
        updatedAt: serverTimestamp(),
      });
      toast.success('Loyalty earning rules updated');
    } catch (err: any) {
      toast.error('Failed to update rules: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenAdjust = (acc: LoyaltyAccount) => {
    setSelectedAccount(acc);
    setAdjustPoints('');
    setAdjustReason('Courtesy Goodwill Credit');
    setIsCredit(true);
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !activeRestaurantId) return;

    const pointsNum = parseInt(adjustPoints) || 0;
    if (pointsNum <= 0) {
      toast.error('Please enter a valid points amount');
      return;
    }

    setSavingAdjustment(true);
    try {
      const finalDelta = isCredit ? pointsNum : -pointsNum;
      const newBalance = Math.max(0, (selectedAccount.balance || 0) + finalDelta);

      // 1. Update Account balance
      await updateDoc(doc(db, 'loyaltyAccounts', selectedAccount.id), {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });

      // 2. Add durable transaction ledger record
      await addDoc(collection(db, 'loyaltyTransactions'), {
        customerUid: selectedAccount.customerUid,
        restaurantId: activeRestaurantId,
        type: isCredit ? 'CREDIT' : 'DEBIT',
        points: pointsNum,
        balanceAfter: newBalance,
        referenceType: 'MANUAL_ADJUSTMENT',
        description: adjustReason.trim(),
        createdAt: serverTimestamp(),
      });

      toast.success(`Account adjusted by ${isCredit ? '+' : '-'}${pointsNum} pts`);
      setIsAdjustModalOpen(false);
      await fetchLoyaltyData();
    } catch (err: any) {
      toast.error('Failed to adjust points: ' + err.message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Loyalty Points Program
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure points earning ratios, customer balances, and ledger adjustments for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'All Locations'}
              </span>
            </p>
          </div>
        </div>

        {/* Global Earning Rule Settings */}
        <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-amber-500" />
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
              Points Earning & Redemption Rules
            </h2>
          </div>

          <form onSubmit={handleSaveRules} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Base Spend per 1 Point (₹)
              </label>
              <Input
                type="number"
                value={baseSpend}
                onChange={(e) => setBaseSpend(e.target.value)}
                placeholder="50"
              />
              <p className="text-[11px] text-gray-400 mt-1">e.g. ₹50 spent = 1 point</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Point Redemption Value (₹)
              </label>
              <Input
                type="number"
                value={pointValue}
                onChange={(e) => setPointValue(e.target.value)}
                placeholder="1"
              />
              <p className="text-[11px] text-gray-400 mt-1">1 point = ₹1 discount</p>
            </div>

            <Button type="submit" disabled={savingSettings} className="w-full sm:w-auto">
              {savingSettings ? 'Saving...' : 'Update Rules'}
            </Button>
          </form>
        </Card>

        {/* Customer Balances Ledger */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
            Customer Loyalty Accounts ({accounts.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No Loyalty Accounts on Record"
              description="Points are automatically awarded to customers after completed paid orders."
            />
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <Card
                  key={acc.id}
                  className="p-4 rounded-xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 font-bold flex items-center justify-center text-xs">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                        User: {acc.customerUid.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        Lifetime: {acc.lifetimeEarned || 0} earned • {acc.lifetimeRedeemed || 0} redeemed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-base font-bold text-amber-600">
                        {acc.balance} pts
                      </span>
                      <span className="text-xs text-gray-400 block">≈ ₹{acc.balance}</span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAdjust(acc)}
                      className="text-xs"
                    >
                      Adjust Points
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Adjust Customer Points */}
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="Manual Loyalty Points Adjustment"
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            <p className="text-xs text-gray-500">
              Current balance: <strong className="text-amber-600">{selectedAccount?.balance || 0} pts</strong>. All manual adjustments are recorded into the immutable transaction ledger.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsCredit(true)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  isCredit
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Credit Points
              </button>

              <button
                type="button"
                onClick={() => setIsCredit(false)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  !isCredit
                    ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <Minus className="w-3.5 h-3.5" /> Debit / Deduct
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Points Amount
              </label>
              <Input
                type="number"
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="e.g. 50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Reason / Note for Ledger
              </label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Courtesy goodwill, birthday gift, or audit correction..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdjustModalOpen(false)}
                disabled={savingAdjustment}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingAdjustment}>
                {savingAdjustment ? 'Adjusting...' : 'Save Adjustment'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
