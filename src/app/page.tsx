'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant, Review } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  UtensilsCrossed,
  CalendarCheck,
  ShieldCheck,
  HeartHandshake,
  Star,
  Quote,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function RootHomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const restSnap = await getDocs(
          query(collection(db, 'restaurants'), where('active', '==', true))
        );
        const restList: Restaurant[] = [];
        restSnap.forEach((doc) => {
          restList.push({ ...doc.data(), id: doc.id } as Restaurant);
        });
        setRestaurants(restList);

        // Load recent published reviews
        const revSnap = await getDocs(
          query(collection(db, 'reviews'), where('status', '==', 'PUBLISHED'), limit(6))
        );
        const revList: Review[] = [];
        revSnap.forEach((doc) => {
          revList.push({ ...doc.data(), id: doc.id } as Review);
        });
        setReviews(revList);
      } catch (e) {
        console.warn('Error loading landing page data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const firstRestaurant = restaurants[0] || null;

  return (
    <CustomerShell currentSlug={firstRestaurant?.slug} restaurant={firstRestaurant}>
      {/* Hero Section inspired by reference main landing page.png */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-[#FAF6F0]">
        {/* Floating decorative elements */}
        <div className="absolute top-10 left-[8%] w-16 h-16 pointer-events-none opacity-20 hidden md:block">
          <div className="w-full h-full rounded-full border-4 border-[#C8622A]" />
        </div>
        <div className="absolute bottom-12 right-[6%] w-24 h-24 pointer-events-none opacity-20 hidden md:block">
          <div className="w-full h-full rounded-full border-4 border-[#C8622A]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#1C1917] max-w-4xl mx-auto leading-[1.15]"
          >
            Finally, the dish you have been waiting for on your table
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-[#78716C] max-w-2xl mx-auto leading-relaxed"
          >
            Immerse yourself in exceptional culinary craftsmanship. Reserve your favorite table
            instantly or place table-side orders with zero waiting.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            {firstRestaurant ? (
              <>
                <Link href={`/r/${firstRestaurant.slug}/menu`}>
                  <Button size="lg" className="w-full sm:w-auto px-8 py-3.5 text-base shadow-lg hover:shadow-xl">
                    Order Now
                  </Button>
                </Link>
                <Link href={`/r/${firstRestaurant.slug}/booking`}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-3.5 text-base bg-black text-white hover:bg-white hover:text-black">
                    Reserve a Table
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/n/admin/setup">
                <Button size="lg" className="px-8 py-3.5">
                  Initial Admin Setup &rarr;
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Hero Food Visual Presentation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-14 max-w-4xl mx-auto relative rounded-3xl overflow-hidden border border-[#E8E0D5] shadow-2xl bg-white p-3 sm:p-4"
          >
            <div className="relative h-64 sm:h-96 w-full rounded-2xl overflow-hidden bg-[#F3ECE2] flex items-center justify-center">
              {firstRestaurant?.heroImageUrl ? (
                <Image
                  src={firstRestaurant.heroImageUrl}
                  alt="The Copper Leaf Dining"
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="relative w-28 h-28 mb-3">
                    <Image
                      src="/brand/logo-full.png"
                      alt="The Copper Leaf"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#1C1917]">
                    A Taste Worth Remembering
                  </h3>
                  <p className="text-xs text-[#78716C] mt-1 max-w-sm">
                    {firstRestaurant
                      ? firstRestaurant.address.city
                      : 'Artisanal recipes, freshly curated every morning.'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Restaurant Locations Discovery Section */}
      <section className="py-16 md:py-24 bg-white border-y border-[#E8E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
                OUR LOCATIONS
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] mt-1">
                Discover Our Dining Rooms
              </h2>
            </div>
            <p className="text-sm text-[#78716C] max-w-md mt-2 md:mt-0">
              Each branch features a dedicated kitchen brigade, handcrafted ambiance, and curated
              regional specialties.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-3xl border border-[#E8E0D5] p-5 h-72 animate-pulse bg-[#FAF6F0]" />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-[#FAF6F0] p-12 text-center max-w-xl mx-auto">
              <UtensilsCrossed className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-60" />
              <h3 className="font-serif text-xl font-bold text-[#1C1917]">No Branches Configured Yet</h3>
              <p className="text-sm text-[#78716C] mt-2 mb-6">
                Welcome to The Copper Leaf! If you are the system administrator, run the setup wizard
                to configure your first branch, tables, and chef&apos;s menu.
              </p>
              <Link href="/n/admin/setup">
                <Button>Launch Initial Setup Wizard</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="rounded-3xl border border-[#E8E0D5] bg-[#FAF6F0] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                >
                  <div className="relative h-48 w-full bg-[#F3ECE2] overflow-hidden">
                    {rest.heroImageUrl ? (
                      <Image
                        src={rest.heroImageUrl}
                        alt={rest.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-6 text-center">
                        <div className="relative w-16 h-16">
                          <Image src="/brand/logo.png" alt="Logo" fill className="object-contain" />
                        </div>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-emerald-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Open Today
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-2xl font-bold text-[#1C1917] group-hover:text-[#C8622A] transition-colors">
                        {rest.name}
                      </h3>
                      <p className="text-xs text-[#78716C] mt-1 line-clamp-2">{rest.description}</p>

                      <div className="mt-4 space-y-2 text-xs text-[#44403C]">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#C8622A] shrink-0" />
                          <span className="truncate">
                            {rest.address.street}, {rest.address.city}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#C8622A] shrink-0" />
                          <span>11:00 AM - 11:30 PM (Daily)</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#E8E0D5] flex items-center justify-between">
                      <Link
                        href={`/r/${rest.slug}/menu`}
                        className="text-xs font-bold text-[#C8622A] hover:underline flex items-center gap-1"
                      >
                        <span>View Menu</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link href={`/r/${rest.slug}/booking`}>
                        <Button size="sm" variant="outline" className='bg-black text-white'>
                          Book Table
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why The Copper Leaf Section matching reference */}
      <section className="py-20 md:py-28 bg-[#FAF6F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8622A]">
                ABOUT THE BRAND
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] mt-2 mb-6 leading-tight">
                Why The Copper Leaf?
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E0D5] flex items-center justify-center shrink-0 shadow-sm text-[#C8622A]">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg text-[#1C1917]">Chef-Crafted For Pure Joy</h4>
                    <p className="text-sm text-[#78716C] mt-1 leading-relaxed">
                      Every recipe is formulated and refined in small batches to preserve pure flavor,
                      texture, and authentic culinary heritage.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E0D5] flex items-center justify-center shrink-0 shadow-sm text-[#C8622A]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg text-[#1C1917]">Ingredients You Can Trust</h4>
                    <p className="text-sm text-[#78716C] mt-1 leading-relaxed">
                      Zero artificial preservatives. We partner with local purveyors for farm-fresh produce,
                      cold-pressed oils, and artisanal spices.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E0D5] flex items-center justify-center shrink-0 shadow-sm text-[#C8622A]">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg text-[#1C1917]">Uncompromising Hospitality</h4>
                    <p className="text-sm text-[#78716C] mt-1 leading-relaxed">
                      Instant table selection, digital ordering without interruptions, and attentive staff
                      dedicated to making every visit memorable.
                    </p>
                  </div>
                </div>
              </div>

              {firstRestaurant && (
                <div className="mt-8">
                  <Link href={`/r/${firstRestaurant.slug}/booking`}>
                    <Button size="lg" className="px-8">
                      Book Your Experience &rarr;
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="rounded-3xl border border-[#E8E0D5] bg-white p-4 shadow-xl">
                <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden bg-[#F3ECE2] flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <Image
                      src="/brand/logo_with_tagline_and_name.png"
                      alt="The Copper Leaf"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Real Client Reviews Section */}
      <section className="py-20 bg-white border-t border-[#E8E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8622A]">
            TESTIMONIALS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] mt-2 mb-12">
            Real Client Reviews
          </h2>

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E8E0D5] p-10 max-w-md mx-auto text-center text-[#78716C]">
              <Quote className="w-8 h-8 text-[#C8622A] mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                Reviews will appear here as dining guests complete their orders and share their feedback.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
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
                  <div className="pt-3 border-t border-[#E8E0D5] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1917]">{rev.customerName}</span>
                    {rev.menuItemName && (
                      <span className="text-[11px] text-[#C8622A] font-medium truncate max-w-[140px]">
                        {rev.menuItemName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reservation CTA Section inspired by reference main landing page.png */}
      <section className="py-20 bg-[#FAF6F0] border-t border-[#E8E0D5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl border border-[#E8E0D5] bg-white p-8 sm:p-14 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C8622A]">
              RESERVE YOUR SEAT
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] mt-2 mb-4">
              Book Your Table in Seconds
            </h2>
            <p className="text-sm sm:text-base text-[#78716C] max-w-xl mx-auto mb-8 leading-relaxed">
              Select your favorite floor section, choose your exact table, and enjoy seamless
              hospitality with zero waiting. Same-day bookings now open.
            </p>
            {firstRestaurant && (
              <Link href={`/r/${firstRestaurant.slug}/booking`}>
                <Button size="lg" className="px-10 py-4 text-base font-semibold shadow-lg">
                  Book Now &rarr;
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </CustomerShell>
  );
}
