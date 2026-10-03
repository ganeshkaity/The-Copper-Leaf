import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getAdminDb } from '@/lib/firebase/admin';
import { calculateOrderPricing } from '@/lib/pricing/pricing-engine';
import {
  OrderItemSnapshot,
  TaxRule,
  ChargeRule,
  Coupon,
  MembershipPlan,
  CustomerMembership,
} from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      restaurantId,
      items,
      orderType,
      couponCode,
      loyaltyPointsToRedeem = 0,
      customerUid,
    } = body;

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid order input. Restaurant ID and items are required.' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database service unavailable.' },
        { status: 503 }
      );
    }

    // 1. Authoritatively fetch current menu item prices and build snapshots
    const itemSnapshots: OrderItemSnapshot[] = [];
    for (const item of items) {
      const itemDoc = await adminDb.collection('menuItems').doc(item.menuItemId).get();
      if (!itemDoc.exists) {
        return NextResponse.json(
          { error: `Menu item ${item.name || item.menuItemId} is no longer available.` },
          { status: 400 }
        );
      }
      const itemData = itemDoc.data()!;
      if (!itemData.active) {
        return NextResponse.json(
          { error: `Menu item "${itemData.name}" is currently unavailable.` },
          { status: 400 }
        );
      }

      // Calculate unit price from authoritative DB basePrice + matching variant + matching addOns
      let unitPrice = itemData.basePrice || 0;
      let variantSnap = undefined;
      if (item.variant && itemData.variants) {
        const matchingVar = itemData.variants.find((v: any) => v.id === item.variant.id);
        if (matchingVar) {
          variantSnap = matchingVar;
          unitPrice += matchingVar.priceDelta || 0;
        }
      }

      const modifierSnap = [];
      if (item.addOns && itemData.addOns) {
        for (const addon of item.addOns) {
          const matchingAddon = itemData.addOns.find((a: any) => a.id === addon.id);
          if (matchingAddon) {
            modifierSnap.push(matchingAddon);
            unitPrice += matchingAddon.price || 0;
          }
        }
      }

      itemSnapshots.push({
        menuItemId: item.menuItemId,
        nameSnapshot: itemData.name,
        imageUrlSnapshot: itemData.imageUrl,
        variantSnapshot: variantSnap,
        modifierSnapshot: modifierSnap,
        unitPriceSnapshot: Math.max(0, unitPrice),
        quantity: Math.max(1, item.quantity || 1),
        removedIngredients: item.removedIngredients || [],
        specialInstructions: item.specialInstructions || '',
        itemStatus: 'CONFIRMED',
      });
    }

    // 2. Authoritatively fetch active customer membership if any
    let activePlan: MembershipPlan | null = null;
    if (customerUid) {
      const membershipQuery = await adminDb
        .collection('customerMemberships')
        .where('customerUid', '==', customerUid)
        .where('restaurantId', '==', restaurantId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (!membershipQuery.empty) {
        const memData = membershipQuery.docs[0].data() as CustomerMembership;
        if (memData.endsAt > Date.now()) {
          activePlan = memData.planSnapshot;
        }
      }
    }

    // 3. Authoritatively fetch coupon if provided
    let validCoupon: Coupon | null = null;
    if (couponCode) {
      const couponQuery = await adminDb
        .collection('coupons')
        .where('code', '==', couponCode.toUpperCase().trim())
        .where('active', '==', true)
        .limit(1)
        .get();

      if (!couponQuery.empty) {
        const coupData = { ...couponQuery.docs[0].data(), id: couponQuery.docs[0].id } as Coupon;
        if (!coupData.restaurantId || coupData.restaurantId === restaurantId) {
          validCoupon = coupData;
        }
      }
    }

    // 4. Authoritatively fetch active tax and charge rules
    const taxesSnap = await adminDb
      .collection('taxes')
      .where('restaurantId', '==', restaurantId)
      .where('active', '==', true)
      .get();
    const taxRules = taxesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as TaxRule));

    const chargesSnap = await adminDb
      .collection('charges')
      .where('restaurantId', '==', restaurantId)
      .where('active', '==', true)
      .get();
    const chargeRules = chargesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as ChargeRule));

    // 5. Authoritatively fetch loyalty balance
    let availableLoyaltyPoints = 0;
    if (customerUid) {
      const loyaltyDoc = await adminDb.collection('loyaltyAccounts').doc(`${customerUid}_${restaurantId}`).get();
      if (loyaltyDoc.exists) {
        availableLoyaltyPoints = loyaltyDoc.data()?.balance || 0;
      }
    }

    // 6. Calculate authoritative pricing snapshot
    const pricing = calculateOrderPricing({
      items: itemSnapshots,
      orderType: orderType || 'DINE_IN',
      membershipPlan: activePlan,
      coupon: validCoupon,
      taxRules,
      chargeRules,
      loyaltyPointsToRedeem,
      availableLoyaltyPoints,
    });

    // 7. Check if online payment is needed
    if (pricing.finalPayable <= 0) {
      return NextResponse.json({
        zeroPaymentNeeded: true,
        pricing,
        itemSnapshots,
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      // In development if keys are not supplied yet, provide graceful guidance
      return NextResponse.json({
        razorpayOrderId: `mock_order_${Date.now()}`,
        amount: Math.round(pricing.finalPayable * 100),
        currency: 'INR',
        keyId: keyId || 'rzp_test_placeholder',
        pricing,
        itemSnapshots,
        isDevFallback: true,
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const receipt = `rcpt_${Date.now()}`;
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(pricing.finalPayable * 100), // amount in paise
      currency: 'INR',
      receipt,
      notes: {
        restaurantId,
        customerUid: customerUid || 'anonymous',
      },
    });

    return NextResponse.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId,
      pricing,
      itemSnapshots,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize payment.' },
      { status: 500 }
    );
  }
}
