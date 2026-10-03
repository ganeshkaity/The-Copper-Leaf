'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant, MenuCategory, MenuItem } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RestaurantCategoriesPage() {
  const params = useParams();
  const restaurantSlug = params?.restaurantSlug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
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

        const catSnap = await getDocs(
          query(collection(db, 'menuCategories'), where('restaurantId', '==', restData.id), where('active', '==', true))
        );
        const catList: MenuCategory[] = [];
        catSnap.forEach((d) => catList.push({ ...d.data(), id: d.id } as MenuCategory));
        catList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(catList);

        // Count items per category
        const itemSnap = await getDocs(
          query(collection(db, 'menuItems'), where('restaurantId', '==', restData.id), where('active', '==', true))
        );
        const counts: Record<string, number> = {};
        itemSnap.forEach((d) => {
          const item = d.data() as MenuItem;
          counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
        });
        setItemCounts(counts);
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [restaurantSlug]);

  return (
    <CustomerShell currentSlug={restaurantSlug} restaurant={restaurant}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8622A]">
            EXPLORE FLAVORS
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] mt-2 mb-3">
            Menu Categories
          </h1>
          <p className="text-sm text-[#78716C]">
            Explore our artisanal dining offerings arranged by culinary courses and preparations.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="rounded-3xl border border-[#E8E0D5] bg-white p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-white p-12 text-center max-w-md mx-auto">
            <UtensilsCrossed className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
            <h3 className="font-serif text-xl font-bold text-[#1C1917]">No Categories Defined Yet</h3>
            <p className="text-sm text-[#78716C] mt-2 mb-6">
              Menu categories will be shown here once configured in the Admin panel.
            </p>
            <Link href={`/r/${restaurantSlug}/menu`}>
              <Button>Browse All Menu Items</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/r/${restaurantSlug}/menu`}
                className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-sm hover:shadow-xl hover:border-[#C8622A]/40 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#FDF4ED] text-[#C8622A] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#1C1917] group-hover:text-[#C8622A] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#78716C] mt-1.5 line-clamp-2">
                    {cat.description || 'Artisanal dishes prepared freshly to order.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E8E0D5] flex items-center justify-between text-xs mt-6">
                  <span className="font-semibold text-[#78716C]">
                    {itemCounts[cat.id] || 0} dishes
                  </span>
                  <span className="text-[#C8622A] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
