'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useParams, useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
  Restaurant,
  RestaurantTable,
  Coupon,
  CustomerMembership,
  LoyaltyAccount,
  OrderPricingSnapshot,
  Order,
} from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAuth } from '@/lib/context/auth-context';
import { formatCurrency, generateOrderNumber } from '@/lib/utils';
import {
  CreditCard,
  Banknote,
  Coins,
  Ticket,
  Award,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BellRing,
  UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function RestaurantCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantSlug = params?.restaurantSlug as string;

  const { profile, firebaseUser } = useAuth();
  const cartItems = useCartStore((s) => s.items);
  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const tableId = useCartStore((s) => s.tableId);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const setTableContext = useCartStore((s) => s.setTableContext);
  const clearCart = useCartStore((s) => s.clearCart);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [availableTables, setAvailableTables] = useState<RestaurantTable[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'CASH'>('RAZORPAY');

  // Loyalty & Membership & Coupon
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [membership, setMembership] = useState<CustomerMembership | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Authoritative Pricing Snapshot from Server
  const [pricingSnapshot, setPricingSnapshot] = useState<OrderPricingSnapshot | null>(null);
  const [calculatingPricing, setCalculatingPricing] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Load customer context and restaurant details
  useEffect(() => {
    async function loadData() {
      if (!restaurantSlug) return;
      try {
        const restSnap = await getDocs(
          query(collection(db, 'restaurants'), where('slug', '==', restaurantSlug), where('active', '==', true))
        );
        if (restSnap.empty) {
          setLoadingInitial(false);
          return;
        }

        const restData = { ...restSnap.docs[0].data(), id: restSnap.docs[0].id } as Restaurant;
        setRestaurant(restData);

        // Fetch tables for dine-in selection if not already chosen via QR
        const tableSnap = await getDocs(
          query(collection(db, 'tables'), where('restaurantId', '==', restData.id), where('active', '==', true))
        );
        const tblList: RestaurantTable[] = [];
        tableSnap.forEach((d) => tblList.push({ ...d.data(), id: d.id } as RestaurantTable));
        setAvailableTables(tblList);

        if (profile) {
          setCustomerName(profile.displayName || '');
          setCustomerEmail(profile.email || '');
          setCustomerPhone(profile.phone || '');

          // Load active customer membership
          const memSnap = await getDocs(
            query(
              collection(db, 'customerMemberships'),
              where('customerUid', '==', profile.uid),
              where('restaurantId', '==', restData.id),
              where('status', '==', 'ACTIVE')
            )
          );
          if (!memSnap.empty) {
            setMembership(memSnap.docs[0].data() as CustomerMembership);
          }

          // Load loyalty account
          const loyaltyDoc = await getDoc(doc(db, 'loyaltyAccounts', `${profile.uid}_${restData.id}`));
          if (loyaltyDoc.exists()) {
            setLoyaltyAccount(loyaltyDoc.data() as LoyaltyAccount);
          }
        }
      } catch (err) {
        console.error('Error loading checkout data:', err);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadData();
  }, [restaurantSlug, profile]);

  // Recalculate authoritative server pricing whenever items, coupon, or loyalty changes
  useEffect(() => {
    async function refreshPricing() {
      if (!restaurant || cartItems.length === 0) return;
      setCalculatingPricing(true);

      try {
        const res = await fetch('/api/payments/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            items: cartItems,
            orderType,
            couponCode: appliedCoupon?.code,
            loyaltyPointsToRedeem: pointsToRedeem,
            customerUid: firebaseUser?.uid,
          }),
        });

        const data = await res.json();
        if (data.pricing) {
          setPricingSnapshot(data.pricing);
        }
      } catch (e) {
        console.error('Failed to preview pricing:', e);
      } finally {
        setCalculatingPricing(false);
      }
    }

    refreshPricing();
  }, [restaurant, cartItems, orderType, appliedCoupon, pointsToRedeem, firebaseUser]);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim() || !restaurant) return;
    try {
      const code = couponCodeInput.toUpperCase().trim();
      const q = query(collection(db, 'coupons'), where('code', '==', code), where('active', '==', true));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error('Invalid or expired coupon code.');
        return;
      }

      const coup = { ...snap.docs[0].data(), id: snap.docs[0].id } as Coupon;
      if (coup.restaurantId && coup.restaurantId !== restaurant.id) {
        toast.error('This coupon is not valid for this restaurant branch.');
        return;
      }

      setAppliedCoupon(coup);
      toast.success(`Coupon "${code}" applied!`);
    } catch (e: any) {
      toast.error('Error applying coupon.');
    }
  };

  const handleProceedCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    if (cartItems.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    if (orderType === 'DINE_IN' && !tableId) {
      toast.error('Please select your dining table for dine-in service.');
      return;
    }

    if (!customerName || !customerEmail) {
      toast.error('Please provide your name and email.');
      return;
    }

    setSubmittingOrder(true);

    try {
      // Step 1: Request authoritative server order creation
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          items: cartItems,
          orderType,
          couponCode: appliedCoupon?.code,
          loyaltyPointsToRedeem: pointsToRedeem,
          customerUid: firebaseUser?.uid,
        }),
      });

      const orderInitData = await res.json();

      if (!res.ok || orderInitData.error) {
        toast.error(orderInitData.error || 'Failed to initialize order.');
        setSubmittingOrder(false);
        return;
      }

      const { razorpayOrderId, amount, currency, keyId, pricing, itemSnapshots, zeroPaymentNeeded } =
        orderInitData;

      // Scenario A: 100% covered by loyalty points or 0 payment required
      if (zeroPaymentNeeded || pricing.finalPayable <= 0) {
        const verifyRes = await fetch('/api/payments/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: 'zero_pay',
            razorpayPaymentId: 'zero_pay_id',
            razorpaySignature: 'zero_pay_sig',
            orderData: {
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              customerUid: firebaseUser?.uid,
              customerName,
              customerEmail,
              customerPhone,
              orderType,
              tableId,
              tableNumber,
              notes,
              source: 'ONLINE_WEB',
            },
            pricing,
            itemSnapshots,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          clearCart();
          toast.success('Order placed successfully!');
          router.push(`/r/${restaurant.slug}/orders/${verifyData.orderId}`);
          return;
        }
      }

      // Scenario B: Cash Payment at Table (Requirement 96)
      if (paymentMethod === 'CASH') {
        const orderNumber = generateOrderNumber();
        const orderRef = doc(collection(db, 'orders'));

        const newOrder: Order = {
          id: orderRef.id,
          orderNumber,
          restaurantId: restaurant.id,
          restaurantNameSnapshot: restaurant.name,
          customerUid: firebaseUser?.uid || 'guest_customer',
          customerName,
          customerEmail,
          customerPhone,
          source: 'ONLINE_WEB',
          orderType,
          tableId: tableId || undefined,
          tableNumberSnapshot: tableNumber || undefined,
          items: itemSnapshots,
          pricing,
          paymentStatus: 'UNPAID',
          orderStatus: 'PENDING',
          notes,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await setDoc(orderRef, newOrder);

        // Notify staff by creating a waiter service request (Requirement 36 & 96)
        if (tableId) {
          await addDoc(collection(db, 'serviceRequests'), {
            restaurantId: restaurant.id,
            tableId,
            tableNumber: tableNumber || 'Assigned',
            customerUid: firebaseUser?.uid,
            customerName,
            reason: 'Payment help',
            note: `Guest requested Cash Payment for Order ${orderNumber} (Payable: ${formatCurrency(pricing.finalPayable)})`,
            status: 'PENDING',
            createdAt: Date.now(),
          });
        }

        clearCart();
        toast.success('Order submitted! Please call or wait for your server to collect cash.');
        router.push(`/r/${restaurant.slug}/orders/${orderRef.id}`);
        return;
      }

      // Scenario C: Razorpay Online Payment Flow
      if (typeof window.Razorpay === 'undefined') {
        toast.error('Payment gateway is still loading. Please retry in a moment.');
        setSubmittingOrder(false);
        return;
      }

      const options = {
        key: keyId,
        amount,
        currency: currency || 'INR',
        name: 'The Copper Leaf',
        description: `Order at ${restaurant.name}`,
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderData: {
                  restaurantId: restaurant.id,
                  restaurantName: restaurant.name,
                  customerUid: firebaseUser?.uid,
                  customerName,
                  customerEmail,
                  customerPhone,
                  orderType,
                  tableId,
                  tableNumber,
                  notes,
                  source: 'ONLINE_WEB',
                },
                pricing,
                itemSnapshots,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              clearCart();
              toast.success('Payment verified & order confirmed!');
              router.push(`/r/${restaurant.slug}/orders/${verifyData.orderId}`);
            } else {
              toast.error(verifyData.error || 'Payment verification failed.');
            }
          } catch (e: any) {
            toast.error(e?.message || 'Error confirming payment.');
          } finally {
            setSubmittingOrder(false);
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#C8622A',
        },
        modal: {
          ondismiss: function () {
            setSubmittingOrder(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err?.message || 'Failed to proceed with checkout.');
      setSubmittingOrder(false);
    }
  };

  if (loadingInitial) {
    return (
      <CustomerShell currentSlug={restaurantSlug}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#C8622A]/20 border-t-[#C8622A] rounded-full animate-spin" />
        </div>
      </CustomerShell>
    );
  }

  if (cartItems.length === 0) {
    return (
      <CustomerShell currentSlug={restaurantSlug} restaurant={restaurant}>
        <div className="max-w-md mx-auto py-20 px-4 text-center">
          <UtensilsCrossed className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">Your Cart is Empty</h2>
          <p className="text-sm text-[#78716C] mt-2 mb-6">
            Please add dishes from the menu before proceeding to checkout.
          </p>
          <Link href={`/r/${restaurantSlug}/menu`}>
            <Button>Return to Menu</Button>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell currentSlug={restaurantSlug} restaurant={restaurant}>
      {/* Razorpay Checkout Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
            FINAL STEP
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] mt-1">
            Complete Your Dining Order
          </h1>
        </div>

        <form onSubmit={handleProceedCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Columns: Guest Info, Order Type & Discounts */}
          <div className="lg:col-span-7 space-y-6">
            {/* Dining Options Card */}
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">1. Service Type</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType('DINE_IN')}
                  className={`p-4 rounded-2xl border text-sm font-bold transition-all ${
                    orderType === 'DINE_IN'
                      ? 'border-[#C8622A] bg-[#FDF4ED] text-[#C8622A] shadow-sm'
                      : 'border-[#E8E0D5] bg-white text-[#78716C] hover:bg-[#FAF6F0]'
                  }`}
                >
                  Dine-In Service
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('TAKEAWAY')}
                  className={`p-4 rounded-2xl border text-sm font-bold transition-all ${
                    orderType === 'TAKEAWAY'
                      ? 'border-[#C8622A] bg-[#FDF4ED] text-[#C8622A] shadow-sm'
                      : 'border-[#E8E0D5] bg-white text-[#78716C] hover:bg-[#FAF6F0]'
                  }`}
                >
                  Takeaway Parcel
                </button>
              </div>

              {orderType === 'DINE_IN' && (
                <div className="mt-4 pt-4 border-t border-[#E8E0D5]">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1C1917] block mb-2">
                    Table Number
                  </label>
                  {tableNumber ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#FDF4ED] border border-[#E8E0D5] text-sm">
                      <span className="font-bold text-[#C8622A]">Seated at Table #{tableNumber}</span>
                      <button
                        type="button"
                        onClick={() => setTableContext(null, null)}
                        className="text-xs text-[#78716C] hover:text-[#C8622A] underline"
                      >
                        Change Table
                      </button>
                    </div>
                  ) : (
                    <select
                      onChange={(e) => {
                        const sel = availableTables.find((t) => t.id === e.target.value);
                        if (sel) setTableContext(sel.id, sel.tableNumber);
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-[#E8E0D5] bg-white text-sm text-[#1C1917] focus:outline-none"
                      required
                    >
                      <option value="">Select your table...</option>
                      {availableTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          Table #{t.tableNumber} ({t.floor} - {t.capacity} seats)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Guest Details */}
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">2. Guest Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#1C1917] block mb-1">Your Name</label>
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1C1917] block mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1C1917] block mb-1">
                  Phone (Optional)
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
                  Kitchen Notes / Dietary Requests
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please bring extra napkins, spice on the side..."
                  rows={2}
                  className="w-full rounded-xl border border-[#E8E0D5] p-3 text-sm focus:border-[#C8622A] focus:outline-none"
                />
              </div>
            </div>

            {/* Loyalty & Privilege Card */}
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">3. Privilege & Loyalty</h3>

              {membership && (
                <div className="p-3.5 rounded-2xl bg-[#FDF4ED] border border-[#E8E0D5] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-[#C8622A]" />
                    <div>
                      <span className="text-xs font-bold text-[#1C1917]">
                        {membership.planSnapshot.name} Member
                      </span>
                      <span className="block text-[11px] text-[#78716C]">
                        {membership.planSnapshot.discountPercent}% order discount +{' '}
                        {membership.planSnapshot.loyaltyMultiplier}x points
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Applied
                  </span>
                </div>
              )}

              {/* Loyalty Points Redemption */}
              {loyaltyAccount && loyaltyAccount.balance > 0 && (
                <div className="p-4 rounded-2xl border border-[#E8E0D5] bg-[#FAF6F0] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1C1917] flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-[#C8622A]" />
                      Loyalty Points Available:
                    </span>
                    <span className="font-bold text-[#C8622A]">{loyaltyAccount.balance} Pts (₹{loyaltyAccount.balance})</span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="number"
                      min={0}
                      max={loyaltyAccount.balance}
                      value={pointsToRedeem || ''}
                      onChange={(e) => setPointsToRedeem(Math.min(loyaltyAccount.balance, Number(e.target.value)))}
                      placeholder="Redeem points (1 pt = ₹1)"
                      className="h-10 px-3 rounded-xl border border-[#E8E0D5] bg-white text-xs text-[#1C1917] flex-1 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPointsToRedeem(Math.min(loyaltyAccount.balance, Math.floor(pricingSnapshot?.totalBeforeLoyalty || 0)))}
                      className="text-xs font-bold text-[#C8622A] hover:underline"
                    >
                      Use Max
                    </button>
                  </div>
                </div>
              )}

              {/* Coupon Code */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#1C1917] block mb-2">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    placeholder="Enter code e.g. WELCOME10"
                    className="uppercase"
                  />
                  <Button type="button" variant="outline" onClick={handleApplyCoupon}>
                    Apply
                  </Button>
                </div>
                {appliedCoupon && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Coupon {appliedCoupon.code} applied!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">4. Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                    paymentMethod === 'RAZORPAY'
                      ? 'border-[#C8622A] bg-[#FDF4ED]'
                      : 'border-[#E8E0D5] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="RAZORPAY"
                    checked={paymentMethod === 'RAZORPAY'}
                    onChange={() => setPaymentMethod('RAZORPAY')}
                    className="w-4 h-4 text-[#C8622A] focus:ring-[#C8622A]"
                  />
                  <CreditCard className="w-5 h-5 text-[#C8622A]" />
                  <div>
                    <div className="font-bold text-sm text-[#1C1917]">Online Payment</div>
                    <div className="text-[11px] text-[#78716C]">UPI, Cards, NetBanking</div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                    paymentMethod === 'CASH'
                      ? 'border-[#C8622A] bg-[#FDF4ED]'
                      : 'border-[#E8E0D5] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                    className="w-4 h-4 text-[#C8622A] focus:ring-[#C8622A]"
                  />
                  <Banknote className="w-5 h-5 text-[#C8622A]" />
                  <div>
                    <div className="font-bold text-sm text-[#1C1917]">Pay with Cash</div>
                    <div className="text-[11px] text-[#78716C]">Call waiter to table</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Review & Pricing Breakdown */}
          <div className="lg:col-span-5 sticky top-28 space-y-4">
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-xl space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#1C1917]">Order Breakdown</h3>

              {/* Items summary */}
              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1 border-b border-[#E8E0D5] pb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="truncate max-w-[200px] text-[#44403C]">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-semibold text-[#1C1917]">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calculated Pricing */}
              <div className="space-y-2 text-xs text-[#44403C]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">
                    {formatCurrency(pricingSnapshot?.subtotal || useCartStore.getState().getSubtotal())}
                  </span>
                </div>

                {pricingSnapshot?.membershipDiscount ? (
                  <div className="flex justify-between text-emerald-700">
                    <span>Membership Discount</span>
                    <span>-{formatCurrency(pricingSnapshot.membershipDiscount)}</span>
                  </div>
                ) : null}

                {pricingSnapshot?.couponDiscount ? (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon ({pricingSnapshot.couponCode})</span>
                    <span>-{formatCurrency(pricingSnapshot.couponDiscount)}</span>
                  </div>
                ) : null}

                {pricingSnapshot?.taxAmount ? (
                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span className="font-semibold">{formatCurrency(pricingSnapshot.taxAmount)}</span>
                  </div>
                ) : null}

                {pricingSnapshot?.chargesAmount ? (
                  <div className="flex justify-between">
                    <span>Charges</span>
                    <span className="font-semibold">{formatCurrency(pricingSnapshot.chargesAmount)}</span>
                  </div>
                ) : null}

                {pricingSnapshot?.loyaltyValueRedeemed ? (
                  <div className="flex justify-between text-[#C8622A]">
                    <span>Points Redeemed ({pricingSnapshot.loyaltyPointsRedeemed} pts)</span>
                    <span>-{formatCurrency(pricingSnapshot.loyaltyValueRedeemed)}</span>
                  </div>
                ) : null}

                <div className="pt-3 border-t-2 border-[#E8E0D5] flex justify-between text-lg font-bold text-[#1C1917]">
                  <span>Total Payable</span>
                  <span className="text-[#C8622A]">
                    {formatCurrency(
                      pricingSnapshot?.finalPayable !== undefined
                        ? pricingSnapshot.finalPayable
                        : useCartStore.getState().getSubtotal()
                    )}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                loading={submittingOrder || calculatingPricing}
                className="w-full h-12 text-base font-bold shadow-lg rounded-2xl mt-4"
              >
                {paymentMethod === 'RAZORPAY' ? 'Pay Online with Razorpay' : 'Confirm Cash Order'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </CustomerShell>
  );
}
