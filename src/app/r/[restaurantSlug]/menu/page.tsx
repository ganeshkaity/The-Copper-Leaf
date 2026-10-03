'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant, MenuItem, MenuCategory } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { ItemCustomizationModal } from '@/components/menu/item-customization-modal';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useCartStore } from '@/lib/stores/cart-store';
import { toast } from 'sonner';

export default function RestaurantMenuPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantSlug = params?.restaurantSlug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'name'>('popular');
  const [dietFilter, setDietFilter] = useState<'ALL' | 'veg' | 'non-veg'>('ALL');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart store bindings
  const cartItems = useCartStore((s) => s.items);
  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const itemCount = useCartStore((s) => s.getItemCount());
  const setRestaurantContext = useCartStore((s) => s.setRestaurantContext);

  useEffect(() => {
    async function loadMenu() {
      if (!restaurantSlug) return;
      try {
        const restQuery = query(
          collection(db, 'restaurants'),
          where('slug', '==', restaurantSlug),
          where('active', '==', true)
        );
        const restSnap = await getDocs(restQuery);

        if (restSnap.empty) {
          setLoading(false);
          return;
        }

        const restData = { ...restSnap.docs[0].data(), id: restSnap.docs[0].id } as Restaurant;
        setRestaurant(restData);
        setRestaurantContext(restData.id, restData.slug, restData.name);

        // Fetch categories
        const catQuery = query(
          collection(db, 'menuCategories'),
          where('restaurantId', '==', restData.id),
          where('active', '==', true)
        );
        const catSnap = await getDocs(catQuery);
        const catList: MenuCategory[] = [];
        catSnap.forEach((d) => catList.push({ ...d.data(), id: d.id } as MenuCategory));
        catList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(catList);

        // Fetch menu items
        const itemQuery = query(
          collection(db, 'menuItems'),
          where('restaurantId', '==', restData.id),
          where('active', '==', true)
        );
        const itemSnap = await getDocs(itemQuery);
        const itemList: MenuItem[] = [];
        itemSnap.forEach((d) => itemList.push({ ...d.data(), id: d.id } as MenuItem));
        setMenuItems(itemList);
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [restaurantSlug, setRestaurantContext]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let list = [...menuItems];

    if (selectedCategoryId !== 'ALL') {
      list = list.filter((i) => i.categoryId === selectedCategoryId || i.subcategoryId === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.normalizedName?.includes(q)
      );
    }

    if (dietFilter !== 'ALL') {
      list = list.filter((i) => i.dietaryTags?.includes(dietFilter));
    }

    switch (sortBy) {
      case 'popular':
        list.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
        break;
      case 'price-low':
        list.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price-high':
        list.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [menuItems, selectedCategoryId, searchQuery, dietFilter, sortBy]);

  const subtotal = getSubtotal();
  const estimatedTax = Number((subtotal * 0.05).toFixed(2)); // Preview tax 5%
  const total = Number((subtotal + estimatedTax).toFixed(2));

  const handleItemClick = (item: MenuItem) => {
    // If item has variants or add-ons, open modal; otherwise quick add
    if (
      (item.variants && item.variants.length > 0) ||
      (item.addOns && item.addOns.length > 0) ||
      (item.removableIngredients && item.removableIngredients.length > 0)
    ) {
      setCustomizingItem(item);
    } else {
      useCartStore.getState().addItem({
        menuItemId: item.id,
        name: item.name,
        basePrice: item.basePrice,
        imageUrl: item.imageUrl,
        quantity: 1,
      });
      toast.success(`Added ${item.name} to cart`);
    }
  };

  return (
    <CustomerShell currentSlug={restaurant?.slug} restaurant={restaurant}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Breadcrumb & Controls matching reference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-[#78716C] mb-1">
              <Link href={`/r/${restaurantSlug}`} className="hover:text-[#C8622A]">
                {restaurant?.name || 'Restaurant'}
              </Link>{' '}
              / <span className="font-semibold text-[#1C1917]">Chef&apos;s Menu</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#1C1917]">Dine & Order</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#E8E0D5] bg-white text-sm text-[#1C1917] placeholder:text-[#A1A1AA] focus:border-[#C8622A] focus:outline-none"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E0D5] bg-white text-xs font-semibold text-[#1C1917] focus:outline-none cursor-pointer"
            >
              <option value="popular">Popular Dishes</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Alphabetical</option>
            </select>

            {/* Dietary Filter */}
            <div className="flex items-center gap-1 bg-white border border-[#E8E0D5] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setDietFilter('ALL')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors',
                  dietFilter === 'ALL' ? 'bg-[#C8622A] text-white' : 'text-[#78716C]'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDietFilter('veg')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1',
                  dietFilter === 'veg' ? 'bg-emerald-600 text-white' : 'text-emerald-700'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Veg
              </button>
              <button
                type="button"
                onClick={() => setDietFilter('non-veg')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1',
                  dietFilter === 'non-veg' ? 'bg-red-600 text-white' : 'text-red-700'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Non-Veg
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Row matching reference customer orders and items page.png */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('ALL')}
            className={cn(
              'px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shadow-sm',
              selectedCategoryId === 'ALL'
                ? 'bg-[#C8622A] text-white'
                : 'bg-white border border-[#E8E0D5] text-[#1C1917] hover:bg-[#F3ECE2]'
            )}
          >
            All Menu
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                'px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shadow-sm',
                selectedCategoryId === cat.id
                  ? 'bg-[#C8622A] text-white'
                  : 'bg-white border border-[#E8E0D5] text-[#1C1917] hover:bg-[#F3ECE2]'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Main Two-Column Layout: Dishes Grid (Left) + Order Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Grid: Menu Items */}
          <div className="lg:col-span-8">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="rounded-3xl border border-[#E8E0D5] bg-white p-4 h-64 animate-pulse" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-white p-12 text-center">
                <UtensilsCrossed className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">No Dishes Found</h3>
                <p className="text-sm text-[#78716C] mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No menu items matching "${searchQuery}". Try a different keyword.`
                    : 'Dishes in this category will appear once configured.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-[#E8E0D5] bg-white p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image container */}
                      <div
                        onClick={() => handleItemClick(item)}
                        className="relative h-44 w-full rounded-2xl overflow-hidden bg-[#F3ECE2] mb-3 cursor-pointer"
                      >
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed className="w-8 h-8 text-[#C8622A] opacity-40" />
                          </div>
                        )}
                        {item.bestseller && (
                          <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[#C8622A] text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
                            Popular
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-1.5 mb-1">
                        {item.dietaryTags?.includes('veg') ? (
                          <span className="w-3.5 h-3.5 rounded border border-emerald-600 flex items-center justify-center p-0.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded border border-red-600 flex items-center justify-center p-0.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          </span>
                        )}
                        <h3
                          onClick={() => handleItemClick(item)}
                          className="font-serif font-bold text-base text-[#1C1917] truncate hover:text-[#C8622A] cursor-pointer"
                        >
                          {item.name}
                        </h3>
                      </div>

                      <p className="text-xs text-[#78716C] line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-[#E8E0D5]">
                      <span className="text-base font-bold text-[#1C1917]">
                        {formatCurrency(item.basePrice)}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleItemClick(item)}
                        className="rounded-xl px-3.5 text-xs font-bold hover:bg-[#C8622A] hover:text-white transition-colors"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Pane: Order Details Panel matching customer orders and items page.png */}
          <div className="lg:col-span-4 sticky top-28 hidden lg:block">
            <div className="rounded-3xl border border-[#E8E0D5] bg-white p-6 shadow-xl">
              <h2 className="font-serif text-2xl font-bold text-[#1C1917] mb-4">Order</h2>

              {/* Dine In / Takeaway Tabs */}
              <div className="text-xs font-bold uppercase tracking-wider text-[#78716C] mb-2">
                ORDER DETAILS
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F3ECE2] rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setOrderType('DINE_IN')}
                  className={cn(
                    'py-2 rounded-lg text-xs font-bold transition-all',
                    orderType === 'DINE_IN'
                      ? 'bg-white text-[#C8622A] shadow-sm'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  )}
                >
                  Dine In
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('TAKEAWAY')}
                  className={cn(
                    'py-2 rounded-lg text-xs font-bold transition-all',
                    orderType === 'TAKEAWAY'
                      ? 'bg-white text-[#C8622A] shadow-sm'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  )}
                >
                  Takeaway
                </button>
              </div>

              {/* Order Items List */}
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center text-[#78716C]">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#C8622A]" />
                    <p className="text-xs">Your dining order is empty.</p>
                    <p className="text-[11px] text-[#A1A1AA] mt-0.5">Select dishes from the menu.</p>
                  </div>
                ) : (
                  cartItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 pb-3 border-b border-[#E8E0D5]"
                    >
                      <span className="text-xs font-semibold text-[#78716C] pt-1">{idx + 1}</span>

                      {/* Thumbnail */}
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#F3ECE2] shrink-0">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed className="w-4 h-4 text-[#C8622A] opacity-40" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#1C1917] truncate">
                            {item.quantity}x {item.name}
                          </h4>
                          <span className="text-xs font-bold text-[#1C1917]">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </span>
                        </div>

                        {item.variant && (
                          <span className="inline-block text-[10px] bg-[#FAF6F0] border border-[#E8E0D5] px-1.5 py-0.5 rounded text-[#78716C] mt-1 mr-1">
                            {item.variant.name}
                          </span>
                        )}

                        {item.addOns?.map((addon) => (
                          <span
                            key={addon.id}
                            className="inline-block text-[10px] bg-[#FDF4ED] text-[#C8622A] px-1.5 py-0.5 rounded font-medium mt-1 mr-1"
                          >
                            +{addon.name}
                          </span>
                        ))}

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-5 h-5 rounded bg-[#F3ECE2] text-[#1C1917] flex items-center justify-center text-xs hover:bg-[#EAE0D3]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded bg-[#F3ECE2] text-[#1C1917] flex items-center justify-center text-xs hover:bg-[#EAE0D3]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-[#78716C] hover:text-red-600 ml-auto p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Details Breakdown */}
              <div className="mt-6 pt-4 border-t-2 border-[#E8E0D5] space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] mb-2">
                  PAYMENT DETAILS
                </div>
                <div className="flex justify-between text-xs text-[#44403C]">
                  <span>Sub Totals</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#44403C]">
                  <span>Estimated Tax</span>
                  <span className="font-semibold">{formatCurrency(estimatedTax)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#1C1917] pt-2 border-t border-[#E8E0D5]">
                  <span>TOTAL</span>
                  <span className="text-[#C8622A]">{formatCurrency(total)}</span>
                </div>

                <Link
                  href={cartItems.length > 0 ? `/r/${restaurantSlug}/checkout` : '#'}
                  className="block mt-4"
                >
                  <Button
                    disabled={cartItems.length === 0}
                    className="w-full h-12 text-base font-bold bg-[#C8622A] hover:bg-[#B3531E] shadow-lg rounded-2xl"
                  >
                    Proceed Orders
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Order Bar */}
        {cartItems.length > 0 && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-white border border-[#E8E0D5] rounded-2xl p-4 shadow-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-[#78716C]">{itemCount} items selected</div>
              <div className="text-lg font-bold text-[#C8622A]">{formatCurrency(total)}</div>
            </div>
            <Link href={`/r/${restaurantSlug}/checkout`}>
              <Button size="lg" className="rounded-xl font-bold">
                Proceed Orders &rarr;
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        item={customizingItem}
        isOpen={!!customizingItem}
        onClose={() => setCustomizingItem(null)}
      />
    </CustomerShell>
  );
}
