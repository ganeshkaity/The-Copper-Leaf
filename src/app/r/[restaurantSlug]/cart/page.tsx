'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/stores/cart-store';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, UtensilsCrossed } from 'lucide-react';

export default function RestaurantCartPage() {
  const params = useParams();
  const restaurantSlug = params?.restaurantSlug as string;

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const restaurantName = useCartStore((s) => s.restaurantName);

  const subtotal = getSubtotal();
  const estimatedTax = Number((subtotal * 0.05).toFixed(2));
  const total = Number((subtotal + estimatedTax).toFixed(2));

  return (
    <CustomerShell currentSlug={restaurantSlug}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
              YOUR SELECTION
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] mt-1">
              Dining Cart
            </h1>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-[#78716C] hover:text-red-600 font-semibold"
            >
              Clear Cart
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-white p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-[#C8622A] mx-auto mb-4 opacity-30" />
            <h2 className="font-serif text-2xl font-bold text-[#1C1917]">Your Cart is Empty</h2>
            <p className="text-sm text-[#78716C] mt-2 mb-6">
              You haven&apos;t added any delicious dishes yet. Explore our freshly curated menu.
            </p>
            <Link href={`/r/${restaurantSlug}/menu`}>
              <Button size="lg" className="px-8">
                Explore Menu &rarr;
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[#E8E0D5] bg-white p-5 shadow-sm flex items-start gap-4"
                >
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#F3ECE2] shrink-0 border border-[#E8E0D5]">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-6 h-6 text-[#C8622A] opacity-40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-bold text-base text-[#1C1917] truncate">
                        {item.name}
                      </h3>
                      <span className="text-base font-bold text-[#1C1917]">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>

                    <div className="text-xs text-[#78716C] mt-0.5">
                      {formatCurrency(item.unitPrice)} each
                    </div>

                    {item.variant && (
                      <span className="inline-block text-[11px] bg-[#FAF6F0] border border-[#E8E0D5] px-2 py-0.5 rounded-lg text-[#78716C] mt-1 mr-1">
                        {item.variant.name}
                      </span>
                    )}

                    {item.addOns?.map((addon) => (
                      <span
                        key={addon.id}
                        className="inline-block text-[11px] bg-[#FDF4ED] text-[#C8622A] px-2 py-0.5 rounded-lg font-medium mt-1 mr-1"
                      >
                        +{addon.name}
                      </span>
                    ))}

                    {item.specialInstructions && (
                      <div className="text-[11px] text-[#C8622A] italic mt-1">
                        Note: &ldquo;{item.specialInstructions}&rdquo;
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E0D5]">
                      <div className="flex items-center gap-2 border border-[#E8E0D5] rounded-xl p-1 bg-[#FAF6F0]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#78716C] hover:bg-white active:scale-95"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#1C1917]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#78716C] hover:bg-white active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-[#78716C] hover:text-red-600 flex items-center gap-1 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Card */}
            <div className="lg:col-span-4 sticky top-28">
              <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-xl space-y-4">
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">Order Summary</h3>

                <div className="space-y-2 text-sm text-[#44403C]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax (5%)</span>
                    <span className="font-semibold">{formatCurrency(estimatedTax)}</span>
                  </div>
                  <div className="pt-3 border-t border-[#E8E0D5] flex justify-between text-lg font-bold text-[#1C1917]">
                    <span>Total</span>
                    <span className="text-[#C8622A]">{formatCurrency(total)}</span>
                  </div>
                </div>

                <Link href={`/r/${restaurantSlug}/checkout`} className="block pt-2">
                  <Button size="lg" className="w-full h-12 text-base font-bold shadow-lg rounded-2xl">
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                <Link
                  href={`/r/${restaurantSlug}/menu`}
                  className="block text-center text-xs font-bold text-[#78716C] hover:text-[#C8622A]"
                >
                  &larr; Add more dishes
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
