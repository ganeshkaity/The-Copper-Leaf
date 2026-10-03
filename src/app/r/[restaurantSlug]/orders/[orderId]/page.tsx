'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order, OrderStatus } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  BellRing,
  Utensils,
  ShoppingBag,
  Sparkles,
  PhoneCall,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrderTrackingPage() {
  const params = useParams();
  const restaurantSlug = params?.restaurantSlug as string;
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [callingWaiter, setCallingWaiter] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Real-time snapshot listener on order
    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId),
      (snap) => {
        if (snap.exists()) {
          setOrder({ ...snap.data(), id: snap.id } as Order);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to order:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  const handleCallWaiter = async (reason: string) => {
    if (!order || !order.tableId) {
      toast.error('Assistance calls are available for seated dine-in tables.');
      return;
    }

    setCallingWaiter(true);
    try {
      await addDoc(collection(db, 'serviceRequests'), {
        restaurantId: order.restaurantId,
        tableId: order.tableId,
        tableNumber: order.tableNumberSnapshot || 'Table',
        customerUid: order.customerUid,
        customerName: order.customerName,
        reason,
        note: `Customer from Order ${order.orderNumber} called server.`,
        status: 'PENDING',
        createdAt: Date.now(),
      });
      toast.success(`Server notified: "${reason}". Someone will arrive shortly!`);
    } catch (e: any) {
      toast.error('Could not alert server. Please notify a team member directly.');
    } finally {
      setCallingWaiter(false);
    }
  };

  const steps: { status: OrderStatus; label: string; icon: any }[] = [
    { status: 'PENDING', label: 'Order Placed', icon: Clock },
    { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
    { status: 'PREPARING', label: 'In Kitchen', icon: ChefHat },
    {
      status: 'READY',
      label: order?.orderType === 'TAKEAWAY' ? 'Ready for Pickup' : 'Ready to Serve',
      icon: BellRing,
    },
    { status: 'SERVED', label: 'Delivered to Table', icon: Utensils },
    { status: 'COMPLETED', label: 'Completed', icon: Sparkles },
  ];

  const getStepIndex = (currentStatus?: OrderStatus) => {
    switch (currentStatus) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'PREPARING':
        return 2;
      case 'READY':
        return 3;
      case 'SERVED':
        return 4;
      case 'COMPLETED':
        return 5;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <CustomerShell currentSlug={restaurantSlug}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#C8622A]/20 border-t-[#C8622A] rounded-full animate-spin" />
        </div>
      </CustomerShell>
    );
  }

  if (!order) {
    return (
      <CustomerShell currentSlug={restaurantSlug}>
        <div className="max-w-md mx-auto py-20 px-4 text-center">
          <ShoppingBag className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
          <h2 className="font-serif text-2xl font-bold text-[#1C1917]">Order Not Found</h2>
          <p className="text-sm text-[#78716C] mt-2 mb-6">
            We could not locate this order reference in our dining records.
          </p>
          <Link href={`/r/${restaurantSlug}/menu`}>
            <Button>Back to Menu</Button>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  const currentStep = getStepIndex(order.orderStatus);

  return (
    <CustomerShell currentSlug={restaurantSlug}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-xs text-[#78716C] mb-1">
              Live Order Status • {formatDateTime(order.createdAt)}
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#1C1917]">
              Order {order.orderNumber}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.orderStatus} />
            <StatusBadge status={order.paymentStatus} />
          </div>
        </div>

        {/* Cash payment instruction banner */}
        {order.paymentStatus === 'UNPAID' && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
            <PhoneCall className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Cash Payment Pending</strong>
              <span>
                Please have {formatCurrency(order.pricing.finalPayable)} ready. Our team has received
                your cash request and will collect payment at your table.
              </span>
            </div>
          </div>
        )}

        {/* Real-time Order Progress Timeline */}
        <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 sm:p-8 shadow-sm mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#78716C] mb-6">
            Order Progress
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.status} className="flex flex-col items-center text-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-[#C8622A] text-white ring-4 ring-[#C8622A]/20 scale-105 shadow-md'
                        : 'bg-[#F3ECE2] text-[#78716C]'
                    }`}
                  >
                    {isPast ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? 'text-[#C8622A]'
                        : isPast
                        ? 'text-emerald-700'
                        : 'text-[#78716C]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Order Snapshot Items List */}
          <div className="md:col-span-7 rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1C1917]">Prepared Items</h3>
            <div className="divide-y divide-[#E8E0D5]">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-3 flex justify-between items-start text-sm">
                  <div>
                    <span className="font-bold text-[#1C1917]">
                      {item.quantity}x {item.nameSnapshot}
                    </span>
                    {item.variantSnapshot && (
                      <div className="text-xs text-[#78716C]">
                        Portion: {item.variantSnapshot.name}
                      </div>
                    )}
                    {item.modifierSnapshot && item.modifierSnapshot.length > 0 && (
                      <div className="text-xs text-[#C8622A]">
                        Addons: {item.modifierSnapshot.map((m) => m.name).join(', ')}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-xs text-[#78716C] italic mt-0.5">
                        &ldquo;{item.specialInstructions}&rdquo;
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-[#1C1917]">
                    {formatCurrency(item.unitPriceSnapshot * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Pricing Snapshot */}
            <div className="pt-4 border-t-2 border-[#E8E0D5] space-y-2 text-xs text-[#44403C]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(order.pricing.subtotal)}</span>
              </div>
              {order.pricing.couponDiscount ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount</span>
                  <span>-{formatCurrency(order.pricing.couponDiscount)}</span>
                </div>
              ) : null}
              {order.pricing.taxAmount ? (
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span className="font-semibold">{formatCurrency(order.pricing.taxAmount)}</span>
                </div>
              ) : null}
              {order.pricing.chargesAmount ? (
                <div className="flex justify-between">
                  <span>Charges</span>
                  <span className="font-semibold">{formatCurrency(order.pricing.chargesAmount)}</span>
                </div>
              ) : null}
              {order.pricing.loyaltyValueRedeemed ? (
                <div className="flex justify-between text-[#C8622A]">
                  <span>Points Redeemed</span>
                  <span>-{formatCurrency(order.pricing.loyaltyValueRedeemed)}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-[#E8E0D5] flex justify-between text-base font-bold text-[#1C1917]">
                <span>Total Amount</span>
                <span className="text-[#C8622A]">{formatCurrency(order.pricing.finalPayable)}</span>
              </div>
            </div>
          </div>

          {/* Table Context & Waiter Service Request Actions (Right) */}
          <div className="md:col-span-5 space-y-6">
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm space-y-3 text-xs">
              <h3 className="font-serif font-bold text-base text-[#1C1917]">Dining Details</h3>
              <div className="flex justify-between text-[#78716C]">
                <span>Service Mode:</span>
                <span className="font-bold text-[#1C1917]">
                  {order.orderType === 'DINE_IN' ? 'Dine-In' : 'Takeaway'}
                </span>
              </div>
              {order.tableNumberSnapshot && (
                <div className="flex justify-between text-[#78716C]">
                  <span>Seated Table:</span>
                  <span className="font-bold text-[#C8622A]">Table #{order.tableNumberSnapshot}</span>
                </div>
              )}
              <div className="flex justify-between text-[#78716C]">
                <span>Customer:</span>
                <span className="font-semibold text-[#1C1917]">{order.customerName}</span>
              </div>
            </div>

            {/* Call Waiter Card (Requirement 36) */}
            {order.orderType === 'DINE_IN' && order.tableId && (
              <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1C1917]">
                  <BellRing className="w-4 h-4 text-[#C8622A]" />
                  <span>Call Waiter to Table #{order.tableNumberSnapshot}</span>
                </div>
                <p className="text-xs text-[#78716C]">
                  Need anything during your meal? Tap a quick request below to alert your server immediately.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={callingWaiter}
                    onClick={() => handleCallWaiter('Request water')}
                    className="bg-black text-white"
                  >
                    Request Water
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={callingWaiter}
                    onClick={() => handleCallWaiter('Need assistance')}
                    className="bg-black text-white"
                  >
                    Need Assistance
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={callingWaiter}
                    onClick={() => handleCallWaiter('Request bill')}
                    className="bg-black text-white"
                  >
                    Request Bill
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={callingWaiter}
                    onClick={() => handleCallWaiter('Payment help')}
                    className="bg-black text-white"
                  >
                    Payment Help
                  </Button>
                </div>
              </div>
            )}

            <Link href={`/r/${restaurantSlug}/menu`} className="block">
              <Button variant="outline" className="w-full bg-black text-white">
                Order Additional Dishes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}
