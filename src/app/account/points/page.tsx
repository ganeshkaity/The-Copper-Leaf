'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { LoyaltyAccount, LoyaltyTransaction, CustomerMembership } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { AccountNav } from '@/components/customer/account-nav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/auth-context';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Coins, Award, ArrowUpRight, ArrowDownLeft, Sparkles, HelpCircle } from 'lucide-react';

export default function CustomerPointsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [membership, setMembership] = useState<CustomerMembership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    async function loadLoyalty() {
      try {
        // Fetch accounts
        const accSnap = await getDocs(
          query(collection(db, 'loyaltyAccounts'), where('customerUid', '==', firebaseUser!.uid))
        );
        const accList: LoyaltyAccount[] = [];
        accSnap.forEach((d) => accList.push({ ...d.data(), id: d.id } as LoyaltyAccount));
        setAccounts(accList);

        // Fetch transactions ledger
        const txSnap = await getDocs(
          query(
            collection(db, 'loyaltyTransactions'),
            where('customerUid', '==', firebaseUser!.uid),
            orderBy('createdAt', 'desc')
          )
        );
        const txList: LoyaltyTransaction[] = [];
        txSnap.forEach((d) => txList.push({ ...d.data(), id: d.id } as LoyaltyTransaction));
        setTransactions(txList);

        // Fetch active membership for multiplier info
        const memSnap = await getDocs(
          query(
            collection(db, 'customerMemberships'),
            where('customerUid', '==', firebaseUser!.uid),
            where('status', '==', 'ACTIVE')
          )
        );
        if (!memSnap.empty) {
          setMembership(memSnap.docs[0].data() as CustomerMembership);
        }
      } catch (err) {
        console.warn('Error loading loyalty data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLoyalty();
  }, [firebaseUser]);

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalEarned = accounts.reduce((sum, a) => sum + (a.lifetimeEarned || 0), 0);
  const totalRedeemed = accounts.reduce((sum, a) => sum + (a.lifetimeRedeemed || 0), 0);

  const currentMultiplier = membership ? membership.planSnapshot.loyaltyMultiplier : 1;

  return (
    <CustomerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <AccountNav />

          <main className="flex-1 w-full space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
                REWARDS & LOYALTY
              </span>
              <h1 className="font-serif text-3xl font-bold text-[#1C1917] mt-1">
                Your Loyalty Points
              </h1>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm">
                <span className="text-xs font-semibold text-[#78716C] block mb-1">
                  CURRENT BALANCE
                </span>
                <div className="text-3xl font-bold text-[#C8622A]">{totalBalance} Pts</div>
                <div className="text-xs text-[#78716C] mt-1">Value: ₹{totalBalance}</div>
              </div>

              <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm">
                <span className="text-xs font-semibold text-[#78716C] block mb-1">
                  LIFETIME EARNED
                </span>
                <div className="text-3xl font-bold text-emerald-700">+{totalEarned} Pts</div>
                <div className="text-xs text-[#78716C] mt-1">Earned on dining orders</div>
              </div>

              <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm">
                <span className="text-xs font-semibold text-[#78716C] block mb-1">
                  TOTAL REDEEMED
                </span>
                <div className="text-3xl font-bold text-[#1C1917]">{totalRedeemed} Pts</div>
                <div className="text-xs text-[#78716C] mt-1">Saved ₹{totalRedeemed} on bills</div>
              </div>
            </div>

            {/* Loyalty Earning Rule Explanatory Card (Requirement 16) */}
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                  How Earning Points Works
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E0D5]">
                  <strong className="block text-[#1C1917] font-bold text-sm mb-1">
                    Base Earning Rule
                  </strong>
                  <p className="text-[#78716C] leading-relaxed">
                    Earn <strong>1 point for every ₹50 spent</strong> on qualifying paid orders.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E0D5]">
                  <strong className="block text-[#1C1917] font-bold text-sm mb-1">
                    Redemption Value
                  </strong>
                  <p className="text-[#78716C] leading-relaxed">
                    <strong>1 Point = ₹1</strong> discount at checkout. Redeem anytime up to your order total.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FDF4ED] border border-[#E8E0D5]">
                  <strong className="block text-[#C8622A] font-bold text-sm mb-1">
                    Your Tier Multiplier: {currentMultiplier}x
                  </strong>
                  <p className="text-[#78716C] leading-relaxed">
                    {membership
                      ? `Boosted by your active ${membership.planSnapshot.name} membership!`
                      : 'Join a Silver, Gold, or Platinum plan to earn up to 5x points.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Ledger */}
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-[#1C1917] mb-4">Points Activity</h3>

              {transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#78716C]">
                  No points activity recorded yet. Points will be awarded upon completing your first order.
                </div>
              ) : (
                <div className="divide-y divide-[#E8E0D5]">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'EARNED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}
                        >
                          {tx.type === 'EARNED' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#1C1917]">{tx.description}</div>
                          <div className="text-[#78716C]">{formatDateTime(tx.createdAt)}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${
                            tx.points > 0 ? 'text-emerald-700' : 'text-orange-700'
                          }`}
                        >
                          {tx.points > 0 ? `+${tx.points}` : tx.points} Pts
                        </span>
                        <div className="text-[11px] text-[#78716C]">Balance: {tx.balanceAfter}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </CustomerShell>
  );
}
