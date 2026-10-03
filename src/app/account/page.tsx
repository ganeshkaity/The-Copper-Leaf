'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order, TableReservation, LoyaltyAccount, CustomerMembership } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { AccountNav } from '@/components/customer/account-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/auth-context';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  User,
  ShoppingBag,
  Coins,
  Award,
  Link as LinkIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerAccountOverviewPage() {
  const router = useRouter();
  const { profile, firebaseUser, loading, linkEmailAccount } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<TableReservation[]>([]);
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccount[]>([]);
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);

  // Account linking state for anonymous users
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linking, setLinking] = useState(false);
  const [showLinkingForm, setShowLinkingForm] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;

    async function loadAccountData() {
      try {
        // Fetch recent orders
        const ordersSnap = await getDocs(
          query(
            collection(db, 'orders'),
            where('customerUid', '==', firebaseUser!.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          )
        );
        const orderList: Order[] = [];
        ordersSnap.forEach((d) => orderList.push({ ...d.data(), id: d.id } as Order));
        setOrders(orderList);

        // Fetch bookings
        const bookSnap = await getDocs(
          query(
            collection(db, 'tableReservations'),
            where('customerUid', '==', firebaseUser!.uid),
            limit(3)
          )
        );
        const bookList: TableReservation[] = [];
        bookSnap.forEach((d) => bookList.push({ ...d.data(), id: d.id } as TableReservation));
        setBookings(bookList);

        // Fetch loyalty balances across branches
        const loyaltySnap = await getDocs(
          query(collection(db, 'loyaltyAccounts'), where('customerUid', '==', firebaseUser!.uid))
        );
        const loyaltyList: LoyaltyAccount[] = [];
        loyaltySnap.forEach((d) => loyaltyList.push({ ...d.data(), id: d.id } as LoyaltyAccount));
        setLoyaltyAccounts(loyaltyList);

        // Fetch active memberships
        const memSnap = await getDocs(
          query(
            collection(db, 'customerMemberships'),
            where('customerUid', '==', firebaseUser!.uid),
            where('status', '==', 'ACTIVE')
          )
        );
        const memList: CustomerMembership[] = [];
        memSnap.forEach((d) => memList.push({ ...d.data(), id: d.id } as CustomerMembership));
        setMemberships(memList);
      } catch (err) {
        console.warn('Error loading account overview:', err);
      }
    }

    loadAccountData();
  }, [firebaseUser]);

  if (loading) {
    return (
      <CustomerShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#C8622A]/20 border-t-[#C8622A] rounded-full animate-spin" />
        </div>
      </CustomerShell>
    );
  }

  if (!firebaseUser) {
    return (
      <CustomerShell>
        <div className="max-w-md mx-auto py-20 px-4 text-center">
          <User className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">Customer Sign In Required</h2>
          <p className="text-sm text-[#78716C] mt-2 mb-6">
            Please sign in to view your orders, bookings, loyalty points, and active memberships.
          </p>
          <Link href="/auth/sign-in">
            <Button size="lg" className="w-full">
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  const isAnonymous = firebaseUser.isAnonymous || profile?.accountType === 'anonymous';
  const totalPoints = loyaltyAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkEmail || !linkPassword) {
      toast.error('Please provide an email and password.');
      return;
    }
    setLinking(true);
    try {
      await linkEmailAccount(linkEmail, linkPassword);
      toast.success('Account upgraded successfully! Your order history and points are preserved.');
      setShowLinkingForm(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to link account.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <AccountNav />

          <main className="flex-1 space-y-6 w-full">
            {/* Header Profile Card */}
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#C8622A] text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-md">
                    {profile?.displayName?.slice(0, 1).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
                      {profile?.displayName || 'Valued Guest'}
                    </h1>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      {isAnonymous ? 'Guest Customer (Anonymous)' : profile?.email}
                    </p>
                  </div>
                </div>

                <Link href="/account/settings">
                  <Button variant="outline" size="sm" className='bg-black text-white'>
                    Edit Profile
                  </Button>
                </Link>
              </div>

              {/* Anonymous Account Linking Banner (Requirement 4) */}
              {isAnonymous && (
                <div className="mt-6 p-4 rounded-2xl bg-[#FDF4ED] border border-[#E8E0D5]">
                  <div className="flex items-start gap-3">
                    <LinkIcon className="w-5 h-5 text-[#C8622A] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block text-sm font-semibold text-[#1C1917]">
                        Link Your Guest Account Permanently
                      </strong>
                      <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">
                        You are currently browsing as a guest. Link an email and password to preserve
                        your points, re-order history, and active memberships across all devices.
                      </p>

                      {!showLinkingForm ? (
                        <Button
                          size="sm"
                          onClick={() => setShowLinkingForm(true)}
                          className="mt-3"
                        >
                          Create Permanent Password
                        </Button>
                      ) : (
                        <form onSubmit={handleLinkAccount} className="mt-4 space-y-3 max-w-sm">
                          <Input
                            type="email"
                            value={linkEmail}
                            onChange={(e) => setLinkEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                          />
                          <Input
                            type="password"
                            value={linkPassword}
                            onChange={(e) => setLinkPassword(e.target.value)}
                            placeholder="Create a strong password (min 6 chars)"
                            required
                          />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" loading={linking}>
                              Link Account
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowLinkingForm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/account/orders" className="block">
                <div className="rounded-2xl border border-[#E8E0D5] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between text-[#78716C] text-xs font-semibold mb-2">
                    <span>TOTAL ORDERS</span>
                    <ShoppingBag className="w-4 h-4 text-[#C8622A]" />
                  </div>
                  <div className="text-2xl font-bold text-[#1C1917]">{orders.length}</div>
                </div>
              </Link>

              <Link href="/account/points" className="block">
                <div className="rounded-2xl border border-[#E8E0D5] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between text-[#78716C] text-xs font-semibold mb-2">
                    <span>LOYALTY BALANCE</span>
                    <Coins className="w-4 h-4 text-[#C8622A]" />
                  </div>
                  <div className="text-2xl font-bold text-[#C8622A]">{totalPoints} Pts</div>
                </div>
              </Link>

              <Link href="/account/membership" className="block">
                <div className="rounded-2xl border border-[#E8E0D5] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between text-[#78716C] text-xs font-semibold mb-2">
                    <span>MEMBERSHIP</span>
                    <Award className="w-4 h-4 text-[#C8622A]" />
                  </div>
                  <div className="text-2xl font-bold text-[#1C1917]">
                    {memberships.length > 0 ? memberships[0].planSnapshot.name : 'Standard'}
                  </div>
                </div>
              </Link>
            </div>

            {/* Recent Orders Snapshot */}
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-lg text-[#1C1917]">Recent Dining Orders</h3>
                <Link
                  href="/account/orders"
                  className="text-xs font-bold text-[#C8622A] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#78716C]">
                  No orders placed yet. Select a branch and start exploring!
                </div>
              ) : (
                <div className="divide-y divide-[#E8E0D5]">
                  {orders.map((ord) => (
                    <div key={ord.id} className="py-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#1C1917] text-sm">
                          Order {ord.orderNumber}
                        </div>
                        <div className="text-[#78716C] mt-0.5">
                          {formatDateTime(ord.createdAt)} • {ord.orderType === 'DINE_IN' ? `Table ${ord.tableNumberSnapshot || 'Dine-In'}` : 'Takeaway'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-[#1C1917]">
                          {formatCurrency(ord.pricing.finalPayable)}
                        </div>
                        <Link
                          href={`/r/${ord.restaurantId}/orders/${ord.id}`}
                          className="text-[11px] font-semibold text-[#C8622A] hover:underline"
                        >
                          View Status &rarr;
                        </Link>
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
