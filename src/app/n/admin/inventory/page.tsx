'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  Package,
  AlertTriangle,
  BookOpen,
  ShoppingBag,
  TrendingDown,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminInventoryPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Failed to load inventory items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeRestaurantId]);

  const stockTrackedItems = items.filter((i) => i.stockTracked);
  const lowStockItems = stockTrackedItems.filter(
    (i) => (i.stockQuantity ?? 0) <= (i.lowStockThreshold ?? 10)
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Inventory & Stock Oversight (V1)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Menu-item level stock balances, low-stock threshold alerts, and culinary recipes for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'All Locations'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/n/admin/inventory/recipes">
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-1.5" />
                Recipe Builder
              </Button>
            </Link>
            <Link href="/n/admin/inventory/purchases">
              <Button variant="outline" size="sm">
                <ShoppingBag className="w-4 h-4 mr-1.5" />
                Log Purchases
              </Button>
            </Link>
            <Link href="/n/admin/inventory/stock">
              <Button size="sm">
                <Package className="w-4 h-4 mr-1.5" />
                Manage Stock Levels
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Menu Items</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{items.length}</p>
          </Card>
          <Card className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <p className="text-xs text-blue-600 font-semibold uppercase">Tracked in Stock</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stockTrackedItems.length}</p>
          </Card>
          <Card className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <p className="text-xs text-rose-600 font-semibold uppercase">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{lowStockItems.length}</p>
          </Card>
        </div>

        {/* Low Stock Urgent Alerts Table */}
        <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Low Stock Warnings ({lowStockItems.length})
            </h2>
            <Link href="/n/admin/inventory/stock" className="text-xs text-primary font-semibold hover:underline">
              Adjust Stock →
            </Link>
          </div>

          {loading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : lowStockItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No items are currently below their low stock threshold.
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">{item.name}</span>
                    <span className="text-gray-500 ml-2">
                      Threshold: {item.lowStockThreshold || 10} units
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {item.stockQuantity ?? 0} units left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Navigation Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/n/admin/inventory/recipes">
            <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-primary flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                Recipe Management (V1)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Document chef preparation guidelines, ingredient proportions, and cost per portion.
              </p>
            </Card>
          </Link>

          <Link href="/n/admin/inventory/purchases">
            <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                Log Purchases
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Track incoming stock purchases, vendor costs, and replenishment entries.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
