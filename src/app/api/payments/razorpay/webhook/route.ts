import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { PaymentStatus, PaymentMethod } from '@/types';

function mapRazorpayMethod(method?: string): PaymentMethod {
  if (!method) return 'UPI';
  const m = method.toLowerCase();
  if (m === 'upi') return 'UPI';
  if (m === 'card') return 'CARD';
  if (m === 'netbanking') return 'NETBANKING';
  return 'UPI';
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    // Cryptographic signature validation
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('Razorpay webhook signature mismatch.');
        return NextResponse.json(
          { error: 'Invalid webhook signature.' },
          { status: 400 }
        );
      }
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database service unavailable.' },
        { status: 503 }
      );
    }

    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.event;

    // Idempotency: Prevent duplicate execution of the same event
    const eventRef = adminDb.collection('webhookEvents').doc(eventId);
    const eventDoc = await eventRef.get();
    if (eventDoc.exists) {
      return NextResponse.json(
        { received: true, message: 'Event already processed.' },
        { status: 200 }
      );
    }

    // Record webhook event in audit collection
    await eventRef.set({
      eventId,
      eventType,
      receivedAt: Date.now(),
      eventCreated: event.created_at || Date.now(),
    });

    const now = Date.now();

    // 1. Payment Captured (Successful payment)
    if (eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const method = mapRazorpayMethod(paymentEntity.method);

        // Find associated payment record in Firestore
        let paymentDocRef: FirebaseFirestore.DocumentReference | null = null;
        let paymentData: any = null;

        if (orderId) {
          const qOrder = await adminDb
            .collection('payments')
            .where('razorpayOrderId', '==', orderId)
            .limit(1)
            .get();
          if (!qOrder.empty && qOrder.docs[0]) {
            paymentDocRef = qOrder.docs[0].ref;
            paymentData = qOrder.docs[0].data();
          }
        }

        if (!paymentDocRef && paymentId) {
          const qPay = await adminDb
            .collection('payments')
            .where('razorpayPaymentId', '==', paymentId)
            .limit(1)
            .get();
          if (!qPay.empty && qPay.docs[0]) {
            paymentDocRef = qPay.docs[0].ref;
            paymentData = qPay.docs[0].data();
          }
        }

        if (paymentDocRef) {
          // Update payment record to PAID
          await paymentDocRef.update({
            status: 'PAID' as PaymentStatus,
            method,
            razorpayPaymentId: paymentId,
            paidAt: now,
            updatedAt: now,
          });

          // Update associated order if not already marked PAID
          const targetOrderId = paymentData?.orderId || paymentEntity.notes?.orderId;
          if (targetOrderId) {
            const orderDoc = await adminDb.collection('orders').doc(targetOrderId).get();
            if (orderDoc.exists && orderDoc.data()?.paymentStatus !== 'PAID') {
              const currentOrder = orderDoc.data();
              await orderDoc.ref.update({
                paymentStatus: 'PAID' as PaymentStatus,
                orderStatus: currentOrder?.orderStatus === 'PENDING' ? 'CONFIRMED' : currentOrder?.orderStatus,
                updatedAt: now,
              });
            }
          }
        } else {
          // Reconcile and record orphan payment if payment record wasn't created yet
          const notes = paymentEntity.notes || {};
          const fallbackPaymentRef = adminDb.collection('payments').doc();
          await fallbackPaymentRef.set({
            id: fallbackPaymentRef.id,
            restaurantId: notes.restaurantId || 'unknown',
            orderId: notes.orderId || null,
            customerUid: notes.customerUid || 'anonymous',
            provider: 'RAZORPAY',
            method,
            amount: (paymentEntity.amount || 0) / 100, // paise to INR
            status: 'PAID' as PaymentStatus,
            razorpayOrderId: orderId || null,
            razorpayPaymentId: paymentId,
            createdAt: now,
            paidAt: now,
            reconciledViaWebhook: true,
          });

          if (notes.orderId) {
            const orderDoc = await adminDb.collection('orders').doc(notes.orderId).get();
            if (orderDoc.exists) {
              await orderDoc.ref.update({
                paymentStatus: 'PAID' as PaymentStatus,
                updatedAt: now,
              });
            }
          }
        }
      }
    }

    // 2. Payment Failed
    else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        const q = await adminDb
          .collection('payments')
          .where('razorpayOrderId', '==', orderId)
          .limit(1)
          .get();

        if (!q.empty && q.docs[0]) {
          await q.docs[0].ref.update({
            status: 'FAILED' as PaymentStatus,
            failureReason: paymentEntity.error_description || 'Payment failed',
            updatedAt: now,
          });

          const pData = q.docs[0].data();
          if (pData?.orderId) {
            const orderRef = adminDb.collection('orders').doc(pData.orderId);
            await orderRef.update({
              paymentStatus: 'FAILED' as PaymentStatus,
              updatedAt: now,
            });
          }
        }
      }
    }

    // 3. Refund Processed or Created
    else if (eventType === 'refund.processed' || eventType === 'refund.created') {
      const refundEntity = event.payload?.refund?.entity;
      if (refundEntity) {
        const paymentId = refundEntity.payment_id;
        const q = await adminDb
          .collection('payments')
          .where('razorpayPaymentId', '==', paymentId)
          .limit(1)
          .get();

        if (!q.empty && q.docs[0]) {
          const paymentRef = q.docs[0].ref;
          const paymentData = q.docs[0].data();

          await paymentRef.update({
            status: 'REFUNDED' as PaymentStatus,
            updatedAt: now,
          });

          if (paymentData?.orderId) {
            const orderRef = adminDb.collection('orders').doc(paymentData.orderId);
            await orderRef.update({
              paymentStatus: 'REFUNDED' as PaymentStatus,
              updatedAt: now,
            });
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error: any) {
    console.error('Razorpay webhook processing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
