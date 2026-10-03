'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order, MenuItem } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { AccountNav } from '@/components/customer/account-nav';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/lib/context/auth-context';
import { useCartStore } from '@/lib/stores/cart-store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ShoppingBag, RotateCcw, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerOrdersHistoryPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const forceSwitchRestaurant = useCartStore((s) => s.forceSwitchRestaurant);

  useEffect(() => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    async function fetchOrders() {
      try {
        const q = query(
          collection(db, 'orders'),
          where('customerUid', '==', firebaseUser!.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const list: Order[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Order));
        setOrders(list);
      } catch (err) {
        console.warn('Error loading customer order history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [firebaseUser]);

  // Requirement 25: Reorder must rebuild using CURRENT database prices and availability!
  const handleReorder = async (order: Order) => {
    setReorderingId(order.id);
    try {
      // 1. Fetch current restaurant details
      const restDoc = await getDoc(doc(db, 'restaurants', order.restaurantId));
      if (!restDoc.exists()) {
        toast.error('This restaurant branch is no longer active.');
        return;
      }
      const restData = restDoc.data();

      // Reset cart and switch context to this restaurant
      forceSwitchRestaurant(restDoc.id, restData.slug, restData.name);

      let addedCount = 0;
      let unavailableCount = 0;

      // 2. Authoritatively fetch current dish prices & availability for each item
      for (const item of order.items) {
        const itemSnap = await getDoc(doc(db, 'menuItems', item.menuItemId));
        if (itemSnap.exists()) {
          const currentItemData = itemSnap.data() as MenuItem;
          if (currentItemData.active) {
            addItem({
              menuItemId: currentItemData.id,
              name: currentItemData.name,
              basePrice: currentItemData.basePrice,
              imageUrl: currentItemData.imageUrl,
              quantity: item.quantity,
              variant: item.variantSnapshot,
              addOns: item.modifierSnapshot,
              removedIngredients: item.removedIngredients,
              specialInstructions: item.specialInstructions,
            });
            addedCount++;
          } else {
            unavailableCount++;
          }
        } else {
          unavailableCount++;
        }
      }

      if (unavailableCount > 0) {
        toast.warning(
          `Reordered ${addedCount} items at current prices. ${unavailableCount} items are no longer on the menu.`
        );
      } else {
        toast.success(`All ${addedCount} items added to your cart with current prices!`);
      }

      router.push(`/r/${restData.slug}/cart`);
    } catch (e: any) {
      console.error('Reorder error:', e);
      toast.error('Failed to reconstruct order from current menu.');
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <AccountNav />

          <main className="flex-1 w-full space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
                ORDER ARCHIVE
              </span>
              <h1 className="font-serif text-3xl font-bold text-[#1C1917] mt-1">
                Your Past Dining Orders
              </h1>
            </div>

            {loading || authLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-3xl border border-[#E8E0D5] bg-white p-6 h-36 animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-white p-12 text-center">
                <ShoppingBag className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-30" />
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">No Orders Found</h3>
                <p className="text-sm text-[#78716C] mt-2 mb-6">
                  You haven&apos;t placed any orders with us yet.
                </p>
                <Link href="/">
                  <Button>Find a Restaurant Branch</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8E0D5] gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                            Order {ord.orderNumber}
                          </h3>
                          <StatusBadge status={ord.orderStatus} size="sm" />
                          <StatusBadge status={ord.paymentStatus} size="sm" />
                        </div>
                        <p className="text-xs text-[#78716C] mt-1">
                          Placed on {formatDateTime(ord.createdAt)} •{' '}
                          {ord.orderType === 'DINE_IN'
                            ? `Table ${ord.tableNumberSnapshot || 'Assigned'}`
                            : 'Takeaway'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          loading={reorderingId === ord.id}
                          onClick={() => handleReorder(ord)}
                          className="gap-1.5 bg-black text-white"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reorder</span>
                        </Button>
                        <Link href={`/r/${ord.restaurantId}/orders/${ord.id}`}>
                          <Button size="sm" className="gap-1">
                            <span>Track</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-xs text-[#44403C] space-y-1">
                        {ord.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="font-bold text-[#1C1917]">{item.quantity}x</span>
                            <span>{item.nameSnapshot}</span>
                            {item.variantSnapshot && (
                              <span className="text-[#78716C]">({item.variantSnapshot.name})</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-[#78716C]">Total Paid</div>
                        <div className="text-lg font-bold text-[#C8622A]">
                          {formatCurrency(ord.pricing.finalPayable)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </CustomerShell>
  );
}
