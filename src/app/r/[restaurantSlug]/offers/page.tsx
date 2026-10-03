'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Restaurant } from '@/types/restaurant';
import type { Offer } from '@/types/offer';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { Tag, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function RestaurantOffersPage() {
  const params = useParams();
  const restaurantSlug = params?.restaurantSlug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOffers() {
      if (!restaurantSlug) return;
      try {
        const restSnap = await getDocs(
          query(collection(db, 'restaurants'), where('slug', '==', restaurantSlug), where('active', '==', true))
        );
        if (restSnap.empty) {
          setLoading(false);
          return;
        }

        const restData = { ...restSnap.docs[0].data(), id: restSnap.docs[0].id } as Restaurant;
        setRestaurant(restData);

        const offersSnap = await getDocs(
          query(collection(db, 'offers'), where('restaurantId', '==', restData.id), where('active', '==', true))
        );
        const offersList: Offer[] = [];
        offersSnap.forEach((d) => offersList.push({ ...d.data(), id: d.id } as Offer));
        setOffers(offersList);
      } catch (err) {
        console.error('Error loading offers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOffers();
  }, [restaurantSlug]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied! Apply at checkout.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <CustomerShell currentSlug={restaurantSlug} restaurant={restaurant}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8622A]">
            PROMOTIONS & PRIVILEGES
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] mt-2 mb-3">
            Exclusive Offers
          </h1>
          <p className="text-sm text-[#78716C]">
            Seasonal menus, member privileges, and celebratory dining discounts at {restaurant?.name}.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-3xl border border-[#E8E0D5] bg-white p-6 h-56 animate-pulse" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-white p-12 text-center max-w-md mx-auto">
            <Tag className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
            <h3 className="font-serif text-xl font-bold text-[#1C1917]">No Active Offers</h3>
            <p className="text-sm text-[#78716C] mt-2 mb-6">
              There are currently no active promotional campaigns for this location. Check back soon for seasonal specials!
            </p>
            <Link href={`/r/${restaurantSlug}/menu`}>
              <Button>Browse Menu</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-3xl border border-[#E8E0D5] bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {offer.imageUrl && (
                    <div className="relative h-48 w-full bg-[#F3ECE2]">
                      <Image src={offer.imageUrl} alt={offer.title} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-1.5 text-[#C8622A] text-xs font-bold uppercase mb-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Special Privilege</span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[#1C1917] mb-2">{offer.title}</h3>
                    <p className="text-xs text-[#78716C] leading-relaxed mb-4">{offer.description}</p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  {offer.couponCode && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FDF4ED] border border-[#E8E0D5]">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[#78716C]">Coupon Code</div>
                        <div className="font-mono text-sm font-bold text-[#C8622A]">{offer.couponCode}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(offer.couponCode!)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E0D5] text-xs font-bold text-[#1C1917] hover:bg-[#FAF6F0] flex items-center gap-1 transition-colors"
                      >
                        {copiedCode === offer.couponCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="mt-4">
                    <Link href={`/r/${restaurantSlug}/menu`} className="block">
                      <Button variant="outline" className="w-full bg-black text-white ">
                        Use Offer & Order
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
