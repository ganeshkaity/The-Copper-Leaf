'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { WaiterShell } from '@/components/layout/waiter-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { useAuth } from '@/lib/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ItemCustomizationModal } from '@/components/menu/item-customization-modal';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MenuItem, MenuCategory } from '@/types/menu';
import { Table } from '@/types/table';
import { OrderItemSnapshot, OrderType } from '@/types/order';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  CreditCard,
  DollarSign,
  ChevronRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

function WaiterPosContent() {
  const searchParams = useSearchParams();
  const initialTableId = searchParams.get('tableId') || '';

  const { currentRestaurant, restaurants } = useRestaurant();
  const { profile, user } = useAuth();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart / Order state
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [selectedTableNumber, setSelectedTableNumber] = useState(initialTableId);
  const [cartItems, setCartItems] = useState<OrderItemSnapshot[]>([]);
  const [discountPercent, setDiscountPercent] = useState('0');

  // Customization modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Submitting
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    async function loadPosData() {
      if (!activeRestaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Categories
        const catsRef = collection(db, 'menuCategories');
        const catsQ = query(
          catsRef,
          where('restaurantId', '==', activeRestaurantId),
          orderBy('sortOrder', 'asc')
        );
        const catsSnap = await getDocs(catsQ);
        const catsList: MenuCategory[] = [];
        catsSnap.forEach((d) => catsList.push({ id: d.id, ...d.data() } as MenuCategory));
        setCategories(catsList);

        // 2. Menu Items
        const itemsRef = collection(db, 'menuItems');
        const itemsQ = query(
          itemsRef,
          where('restaurantId', '==', activeRestaurantId),
          where('active', '==', true)
        );
        const itemsSnap = await getDocs(itemsQ);
        const itemsList: MenuItem[] = [];
        itemsSnap.forEach((d) => itemsList.push({ id: d.id, ...d.data() } as MenuItem));
        setItems(itemsList);

        // 3. Tables
        const tablesRef = collection(db, 'tables');
        const tablesQ = query(tablesRef, where('restaurantId', '==', activeRestaurantId));
        const tablesSnap = await getDocs(tablesQ);
        const tablesList: Table[] = [];
        tablesSnap.forEach((d) => tablesList.push({ id: d.id, ...d.data() } as Table));
        setTables(tablesList);
      } catch (err) {
        console.error('POS data load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPosData();
  }, [activeRestaurantId]);

  const handleAddItem = (item: MenuItem) => {
    // If item has variants or modifiers, open customization modal
    if ((item.variants && item.variants.length > 0) || (item.modifierIds && item.modifierIds.length > 0)) {
      setCustomizingItem(item);
      setIsModalOpen(true);
    } else {
      // Direct quick add
      setCartItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.menuItemId === item.id && !i.variantSnapshot);
        if (existingIdx > -1) {
          const copy = [...prev];
          copy[existingIdx].quantity += 1;
          return copy;
        } else {
          return [
            ...prev,
            {
              menuItemId: item.id,
              nameSnapshot: item.name,
              unitPriceSnapshot: item.basePrice,
              quantity: 1,
              itemStatus: 'PENDING',
            },
          ];
        }
      });
      toast.success(`Added ${item.name}`);
    }
  };

  const handleCustomizationAdd = (customized: {
    menuItemId: string;
    nameSnapshot: string;
    variantSnapshot?: any;
    modifierSnapshot?: any[];
    removedIngredients?: string[];
    specialInstructions?: string;
    unitPriceSnapshot: number;
    quantity: number;
  }) => {
    setCartItems((prev) => [
      ...prev,
      {
        ...customized,
        itemStatus: 'PENDING',
      },
    ]);
    setIsModalOpen(false);
    toast.success(`Added ${customized.nameSnapshot}`);
  };

  const handleQuantityChange = (idx: number, delta: number) => {
    setCartItems((prev) => {
      const copy = [...prev];
      const nextQty = copy[idx].quantity + delta;
      if (nextQty <= 0) {
        return copy.filter((_, i) => i !== idx);
      } else {
        copy[idx].quantity = nextQty;
        return copy;
      }
    });
  };

  const handleRemoveItem = (idx: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Subtotal & Calculations
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPriceSnapshot * item.quantity,
    0
  );
  const discountVal = Math.round((subtotal * (parseFloat(discountPercent) || 0)) / 100);
  const taxes = Math.round(subtotal * 0.05); // 5% GST baseline or configured
  const finalPayable = Math.max(0, subtotal - discountVal + taxes);

  const handleSendToKitchen = async () => {
    if (!activeRestaurantId) return;
    if (cartItems.length === 0) {
      toast.error('Cart is empty. Add dishes first.');
      return;
    }
    if (orderType === 'DINE_IN' && !selectedTableNumber) {
      toast.error('Please assign a table for Dine-in orders');
      return;
    }

    setSubmittingOrder(true);
    try {
      const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();

      const orderData = {
        orderNumber,
        restaurantId: activeRestaurantId,
        source: 'POS_WAITER',
        orderType,
        tableId: orderType === 'DINE_IN' ? selectedTableNumber : null,
        waiterId: user?.uid,
        items: cartItems,
        subtotal,
        membershipDiscount: 0,
        couponDiscount: discountVal,
        taxes,
        charges: 0,
        loyaltyPointsUsed: 0,
        loyaltyValue: 0,
        totalBeforePoints: finalPayable,
        finalPayable,
        paymentStatus: 'UNPAID',
        orderStatus: 'CONFIRMED',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);

      toast.success(`Order #${orderNumber} sent directly to Kitchen Display!`);
      setCartItems([]);
    } catch (err: any) {
      toast.error('Order submission failed: ' + err.message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <WaiterShell>
      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
        {/* Left Side: Menu Dishes Grid matching `point of sale.png` */}
        <div className="flex-1 space-y-4">
          {/* Categories Horizontal Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white dark:bg-[#18181D] text-gray-700 dark:text-gray-300 border border-[#E8E0D5] dark:border-[#2A2A33]'
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  selectedCategory === c.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white dark:bg-[#18181D] text-gray-700 dark:text-gray-300 border border-[#E8E0D5] dark:border-[#2A2A33]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick search dishes or appetizers..."
              className="pl-10 text-xs py-2.5 rounded-xl"
            />
          </div>

          {/* Menu Items Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 border border-dashed rounded-2xl">
              No menu dishes match your selection.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className="p-3.5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:border-primary hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2.5 relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UtensilsCrossed className="w-6 h-6" />
                        </div>
                      )}
                      {item.bestseller && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold">
                          Bestseller
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-sm font-bold text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      ₹{item.basePrice}
                    </span>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-lg bg-orange-50 text-primary flex items-center justify-center font-bold text-sm hover:bg-primary hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: High-Speed POS Order Panel */}
        <Card className="w-full lg:w-96 p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] shadow-sm flex flex-col justify-between shrink-0">
          <div>
            {/* Header: Dine-In vs Takeaway */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-gray-100 dark:bg-[#22222A]">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  orderType === 'DINE_IN'
                    ? 'bg-white dark:bg-[#18181D] text-primary shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Dine-In
              </button>
              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  orderType === 'TAKEAWAY'
                    ? 'bg-white dark:bg-[#18181D] text-primary shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Takeaway
              </button>
            </div>

            {/* Table Selector */}
            {orderType === 'DINE_IN' && (
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Dining Table *
                </label>
                <select
                  value={selectedTableNumber}
                  onChange={(e) => setSelectedTableNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
                >
                  <option value="">Select table...</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.tableNumber}>
                      {t.tableNumber} ({t.capacity} seats • {t.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  Select dishes from the menu to populate check.
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#22222A]/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-white truncate max-w-[170px]">
                        {item.nameSnapshot}
                      </span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white">
                        ₹{item.unitPriceSnapshot * item.quantity}
                      </span>
                    </div>

                    {item.variantSnapshot && (
                      <p className="text-[10px] text-gray-400">
                        Variant: {item.variantSnapshot.name}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, -1)}
                          className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, 1)}
                          className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-gray-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals & Quick Kitchen Push */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Staff Discount (%)</span>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-14 px-1.5 py-0.5 rounded border text-right text-xs"
                  placeholder="0"
                />
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (5%)</span>
                <span>₹{taxes}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold text-sm text-gray-900 dark:text-white">
                <span>Total Due</span>
                <span>₹{finalPayable}</span>
              </div>
            </div>

            <Button
              onClick={handleSendToKitchen}
              disabled={submittingOrder || cartItems.length === 0}
              className="w-full py-3 text-xs font-bold rounded-xl"
            >
              {submittingOrder ? 'Sending...' : 'Send Order to Kitchen'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Item Customizer Modal */}
      {customizingItem && (
        <ItemCustomizationModal
          item={customizingItem}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddToCart={handleCustomizationAdd}
        />
      )}
    </WaiterShell>
  );
}

export default function WaiterPosPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading POS Terminal...</div>}>
      <WaiterPosContent />
    </React.Suspense>
  );
}
