'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant, MenuItem, Review } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  UtensilsCrossed,
  ShieldCheck,
  HeartHandshake,
  Star,
  Plus,
  ShoppingBag,
  CalendarCheck,
} from 'lucide-react';
import { useCartStore } from '@/lib/stores/cart-store';
import { toast } from 'sonner';

export default function RestaurantLandingPage() {
  const params = useParams();
  const restaurantSlug = params?.restaurantSlug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const addItemToCart = useCartStore((s) => s.addItem);
  const setRestaurantContext = useCartStore((s) => s.setRestaurantContext);

  useEffect(() => {
    async function fetchRestaurantData() {
      if (!restaurantSlug) return;
      try {
        const q = query(
          collection(db, 'restaurants'),
          where('slug', '==', restaurantSlug),
          where('active', '==', true),
          limit(1)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const restData = { ...snap.docs[0].data(), id: snap.docs[0].id } as Restaurant;
          setRestaurant(restData);
          setRestaurantContext(restData.id, restData.slug, restData.name);

          // Fetch featured menu items
          const itemsQuery = query(
            collection(db, 'menuItems'),
            where('restaurantId', '==', restData.id),
            where('active', '==', true),
            limit(6)
          );
          const itemsSnap = await getDocs(itemsQuery);
          const itemsList: MenuItem[] = [];
          itemsSnap.forEach((d) => itemsList.push({ ...d.data(), id: d.id } as MenuItem));
          setFeaturedItems(itemsList);

          // Fetch reviews
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('restaurantId', '==', restData.id),
            where('status', '==', 'PUBLISHED'),
            limit(6)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          const reviewsList: Review[] = [];
          reviewsSnap.forEach((d) => reviewsList.push({ ...d.data(), id: d.id } as Review));
          setReviews(reviewsList);
        }
      } catch (err) {
        console.error('Error fetching restaurant data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRestaurantData();
  }, [restaurantSlug, setRestaurantContext]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#C8622A]/20 border-t-[#C8622A] rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#78716C]">Loading dining room...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <CustomerShell currentSlug={restaurantSlug}>
        <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <UtensilsCrossed className="w-12 h-12 text-[#C8622A] mx-auto mb-4 opacity-50" />
            <h2 className="font-serif text-2xl font-bold text-[#1C1917]">Restaurant Branch Not Found</h2>
            <p className="text-sm text-[#78716C] mt-2 mb-6">
              The restaurant location you requested is not active or could not be found.
            </p>
            <Link href="/">
              <Button>Browse All Locations</Button>
            </Link>
          </div>
        </div>
      </CustomerShell>
    );
  }

  const handleQuickAdd = (item: MenuItem) => {
    addItemToCart({
      menuItemId: item.id,
      name: item.name,
      basePrice: item.basePrice,
      imageUrl: item.imageUrl,
      quantity: 1,
    });
    toast.success(`Added ${item.name} to cart`);
  };

  return (
    <CustomerShell currentSlug={restaurant.slug} restaurant={restaurant}>
      {/* Branch Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-[#FAF6F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E8E0D5] bg-white text-xs font-semibold text-[#C8622A] mb-6 shadow-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {restaurant.address.street}, {restaurant.address.city}
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#1C1917] max-w-4xl mx-auto leading-[1.15]">
            {restaurant.tagline || 'Finally, the dish you have been waiting for on your table'}
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#78716C] max-w-2xl mx-auto leading-relaxed">
            {restaurant.description}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href={`/r/${restaurant.slug}/menu`}>
              <Button size="lg" className="w-full sm:w-auto px-8 py-3.5 text-base shadow-lg">
                View Full Menu
              </Button>
            </Link>
            <Link href={`/r/${restaurant.slug}/booking`}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-3.5 text-base bg-black text-white">
                Reserve a Table
              </Button>
            </Link>
          </div>

          {/* Hero Visual Card */}
          <div className="mt-14 max-w-4xl mx-auto relative rounded-3xl overflow-hidden border border-[#E8E0D5] shadow-2xl bg-white p-3 sm:p-4">
            <div className="relative h-64 sm:h-96 w-full rounded-2xl overflow-hidden bg-[#F3ECE2]">
              {restaurant.heroImageUrl ? (
                <Image
                  src={restaurant.heroImageUrl}
                  alt={restaurant.name}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="relative w-28 h-28 mb-3">
                    <Image src="/brand/logo.png" alt="Logo" fill className="object-contain" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#1C1917]">{restaurant.name}</h3>
                  <p className="text-xs text-[#78716C] mt-1">{restaurant.address.city}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Dishes / "Top List is Back" Section matching reference */}
      <section className="py-20 bg-white border-y border-[#E8E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C8622A]">
              CURATED SELECTION
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] mt-2 mb-3">
              Top List is Back
            </h2>
            <p className="text-sm text-[#78716C]">
              All our best meals in one delicious snap. Handcrafted daily with exquisite seasoning.
            </p>
          </div>

          {featuredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E8E0D5] p-12 text-center max-w-md mx-auto">
              <UtensilsCrossed className="w-10 h-10 text-[#C8622A] mx-auto mb-2 opacity-40" />
              <p className="text-sm text-[#78716C]">
                Featured menu items will appear here once configured by the culinary team.
              </p>
              <Link href={`/r/${restaurant.slug}/menu`} className="mt-4 inline-block text-xs font-bold text-[#C8622A]">
                Explore All Dishes &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[#E8E0D5] bg-[#FAF6F0] p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Item Image */}
                    <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-white mb-4 border border-[#E8E0D5]">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#78716C]">
                          <UtensilsCrossed className="w-8 h-8 text-[#C8622A] opacity-30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#1C1917] font-bold text-sm px-3 py-1 rounded-xl shadow-sm">
                        {formatCurrency(item.basePrice)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      {item.dietaryTags?.includes('veg') ? (
                        <span className="w-3.5 h-3.5 rounded border border-emerald-600 flex items-center justify-center p-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded border border-red-600 flex items-center justify-center p-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        </span>
                      )}
                      <h3 className="font-serif text-xl font-bold text-[#1C1917] group-hover:text-[#C8622A] transition-colors">
                        {item.name}
                      </h3>
                    </div>

                    <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E8E0D5] flex items-center justify-between">
                    <span className="text-xs text-[#78716C]">
                      {item.prepTimeMinutes ? `⏱ ${item.prepTimeMinutes} mins` : 'Chef signature'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleQuickAdd(item)}
                      className="gap-1 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href={`/r/${restaurant.slug}/menu`}>
              <Button size="lg" variant="outline" className="px-8 bg-black text-white">
                Explore Full Menu &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-[#FAF6F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8622A]">
                ABOUT {restaurant.name.toUpperCase()}
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] mt-2 mb-6">
                Culinary Excellence & Warmth
              </h2>
              <p className="text-sm text-[#78716C] leading-relaxed mb-6">
                {restaurant.aboutText ||
                  'The Copper Leaf is a culinary haven where traditional spice-blending techniques harmonize with contemporary gastronomy. Every dining visit is crafted to be an occasion of comfort, joy, and shared delight.'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#E8E0D5]">
                  <UtensilsCrossed className="w-5 h-5 text-[#C8622A] mb-2" />
                  <div className="font-serif font-bold text-sm text-[#1C1917]">Fresh Daily</div>
                  <div className="text-xs text-[#78716C]">Artisanal spices & produce</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#E8E0D5]">
                  <Clock className="w-5 h-5 text-[#C8622A] mb-2" />
                  <div className="font-serif font-bold text-sm text-[#1C1917]">Prompt Service</div>
                  <div className="text-xs text-[#78716C]">Instant table-side ordering</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#E8E0D5] shadow-xl">
              <h3 className="font-serif text-xl font-bold text-[#1C1917] mb-4">Location & Hours</h3>
              <div className="space-y-3 text-sm text-[#44403C]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#C8622A] shrink-0 mt-1" />
                  <span>
                    {restaurant.address.street}, {restaurant.address.city},{' '}
                    {restaurant.address.postalCode}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#C8622A] shrink-0" />
                  <span>Open Daily: 11:00 AM – 11:30 PM</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E8E0D5]">
                <Link href={`/r/${restaurant.slug}/booking`} className="block">
                  <Button className="w-full">Reserve Table at {restaurant.name}</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Reviews Section */}
      <section className="py-20 bg-white border-t border-[#E8E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8622A]">
            GUEST FEEDBACK
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] mt-2 mb-10">
            Real Dining Reviews
          </h2>

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E8E0D5] p-10 max-w-md mx-auto text-center text-[#78716C]">
              <p className="text-sm">
                No reviews published for this branch yet. Be the first to share your dining experience!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-[#E8E0D5] bg-[#FAF6F0] p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1 text-amber-500 mb-3">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-[#44403C] italic leading-relaxed mb-4">
                      &ldquo;{rev.reviewText}&rdquo;
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#E8E0D5] flex items-center justify-between text-xs font-bold text-[#1C1917]">
                    <span>{rev.customerName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </CustomerShell>
  );
}
