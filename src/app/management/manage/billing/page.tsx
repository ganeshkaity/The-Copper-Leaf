'use client';

import React, { useEffect, useState } from 'react';
import { WaiterShell } from '@/components/layout/waiter-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { useAuth } from '@/lib/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order } from '@/types/order';
import {
  Receipt,
  CreditCard,
  DollarSign,
  Download,
  Split,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function WaiterBillingPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const { profile, user } = useAuth();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Settlement Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'RAZORPAY'>('CASH');
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Unpaid active orders
    const ordQ = query(
      collection(db, 'orders'),
      where('restaurantId', '==', activeRestaurantId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(ordQ, (snap) => {
      const list: Order[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));
      setOrders(list);
      setLoading(false);
    });

    return () => unsub();
  }, [activeRestaurantId]);

  const unpaidOrders = orders.filter((o) => o.paymentStatus !== 'PAID' && o.orderStatus !== 'CANCELLED');

  const handleOpenSettle = (order: Order) => {
    setSelectedOrder(order);
    setPaymentMethod('CASH');
    setIsSettleModalOpen(true);
  };

  const handleCompleteCashPayment = async () => {
    if (!selectedOrder || !activeRestaurantId) return;

    setSettling(true);
    try {
      // Secure server call to register cash payment and update order
      const res = await fetch('/api/payments/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          restaurantId: activeRestaurantId,
          amount: selectedOrder.finalPayable,
          receivedBy: profile?.displayName || user?.email || 'Staff Waiter',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Cash payment failed');
      }

      toast.success(`Payment of ₹${selectedOrder.finalPayable} collected in Cash! Check finalized.`);
      setIsSettleModalOpen(false);
    } catch (err: any) {
      toast.error('Settlement error: ' + err.message);
    } finally {
      setSettling(false);
    }
  };

  const handleDownloadInvoice = (order: Order) => {
    const doc = new jsPDF();
    const restName = currentRestaurant?.name || 'The Copper Leaf';

    doc.setFontSize(18);
    doc.text(restName, 14, 20);
    doc.setFontSize(10);
    doc.text(`Tax Invoice • Order #${order.orderNumber}`, 14, 28);
    doc.text(`Table: ${order.tableId || 'Takeaway'}`, 14, 34);
    doc.text(
      `Date: ${order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString('en-IN') : 'Today'}`,
      14,
      40
    );

    const rows = order.items.map((i) => [
      i.nameSnapshot,
      `${i.quantity}`,
      `₹${i.unitPriceSnapshot}`,
      `₹${i.quantity * i.unitPriceSnapshot}`,
    ]);

    autoTable(doc, {
      startY: 46,
      head: [['Dish Item', 'Qty', 'Unit Price', 'Amount']],
      body: rows,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Subtotal: ₹${order.subtotal}`, 14, finalY);
    if (order.membershipDiscount) doc.text(`VIP Discount: -₹${order.membershipDiscount}`, 14, finalY + 6);
    if (order.couponDiscount) doc.text(`Coupon Discount: -₹${order.couponDiscount}`, 14, finalY + 12);
    doc.text(`Taxes: ₹${order.taxes || 0}`, 14, finalY + 18);
    doc.setFontSize(12);
    doc.text(`Total Amount Due: ₹${order.finalPayable}`, 14, finalY + 26);

    doc.save(`Invoice_${order.orderNumber}.pdf`);
    toast.success('Invoice PDF downloaded');
  };

  return (
    <WaiterShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Table Billing & Cash Settlement
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate dining invoices, split checks, and collect cash payments at the table.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : unpaidOrders.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="All Dining Checks Settled"
            description="There are currently no unpaid active dining orders on the floor."
          />
        ) : (
          <div className="space-y-3">
            {unpaidOrders.map((order) => (
              <Card
                key={order.id}
                className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-serif text-xl font-bold text-gray-900 dark:text-white">
                      {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
                    </span>
                    <span className="font-mono text-xs text-gray-400">#{order.orderNumber}</span>
                    <StatusBadge status={order.paymentStatus} />
                  </div>

                  <p className="text-xs text-gray-500">
                    {order.items?.length || 0} items • Subtotal: ₹{order.subtotal} • Taxes: ₹{order.taxes || 0}
                  </p>

                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                    Payable: ₹{order.finalPayable}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadInvoice(order)}
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Invoice PDF
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleOpenSettle(order)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1" />
                    Collect Payment
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Settlement Modal */}
        <Modal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          title={`Settle Bill: Table ${selectedOrder?.tableId || ''} (#${selectedOrder?.orderNumber || ''})`}
        >
          {selectedOrder && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-[#2A1C14] text-center">
                <span className="text-xs text-gray-500 uppercase font-semibold">Total Amount Due</span>
                <p className="text-3xl font-extrabold text-primary mt-1">
                  ₹{selectedOrder.finalPayable}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Cash at Table
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('RAZORPAY')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'RAZORPAY'
                        ? 'border-primary bg-orange-50 text-primary ring-2 ring-primary/20'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Customer Online
                  </button>
                </div>
              </div>

              {paymentMethod === 'CASH' ? (
                <p className="text-xs text-gray-500 bg-gray-50 dark:bg-[#22222A] p-3 rounded-xl">
                  Confirm that you have received <strong>₹{selectedOrder.finalPayable} in cash</strong> from the guests. The system will authoritatively record the received amount and settle the bill.
                </p>
              ) : (
                <p className="text-xs text-gray-500 bg-gray-50 dark:bg-[#22222A] p-3 rounded-xl">
                  The guest can complete online settlement directly on their mobile device by opening the order tracking link.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button
                  variant="outline"
                  onClick={() => setIsSettleModalOpen(false)}
                  disabled={settling}
                >
                  Cancel
                </Button>

                {paymentMethod === 'CASH' && (
                  <Button
                    onClick={handleCompleteCashPayment}
                    disabled={settling}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {settling ? 'Settling...' : 'Confirm Cash Received'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </WaiterShell>
  );
}
