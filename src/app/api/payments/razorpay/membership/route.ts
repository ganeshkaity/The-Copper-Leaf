import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { MembershipPlan, CustomerMembership } from '@/types';

// Step 1: Create Razorpay order for membership
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, planId, customerUid, customerName, customerEmail, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    if (action === 'create-order') {
      const planDoc = await adminDb.collection('membershipPlans').doc(planId).get();
      if (!planDoc.exists || !planDoc.data()?.active) {
        return NextResponse.json({ error: 'Membership plan is not available.' }, { status: 400 });
      }

      const plan = { ...planDoc.data(), id: planDoc.id } as MembershipPlan;
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return NextResponse.json({
          razorpayOrderId: `mem_mock_${Date.now()}`,
          amount: Math.round(plan.price * 100),
          currency: 'INR',
          keyId: keyId || 'rzp_test_placeholder',
          plan,
        });
      }

      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const order = await razorpay.orders.create({
        amount: Math.round(plan.price * 100),
        currency: 'INR',
        receipt: `mem_${Date.now()}`,
        notes: {
          planId: plan.id,
          customerUid,
        },
      });

      return NextResponse.json({
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        plan,
      });
    }

    if (action === 'verify-payment') {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (keySecret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
        const generated = crypto
          .createHmac('sha256', keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');
        if (generated !== razorpaySignature) {
          return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
        }
      }

      const planDoc = await adminDb.collection('membershipPlans').doc(planId).get();
      if (!planDoc.exists) {
        return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
      }
      const plan = { ...planDoc.data(), id: planDoc.id } as MembershipPlan;

      const now = Date.now();
      const durationMs = (plan.durationDays || 365) * 24 * 60 * 60 * 1000;
      const memRef = adminDb.collection('customerMemberships').doc();

      const newMembership: CustomerMembership = {
        id: memRef.id,
        customerUid,
        customerName,
        customerEmail,
        restaurantId: plan.restaurantId,
        planId: plan.id,
        planSnapshot: plan,
        startsAt: now,
        endsAt: now + durationMs,
        status: 'ACTIVE',
        razorpayPaymentId,
        createdAt: now,
      };

      await memRef.set(newMembership);

      return NextResponse.json({ success: true, membershipId: memRef.id });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Membership payment error:', error);
    return NextResponse.json({ error: error?.message || 'Membership operation failed.' }, { status: 500 });
  }
}
