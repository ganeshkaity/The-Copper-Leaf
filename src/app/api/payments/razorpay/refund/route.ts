import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getAdminDb } from '@/lib/firebase/admin';
import { PaymentRecord, RefundRecord } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, amount, reason, adminUid, adminName } = body;

    if (!paymentId || !amount || !reason || !adminUid) {
      return NextResponse.json(
        { error: 'Missing required refund fields (paymentId, amount, reason, adminUid).' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    // Verify admin role
    const adminUserDoc = await adminDb.collection('users').doc(adminUid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only ADMIN can process refunds.' }, { status: 403 });
    }

    const paymentDoc = await adminDb.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    const payment = paymentDoc.data() as PaymentRecord;
    let gatewayRefundId: string | undefined = undefined;

    if (payment.provider === 'RAZORPAY' && payment.razorpayPaymentId) {
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (keyId && keySecret) {
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const refundRes = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: Math.round(amount * 100),
          notes: { reason, refundedBy: adminName || adminUid },
        });
        gatewayRefundId = refundRes.id;
      }
    }

    const now = Date.now();
    const refundRecord: RefundRecord = {
      refundId: `ref_${now}`,
      amount,
      reason,
      refundedByUid: adminUid,
      refundedByName: adminName,
      gatewayRefundId,
      refundedAt: now,
    };

    const existingRefunds = payment.refunds || [];
    existingRefunds.push(refundRecord);

    await paymentDoc.ref.update({
      refunds: existingRefunds,
      status: 'REFUNDED',
    });

    if (payment.orderId) {
      await adminDb.collection('orders').doc(payment.orderId).update({
        paymentStatus: 'REFUNDED',
        cancellationReason: `Refunded: ${reason}`,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true, refundRecord });
  } catch (error: any) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process refund.' },
      { status: 500 }
    );
  }
}
