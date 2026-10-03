'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { CustomerShell } from '@/components/customer/customer-shell';
import { AccountNav } from '@/components/customer/account-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MembershipPlan, CustomerMembership } from '@/types/membership';
import { Crown, Check, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function MembershipPage() {
  const { user, profile } = useAuth();
  const { currentRestaurant, restaurants } = useRestaurant();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [activeMembership, setActiveMembership] = useState<CustomerMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);

  // Active restaurant ID: current restaurant or fallback to first available
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  useEffect(() => {
    async function loadData() {
      if (!activeRestaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Load available active plans for this restaurant
        const plansRef = collection(db, 'membershipPlans');
        const plansQ = query(
          plansRef,
          where('restaurantId', '==', activeRestaurantId),
          where('active', '==', true)
        );
        const plansSnap = await getDocs(plansQ);
        const loadedPlans: MembershipPlan[] = [];
        plansSnap.forEach(d => {
          loadedPlans.push({ id: d.id, ...d.data() } as MembershipPlan);
        });
        setPlans(loadedPlans.sort((a, b) => a.price - b.price));

        // Load customer's active membership if logged in
        if (user) {
          const memRef = collection(db, 'customerMemberships');
          const memQ = query(
            memRef,
            where('customerUid', '==', user.uid),
            where('restaurantId', '==', activeRestaurantId),
            where('status', '==', 'ACTIVE')
          );
          const memSnap = await getDocs(memQ);
          if (!memSnap.empty) {
            setActiveMembership({ id: memSnap.docs[0].id, ...memSnap.docs[0].data() } as CustomerMembership);
          } else {
            setActiveMembership(null);
          }
        }
      } catch (err) {
        console.error('Failed to load membership plans:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeRestaurantId, user]);

  const handlePurchase = async (plan: MembershipPlan) => {
    if (!user) {
      toast.error('Please sign in to purchase a membership');
      return;
    }

    setPurchasingPlanId(plan.id);

    try {
      // 1. Call server API to create Razorpay Order for membership
      const res = await fetch('/api/payments/razorpay/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          restaurantId: activeRestaurantId,
          customerUid: user.uid,
          customerName: profile?.displayName || user.displayName || 'Guest',
          customerEmail: profile?.email || user.email || '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to initiate membership payment');
      }

      // Check if Razorpay is loaded
      if (typeof window === 'undefined' || !window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: 'INR',
        name: currentRestaurant?.name || 'The Copper Leaf',
        description: `${plan.name} Membership (${plan.durationDays} Days)`,
        order_id: data.razorpayOrderId,
        handler: async (response: any) => {
          toast.success(`Welcome to ${plan.name} Club! Your membership is active.`);
          // Reload page data
          window.location.reload();
        },
        prefill: {
          name: profile?.displayName || user.displayName || '',
          email: profile?.email || user.email || '',
          contact: profile?.phone || '',
        },
        theme: {
          color: '#EA580C',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Membership purchase error:', err);
      toast.error(err.message || 'Payment initiation failed');
    } finally {
      setPurchasingPlanId(null);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            VIP Membership Club
          </h1>
          <p className="text-gray-600 mt-2">
            Unlock exclusive dining discounts, accelerated loyalty points, and complimentary culinary treats at{' '}
            <span className="font-semibold text-gray-900">{currentRestaurant?.name || 'our restaurant'}</span>.
          </p>
        </div>

        <AccountNav />

        {/* Current Active Membership Card */}
        {activeMembership && (
          <div className="mb-10 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 border-2 border-amber-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-2xl font-bold text-gray-900">
                      {activeMembership.planSnapshot.name} Tier
                    </h3>
                    <StatusBadge status="ACTIVE" />
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Valid until{' '}
                    <span className="font-medium text-gray-900">
                      {activeMembership.endsAt?.seconds
                        ? new Date(activeMembership.endsAt.seconds * 1000).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Active'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Order Discount</p>
                  <p className="text-xl font-bold text-primary">
                    {activeMembership.planSnapshot.discountPercent}% OFF
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Loyalty Earning</p>
                  <p className="text-xl font-bold text-amber-600">
                    {activeMembership.planSnapshot.loyaltyMultiplier}x Points
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Plans Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="No Membership Plans Available"
            description="Our management hasn't published any membership programs for this location yet. Check back soon for exclusive club benefits!"
          />
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const isCurrentPlan = activeMembership?.planId === plan.id;

                return (
                  <Card
                    key={plan.id}
                    className={`relative p-8 flex flex-col justify-between rounded-2xl border transition-all duration-300 hover:shadow-xl ${
                      isCurrentPlan
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full shadow">
                        Current Tier
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif text-2xl font-bold text-gray-900">{plan.name}</h3>
                        <div className="p-2.5 rounded-xl bg-orange-50 text-primary">
                          <Crown className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
                        <span className="text-sm font-medium text-gray-500">/ {plan.durationDays} days</span>
                      </div>

                      <div className="space-y-3.5 mb-8">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span>
                            <strong>{plan.discountPercent}% OFF</strong> on every dine-in and takeaway bill
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span>
                            <strong>{plan.loyaltyMultiplier}x</strong> Loyalty points on every rupee spent
                          </span>
                        </div>

                        {plan.freeDrinksEveryVisit && (
                          <div className="flex items-center gap-3 text-sm text-gray-700">
                            <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span>Complimentary welcome beverage on every table visit</span>
                          </div>
                        )}

                        {plan.customPerks && plan.customPerks.map((perk, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                            <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span>{perk}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={() => handlePurchase(plan)}
                      disabled={purchasingPlanId === plan.id || isCurrentPlan}
                      className="w-full py-6 text-base font-medium rounded-xl"
                      variant={isCurrentPlan ? 'outline' : 'default'}
                    >
                      {purchasingPlanId === plan.id
                        ? 'Initiating Secure Payment...'
                        : isCurrentPlan
                        ? 'Your Active Tier'
                        : `Join ${plan.name} Tier`}
                    </Button>
                  </Card>
                );
              })}
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-amber-900 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Fair Use & Restaurant Scope</p>
                  <p className="text-amber-800">
                    VIP Memberships are restaurant-location specific and automatically apply discounts to your online and at-table bills. Unused benefits expire with your tier duration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
