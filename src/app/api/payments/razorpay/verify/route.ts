import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  generateOrderNumber,
  generateBillNumber,
} from '@/lib/utils';
import {
  calculateEarnedLoyaltyPoints,
} from '@/lib/pricing/pricing-engine';
import { sendOrderConfirmationEmail } from '@/lib/services/email-service';
import { Order, PaymentRecord } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderData,
      pricing,
      itemSnapshots,
    } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify signature if credentials are live
    if (keySecret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        return NextResponse.json({ error: 'Invalid payment signature.' }, { status: 400 });
      }
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    const now = Date.now();
    const orderNumber = generateOrderNumber();
    const orderRef = adminDb.collection('orders').doc();

    const newOrder: Order = {
      id: orderRef.id,
      orderNumber,
      restaurantId: orderData.restaurantId,
      restaurantNameSnapshot: orderData.restaurantName || 'The Copper Leaf',
      customerUid: orderData.customerUid || 'anonymous',
      customerName: orderData.customerName || 'Guest Customer',
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      source: orderData.source || 'ONLINE_WEB',
      orderType: orderData.orderType || 'DINE_IN',
      tableId: orderData.tableId,
      tableNumberSnapshot: orderData.tableNumber,
      items: itemSnapshots,
      pricing,
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
      notes: orderData.notes,
      createdAt: now,
      updatedAt: now,
    };

    await orderRef.set(newOrder);

    // Create payment record
    const paymentRef = adminDb.collection('payments').doc();
    const paymentRecord: PaymentRecord = {
      id: paymentRef.id,
      restaurantId: orderData.restaurantId,
      orderId: orderRef.id,
      customerUid: orderData.customerUid || 'anonymous',
      customerName: orderData.customerName,
      provider: 'RAZORPAY',
      method: 'UPI',
      amount: pricing.finalPayable,
      status: 'PAID',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
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
        currentOrderId: orderRef.id,
        currentOrderDishSummary: dishSummary,
        currentOrderValue: pricing.finalPayable,
        updatedAt: now,
      }).catch((e) => console.warn('Could not update table:', e));
    }

    // Deduct stock for stock-tracked items (Requirement 53)
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

          // Record stock adjustment
          await adminDb.collection('stockAdjustments').add({
            restaurantId: orderData.restaurantId,
            menuItemId: item.menuItemId,
            menuItemName: item.nameSnapshot,
            previousQuantity: currentQty,
            adjustmentQuantity: -item.quantity,
            newQuantity: newQty,
            reason: 'ORDER_FULFILLED',
            referenceId: orderRef.id,
            adjustedByUid: 'SYSTEM',
            adjustedByName: 'Automatic Order Fulfilled',
            createdAt: now,
          });
        }
      }
    }

    // Handle Loyalty Points: Deduct redeemed points + Award newly earned points
    if (orderData.customerUid && orderData.customerUid !== 'anonymous') {
      const loyaltyRef = adminDb.collection('loyaltyAccounts').doc(`${orderData.customerUid}_${orderData.restaurantId}`);
      const loyaltySnap = await loyaltyRef.get();
      let currentBal = loyaltySnap.exists ? loyaltySnap.data()?.balance || 0 : 0;
      let lifetimeEarned = loyaltySnap.exists ? loyaltySnap.data()?.lifetimeEarned || 0 : 0;
      let lifetimeRedeemed = loyaltySnap.exists ? loyaltySnap.data()?.lifetimeRedeemed || 0 : 0;

      // Deduct redeemed points
      if (pricing.loyaltyPointsRedeemed > 0) {
        currentBal = Math.max(0, currentBal - pricing.loyaltyPointsRedeemed);
        lifetimeRedeemed += pricing.loyaltyPointsRedeemed;

        await adminDb.collection('loyaltyTransactions').add({
          customerUid: orderData.customerUid,
          restaurantId: orderData.restaurantId,
          type: 'REDEEMED',
          points: -pricing.loyaltyPointsRedeemed,
          balanceAfter: currentBal,
          referenceType: 'ORDER',
          referenceId: orderRef.id,
          description: `Redeemed for Order ${orderNumber}`,
          createdAt: now,
        });
      }

      // Award newly earned points on final money actually paid
      const earnedPoints = calculateEarnedLoyaltyPoints(pricing.finalPayable);
      if (earnedPoints > 0) {
        currentBal += earnedPoints;
        lifetimeEarned += earnedPoints;

        await adminDb.collection('loyaltyTransactions').add({
          customerUid: orderData.customerUid,
          restaurantId: orderData.restaurantId,
          type: 'EARNED',
          points: earnedPoints,
          balanceAfter: currentBal,
          referenceType: 'ORDER',
          referenceId: orderRef.id,
          description: `Earned from Order ${orderNumber}`,
          createdAt: now,
        });
      }

      await loyaltyRef.set({
        customerUid: orderData.customerUid,
        restaurantId: orderData.restaurantId,
        balance: currentBal,
        lifetimeEarned,
        lifetimeRedeemed,
        updatedAt: now,
      }, { merge: true });
    }

    // Increment coupon used count if used
    if (pricing.couponCode) {
      const couponQuery = await adminDb
        .collection('coupons')
        .where('code', '==', pricing.couponCode)
        .limit(1)
        .get();

      if (!couponQuery.empty) {
        const cDoc = couponQuery.docs[0];
        await cDoc.ref.update({
          usedCount: (cDoc.data().usedCount || 0) + 1,
          updatedAt: now,
        });
      }
    }

    // Send confirmation email
    if (orderData.customerEmail) {
      sendOrderConfirmationEmail(newOrder, orderData.customerEmail).catch((e) =>
        console.warn('Could not send order confirmation email:', e)
      );
    }

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      orderNumber,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify payment.' },
      { status: 500 }
    );
  }
}
