'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MenuItem } from '@/types/menu';
import { Package, ArrowLeft, Plus, Minus, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminStockPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchItems = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'menuItems');
      const q = query(ref, where('restaurantId', '==', activeRestaurantId));
      const snap = await getDocs(q);
      const list: MenuItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as MenuItem);
      });
      setItems(list);
    } catch (err) {
      console.error('Failed to load menu stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeRestaurantId]);

  const handleAdjustStock = async (item: MenuItem, delta: number) => {
    const current = item.stockQuantity ?? 0;
    const nextVal = Math.max(0, current + delta);

    try {
      await updateDoc(doc(db, 'menuItems', item.id), {
        stockQuantity: nextVal,
        stockTracked: true,
        updatedAt: serverTimestamp(),
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, stockQuantity: nextVal, stockTracked: true } : i))
      );
      toast.success(`${item.name} stock set to ${nextVal}`);
    } catch (err: any) {
      toast.error('Failed to adjust stock');
    }
  };

  const handleToggleTracking = async (item: MenuItem) => {
    const nextTracked = !item.stockTracked;
    try {
      await updateDoc(doc(db, 'menuItems', item.id), {
        stockTracked: nextTracked,
        stockQuantity: nextTracked ? item.stockQuantity || 50 : null,
        updatedAt: serverTimestamp(),
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, stockTracked: nextTracked } : i))
      );
      toast.success(`${item.name} stock tracking ${nextTracked ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error('Failed to update tracking');
    }
  };

  const filteredItems = items.filter((i) => {
    if (!searchQuery.trim()) return true;
    return i.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/n/admin/inventory" className="text-xs text-gray-500 hover:text-gray-900 flex items-center">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Inventory
              </Link>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Menu Item Stock Levels ({items.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Adjust stock quantities directly. Completed paid orders automatically decrement inventory.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Items Found"
            description="Add dishes in Menu Management to track inventory."
          />
        ) : (
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Dish</th>
                    <th className="pb-3 text-center">Tracked</th>
                    <th className="pb-3 text-center">Current Stock</th>
                    <th className="pb-3 text-center">Low Threshold</th>
                    <th className="pb-3 text-right">Adjust Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredItems.map((item) => {
                    const isLow =
                      item.stockTracked &&
                      (item.stockQuantity ?? 0) <= (item.lowStockThreshold ?? 10);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#22222A]/50">
                        <td className="py-3 font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            {isLow && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> Low
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleTracking(item)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                              item.stockTracked
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {item.stockTracked ? 'Yes' : 'No'}
                          </button>
                        </td>

                        <td className="py-3 text-center font-mono font-bold text-sm">
                          {item.stockTracked ? item.stockQuantity ?? 0 : '—'}
                        </td>

                        <td className="py-3 text-center text-gray-500">
                          {item.stockTracked ? `${item.lowStockThreshold || 10} units` : '—'}
                        </td>

                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdjustStock(item, -5)}
                              className="h-7 w-7 p-0"
                              title="-5 units"
                            >
                              -5
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdjustStock(item, -1)}
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdjustStock(item, 1)}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdjustStock(item, 10)}
                              className="h-7 px-2 text-xs"
                              title="+10 units"
                            >
                              +10
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
