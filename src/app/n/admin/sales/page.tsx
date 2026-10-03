'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order } from '@/types/order';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Percent,
  RotateCcw,
  ShoppingBag,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminSalesPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | '6months' | 'year' | 'all'>('month');

  useEffect(() => {
    async function loadSales() {
      if (!activeRestaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('restaurantId', '==', activeRestaurantId),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const list: Order[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Order);
        });
        setOrders(list);
      } catch (err) {
        console.error('Failed to load sales data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSales();
  }, [activeRestaurantId]);

  // Date filtering
  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (timeRange === 'all') return true;
    if (!o.createdAt?.seconds) return true;
    const d = new Date(o.createdAt.seconds * 1000);

    if (timeRange === 'today') {
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }
    if (timeRange === 'week') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return d >= past;
    }
    if (timeRange === 'month') {
      const past = new Date();
      past.setMonth(now.getMonth() - 1);
      return d >= past;
    }
    if (timeRange === '6months') {
      const past = new Date();
      past.setMonth(now.getMonth() - 6);
      return d >= past;
    }
    if (timeRange === 'year') {
      const past = new Date();
      past.setFullYear(now.getFullYear() - 1);
      return d >= past;
    }
    return true;
  });

  // Authoritative financial totals
  const totalOrdersCount = filteredOrders.length;
  const completedOrders = filteredOrders.filter((o) => o.orderStatus === 'COMPLETED');
  const paidOrders = filteredOrders.filter((o) => o.paymentStatus === 'PAID');

  const grossSales = filteredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalDiscounts = filteredOrders.reduce(
    (sum, o) => sum + (o.membershipDiscount || 0) + (o.couponDiscount || 0),
    0
  );
  const totalTaxes = filteredOrders.reduce((sum, o) => sum + (o.taxes || 0), 0);
  const totalCharges = filteredOrders.reduce((sum, o) => sum + (o.charges || 0), 0);
  const totalLoyaltyRedeemed = filteredOrders.reduce((sum, o) => sum + (o.loyaltyValue || 0), 0);
  const netPaid = paidOrders.reduce((sum, o) => sum + (o.finalPayable || 0), 0);
  const averageOrderValue = paidOrders.length > 0 ? Math.round(netPaid / paidOrders.length) : 0;

  // Breakdown by dish
  const itemSalesMap: { [name: string]: { count: number; revenue: number } } = {};
  filteredOrders.forEach((o) => {
    o.items?.forEach((i) => {
      const name = i.nameSnapshot || 'Dish';
      if (!itemSalesMap[name]) itemSalesMap[name] = { count: 0, revenue: 0 };
      itemSalesMap[name].count += i.quantity || 1;
      itemSalesMap[name].revenue += (i.unitPriceSnapshot || 0) * (i.quantity || 1);
    });
  });

  const dishBreakdown = Object.entries(itemSalesMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredOrders.map((o) => ({
      OrderNumber: o.orderNumber,
      Date: o.createdAt?.seconds
        ? new Date(o.createdAt.seconds * 1000).toISOString()
        : '',
      OrderType: o.orderType,
      Table: o.tableId || 'N/A',
      Subtotal: o.subtotal,
      Discounts: (o.membershipDiscount || 0) + (o.couponDiscount || 0),
      Taxes: o.taxes || 0,
      Charges: o.charges || 0,
      LoyaltyRedeemed: o.loyaltyValue || 0,
      FinalPayable: o.finalPayable,
      PaymentStatus: o.paymentStatus,
      OrderStatus: o.orderStatus,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
    XLSX.writeFile(wb, `Sales_${timeRange}_${currentRestaurant?.slug || 'copperleaf'}.xlsx`);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Sales Ledger & Financial Audit
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Authoritative revenue figures, gross receipts, taxes, discounts, and item performance for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'All Locations'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Time range selector */}
            <div className="flex items-center gap-1 bg-white dark:bg-[#18181D] p-1 rounded-xl border border-[#E8E0D5] dark:border-[#2A2A33] text-xs">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month' },
                { id: '6months', label: '6M' },
                { id: 'year', label: 'Year' },
                { id: 'all', label: 'All' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    timeRange === r.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredOrders.length === 0}>
              <Download className="w-4 h-4 mr-1.5" />
              Excel Export
            </Button>
          </div>
        </div>

        {/* Top 4 Financial Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Net Paid Revenue"
              value={`₹${netPaid.toLocaleString('en-IN')}`}
              icon={DollarSign}
              subtitle={`${paidOrders.length} settled orders`}
            />
            <StatCard
              title="Gross Sales Subtotal"
              value={`₹${grossSales.toLocaleString('en-IN')}`}
              icon={Receipt}
              subtitle="Before discounts & taxes"
            />
            <StatCard
              title="Average Order Value"
              value={`₹${averageOrderValue.toLocaleString('en-IN')}`}
              icon={TrendingUp}
              subtitle="Per paid dining check"
            />
            <StatCard
              title="Total Discounts"
              value={`₹${totalDiscounts.toLocaleString('en-IN')}`}
              icon={Percent}
              subtitle="VIP tiers & promo coupons"
            />
          </div>
        )}

        {/* Secondary Financial Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500">Collected Taxes</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">₹{totalTaxes}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500">Service Charges</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">₹{totalCharges}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500">Loyalty Redeemed</p>
            <p className="text-xl font-bold text-amber-600 mt-1">₹{totalLoyaltyRedeemed}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500">Total Orders Placed</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{totalOrdersCount}</p>
          </div>
        </div>

        {/* Dish Revenue Breakdown Table */}
        <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
          <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white mb-4">
            Menu Item Sales Breakdown ({dishBreakdown.length} Dishes Sold)
          </h2>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : dishBreakdown.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No Sales Recorded in Period"
              description="No completed orders or item sales recorded for the selected time filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Menu Item</th>
                    <th className="pb-3 text-center">Quantity Sold</th>
                    <th className="pb-3 text-right">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dishBreakdown.map((dish) => (
                    <tr key={dish.name} className="hover:bg-gray-50 dark:hover:bg-[#22222A]/50">
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {dish.name}
                      </td>
                      <td className="py-3 text-center text-gray-600 dark:text-gray-400">
                        {dish.count}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                        ₹{dish.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
