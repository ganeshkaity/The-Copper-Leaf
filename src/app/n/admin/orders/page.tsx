'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order, OrderStatus } from '@/types/order';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOrdersPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Cancellation Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Food quality issue');
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Realtime Firestore onSnapshot for orders
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('restaurantId', '==', activeRestaurantId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Order);
        });
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error streaming orders:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeRestaurantId]);

  // Status Filter Tabs
  const tabs = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'PREPARING', label: 'Preparing' },
    { id: 'READY', label: 'Ready' },
    { id: 'SERVED', label: 'Served' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  // Counters
  const countPending = orders.filter((o) => o.orderStatus === 'PENDING').length;
  const countPreparing = orders.filter((o) => o.orderStatus === 'PREPARING').length;
  const countServed = orders.filter((o) => o.orderStatus === 'SERVED').length;
  const countCompleted = orders.filter((o) => o.orderStatus === 'COMPLETED').length;
  const countCancelled = orders.filter((o) => o.orderStatus === 'CANCELLED').length;

  // Filtered list
  const filteredOrders = orders.filter((o) => {
    // Tab filter
    if (activeTab !== 'ALL' && o.orderStatus !== activeTab) return false;

    // Search query filter (orderNumber, tableId, customerName, or item name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrderNum = o.orderNumber?.toLowerCase().includes(q);
      const matchTable = o.tableId?.toLowerCase().includes(q);
      const matchItem = o.items?.some((i) => i.nameSnapshot?.toLowerCase().includes(q));
      if (!matchOrderNum && !matchTable && !matchItem) return false;
    }

    return true;
  });

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const payload: any = {
        orderStatus: newStatus,
        updatedAt: serverTimestamp(),
      };
      if (newStatus === 'COMPLETED') {
        payload.completedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'orders', orderId), payload);
      toast.success(`Order status updated to ${newStatus}`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: newStatus } : null));
      }
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleOpenCancelModal = (order: Order) => {
    setSelectedOrder(order);
    setCancelReason('Food quality issue');
    setCustomReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    setCancelling(true);
    try {
      const reason = cancelReason === 'Other' ? customReason.trim() : cancelReason;
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        orderStatus: 'CANCELLED',
        cancellationReason: reason || 'Cancelled by Administrator',
        updatedAt: serverTimestamp(),
      });
      toast.success('Order has been cancelled');
      setIsCancelModalOpen(false);
    } catch (err: any) {
      toast.error('Cancellation failed: ' + err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Incoming Orders
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Live order feed, kitchen dispatch status, and fulfillment tracking for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'All Locations'}
              </span>
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, table, dish..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Real Stats Cards (Top metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-[11px] text-gray-500 uppercase font-semibold">Total Orders</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{orders.length}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-[11px] text-amber-600 uppercase font-semibold">Pending</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{countPending}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-[11px] text-blue-600 uppercase font-semibold">Preparing</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{countPreparing}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-[11px] text-purple-600 uppercase font-semibold">Served</p>
            <p className="text-xl font-bold text-purple-600 mt-1">{countServed}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-[11px] text-emerald-600 uppercase font-semibold">Completed</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{countCompleted}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-[11px] text-rose-600 uppercase font-semibold">Cancelled</p>
            <p className="text-xl font-bold text-rose-600 mt-1">{countCancelled}</p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 border-b border-[#E8E0D5] dark:border-[#2A2A33] pb-2 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#22222A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No Orders in this View"
            description="There are currently no orders matching your selected status filter or search parameters."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const formattedTime = order.createdAt?.seconds
                ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Just now';

              return (
                <Card
                  key={order.id}
                  className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase">
                          {order.orderType}
                        </span>
                      </div>
                      <StatusBadge status={order.orderStatus} />
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between py-2 text-xs text-gray-500">
                      <span>{formattedTime}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {order.tableId ? `Table ${order.tableId}` : 'Takeaway Order'}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="py-2 space-y-1">
                      {order.items?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                          <span className="truncate pr-2">
                            {item.quantity}x {item.nameSnapshot}
                          </span>
                          <span className="font-mono text-gray-500 shrink-0">
                            ₹{(item.unitPriceSnapshot || 0) * (item.quantity || 1)}
                          </span>
                        </div>
                      ))}
                      {(order.items?.length || 0) > 3 && (
                        <p className="text-[10px] text-gray-400 italic">
                          +{order.items.length - 3} more items...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Total Due</span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">
                        ₹{order.finalPayable}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsOpen(true);
                        }}
                        className="text-xs px-2.5"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>

                      {order.orderStatus === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                          className="text-xs px-2.5"
                        >
                          Confirm
                        </Button>
                      )}

                      {order.orderStatus === 'READY' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                          className="text-xs px-2.5"
                        >
                          Mark Served
                        </Button>
                      )}

                      {order.orderStatus === 'SERVED' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                          className="text-xs px-2.5"
                        >
                          Complete
                        </Button>
                      )}

                      {order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenCancelModal(order)}
                          className="text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detailed Order Snapshot Modal */}
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Order #${selectedOrder?.orderNumber || ''}`}
        >
          {selectedOrder && (
            <div className="space-y-5 text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedOrder.tableId ? `Table ${selectedOrder.tableId}` : 'Takeaway Order'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Source: {selectedOrder.source || 'Online Dine-in'}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={selectedOrder.orderStatus} />
                  <p className="text-xs text-gray-400 mt-1">
                    Payment: <span className="font-semibold">{selectedOrder.paymentStatus}</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <p className="font-semibold text-xs text-gray-500 uppercase tracking-wider">
                  Ordered Dishes ({selectedOrder.items?.length || 0})
                </p>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="py-2.5 space-y-1">
                      <div className="flex justify-between font-medium text-gray-900 dark:text-white">
                        <span>
                          {item.quantity}x {item.nameSnapshot}
                        </span>
                        <span>₹{(item.unitPriceSnapshot || 0) * (item.quantity || 1)}</span>
                      </div>

                      {item.variantSnapshot && (
                        <p className="text-xs text-gray-500">
                          Variant: {item.variantSnapshot.name} (+₹{item.variantSnapshot.price})
                        </p>
                      )}

                      {item.modifierSnapshot && item.modifierSnapshot.length > 0 && (
                        <p className="text-xs text-gray-500">
                          Add-ons: {item.modifierSnapshot.map((m) => m.name).join(', ')}
                        </p>
                      )}

                      {item.removedIngredients && item.removedIngredients.length > 0 && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          No: {item.removedIngredients.join(', ')}
                        </p>
                      )}

                      {item.specialInstructions && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                          "{item.specialInstructions}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Authoritative Financial Breakdown */}
              <div className="pt-4 border-t border-gray-100 dark:divide-gray-800 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{selectedOrder.subtotal}</span>
                </div>
                {selectedOrder.membershipDiscount ? (
                  <div className="flex justify-between text-emerald-600">
                    <span>VIP Member Discount</span>
                    <span>-₹{selectedOrder.membershipDiscount}</span>
                  </div>
                ) : null}
                {selectedOrder.couponDiscount ? (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon Discount</span>
                    <span>-₹{selectedOrder.couponDiscount}</span>
                  </div>
                ) : null}
                {selectedOrder.taxes ? (
                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span>₹{selectedOrder.taxes}</span>
                  </div>
                ) : null}
                {selectedOrder.charges ? (
                  <div className="flex justify-between">
                    <span>Charges</span>
                    <span>₹{selectedOrder.charges}</span>
                  </div>
                ) : null}
                {selectedOrder.loyaltyValue ? (
                  <div className="flex justify-between text-amber-600">
                    <span>Loyalty Points Redeemed ({selectedOrder.loyaltyPointsUsed} pts)</span>
                    <span>-₹{selectedOrder.loyaltyValue}</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-900 dark:text-white">
                  <span>Final Payable Amount</span>
                  <span>₹{selectedOrder.finalPayable}</span>
                </div>
              </div>

              {selectedOrder.cancellationReason && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs">
                  <p className="font-semibold">Cancellation Reason:</p>
                  <p className="mt-0.5">{selectedOrder.cancellationReason}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Cancellation Reason Modal */}
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancel Order with Stored Reason"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Per restaurant auditing rules, cancellation reasons are permanently stored on the order snapshot.
            </p>

            <div className="space-y-2">
              {[
                'Food quality issue',
                'Food was cold / delayed',
                'Major service issue',
                'Customer walked out',
                'Duplicate order created',
                'Other',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                    cancelReason === reason
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="text-primary"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {cancelReason === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Specify Custom Reason
                </label>
                <Input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter specific managerial cancellation note..."
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelling}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminShell>
  );
}
