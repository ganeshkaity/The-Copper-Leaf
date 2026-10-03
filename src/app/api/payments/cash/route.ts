import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { generateOrderNumber } from '@/lib/utils';
import { calculateEarnedLoyaltyPoints } from '@/lib/pricing/pricing-engine';
import { sendOrderConfirmationEmail } from '@/lib/services/email-service';
import { Order, PaymentRecord } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderData,
      pricing,
      itemSnapshots,
      receivedByStaffUid,
      receivedByStaffName,
    } = body;

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    const now = Date.now();

    // If order already exists in Firestore (e.g. customer placed order and called waiter to pay cash)
    if (orderId) {
      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
      }

      const existingOrder = orderSnap.data() as Order;
      await orderRef.update({
        paymentStatus: 'PAID',
        updatedAt: now,
      });

      // Record cash payment
      const paymentRef = adminDb.collection('payments').doc();
      const paymentRecord: PaymentRecord = {
        id: paymentRef.id,
        restaurantId: existingOrder.restaurantId,
        orderId: existingOrder.id,
        customerUid: existingOrder.customerUid,
        customerName: existingOrder.customerName,
        provider: 'CASH',
        method: 'CASH',
        amount: existingOrder.pricing.finalPayable,
        status: 'PAID',
        receivedByStaffUid,
        receivedByStaffName,
        createdAt: now,
        paidAt: now,
      };
      await paymentRef.set(paymentRecord);

      // Award loyalty points if customer is known
      if (existingOrder.customerUid && existingOrder.customerUid !== 'anonymous') {
        const earned = calculateEarnedLoyaltyPoints(existingOrder.pricing.finalPayable);
        if (earned > 0) {
          const loyaltyRef = adminDb
            .collection('loyaltyAccounts')
            .doc(`${existingOrder.customerUid}_${existingOrder.restaurantId}`);
          const loyaltySnap = await loyaltyRef.get();
          const currentBal = loyaltySnap.exists ? loyaltySnap.data()?.balance || 0 : 0;
          const lifetimeEarned = loyaltySnap.exists ? loyaltySnap.data()?.lifetimeEarned || 0 : 0;

          await loyaltyRef.set(
            {
              balance: currentBal + earned,
              lifetimeEarned: lifetimeEarned + earned,
              updatedAt: now,
            },
            { merge: true }
          );

          await adminDb.collection('loyaltyTransactions').add({
            customerUid: existingOrder.customerUid,
            restaurantId: existingOrder.restaurantId,
            type: 'EARNED',
            points: earned,
            balanceAfter: currentBal + earned,
            referenceType: 'ORDER',
            referenceId: existingOrder.id,
            description: `Earned from Cash Order ${existingOrder.orderNumber}`,
            createdAt: now,
          });
        }
      }

      return NextResponse.json({ success: true, orderId: existingOrder.id });
    }

    // Otherwise, direct POS creation with immediate cash payment
    const orderNumber = generateOrderNumber();
    const newOrderRef = adminDb.collection('orders').doc();

    const newOrder: Order = {
      id: newOrderRef.id,
      orderNumber,
      restaurantId: orderData.restaurantId,
      restaurantNameSnapshot: orderData.restaurantName || 'The Copper Leaf',
      customerUid: orderData.customerUid || 'walkin',
      customerName: orderData.customerName || 'Walk-in Guest',
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      source: 'WAITER_POS',
      orderType: orderData.orderType || 'DINE_IN',
      tableId: orderData.tableId,
      tableNumberSnapshot: orderData.tableNumber,
      waiterId: receivedByStaffUid,
      waiterNameSnapshot: receivedByStaffName,
      items: itemSnapshots,
      pricing,
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
      notes: orderData.notes,
      createdAt: now,
      updatedAt: now,
    };

    await newOrderRef.set(newOrder);

    // Record cash payment
    const paymentRef = adminDb.collection('payments').doc();
    const paymentRecord: PaymentRecord = {
      id: paymentRef.id,
      restaurantId: orderData.restaurantId,
      orderId: newOrderRef.id,
      customerUid: orderData.customerUid || 'walkin',
      customerName: orderData.customerName || 'Walk-in Guest',
      provider: 'CASH',
      method: 'CASH',
      amount: pricing.finalPayable,
      status: 'PAID',
      receivedByStaffUid,
      receivedByStaffName,
      createdAt: now,
      paidAt: now,
    };
    await paymentRef.set(paymentRecord);

    // Update table status if dine-in
    if (orderData.tableId) {
      const tableRef = adminDb.collection('tables').doc(orderData.tableId);
      const dishSummary = itemSnapshots.map((i: any) => i.nameSnapshot).slice(0, 3).join(', ');
      await tableRef.update({
        status: 'OCCUPIED',
        currentOrderId: newOrderRef.id,
        currentOrderDishSummary: dishSummary,
        currentOrderValue: pricing.finalPayable,
        updatedAt: now,
      }).catch((e) => console.warn('Could not update table:', e));
    }

    // Deduct stock for stock-tracked items
    for (const item of itemSnapshots) {
      if (item.menuItemId) {
        const itemDoc = await adminDb.collection('menuItems').doc(item.menuItemId).get();
        if (itemDoc.exists && itemDoc.data()?.stockTracked) {
          const currentQty = itemDoc.data()?.stockQuantity || 0;
          const newQty = Math.max(0, currentQty - item.quantity);
          await itemDoc.ref.update({
            stockQuantity: newQty,
            updatedAt: now,
          });

          await adminDb.collection('stockAdjustments').add({
            restaurantId: orderData.restaurantId,
            menuItemId: item.menuItemId,
            menuItemName: item.nameSnapshot,
            previousQuantity: currentQty,
            adjustmentQuantity: -item.quantity,
            newQuantity: newQty,
            reason: 'ORDER_FULFILLED',
            referenceId: newOrderRef.id,
            adjustedByUid: receivedByStaffUid || 'STAFF',
            adjustedByName: receivedByStaffName || 'Staff Cash Payment',
            createdAt: now,
          });
        }
      }
    }

    if (orderData.customerEmail) {
      sendOrderConfirmationEmail(newOrder, orderData.customerEmail).catch((e) =>
        console.warn('Could not send order confirmation email:', e)
      );
    }

    return NextResponse.json({
      success: true,
      orderId: newOrderRef.id,
      orderNumber,
    });
  } catch (error: any) {
    console.error('Cash payment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record cash payment.' },
      { status: 500 }
    );
  }
}
