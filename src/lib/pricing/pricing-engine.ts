import {
  OrderItemSnapshot,
  OrderPricingSnapshot,
  TaxRule,
  ChargeRule,
  Coupon,
  MembershipPlan,
} from '@/types';

export interface PricingCalculationInput {
  items: OrderItemSnapshot[];
  orderType: 'DINE_IN' | 'TAKEAWAY';
  membershipPlan?: MembershipPlan | null;
  coupon?: Coupon | null;
  taxRules?: TaxRule[];
  chargeRules?: ChargeRule[];
  loyaltyPointsToRedeem?: number;
  availableLoyaltyPoints?: number;
}

export function calculateOrderPricing(input: PricingCalculationInput): OrderPricingSnapshot {
  const {
    items,
    orderType,
    membershipPlan,
    coupon,
    taxRules = [],
    chargeRules = [],
    loyaltyPointsToRedeem = 0,
    availableLoyaltyPoints = 0,
  } = input;

  // 1, 2, 3, 4: Line item subtotals
  const subtotal = items.reduce((sum, item) => {
    const itemUnitTotal = item.unitPriceSnapshot;
    return sum + itemUnitTotal * item.quantity;
  }, 0);

  // 5: Membership discount
  let membershipDiscount = 0;
  if (membershipPlan && membershipPlan.active && membershipPlan.discountPercent > 0) {
    membershipDiscount = Number(((subtotal * membershipPlan.discountPercent) / 100).toFixed(2));
  }

  const subtotalAfterMembership = Math.max(0, subtotal - membershipDiscount);

  // 6: Coupon discount
  let couponDiscount = 0;
  if (coupon && coupon.active) {
    const now = Date.now();
    const isDateValid = now >= coupon.startDate && now <= coupon.endDate;
    const meetsMinOrder = subtotal >= coupon.minimumOrderAmount;
    const usageNotExceeded = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;

    if (isDateValid && meetsMinOrder && usageNotExceeded) {
      if (coupon.discountType === 'PERCENTAGE') {
        const rawDiscount = (subtotalAfterMembership * coupon.discountValue) / 100;
        couponDiscount = coupon.maximumDiscountAmount
          ? Math.min(rawDiscount, coupon.maximumDiscountAmount)
          : rawDiscount;
      } else {
        couponDiscount = Math.min(coupon.discountValue, subtotalAfterMembership);
      }
      couponDiscount = Number(couponDiscount.toFixed(2));
    }
  }

  const subtotalAfterDiscounts = Math.max(0, subtotalAfterMembership - couponDiscount);

  // 7: Tax rules
  const activeTaxes = taxRules.filter((t) => {
    if (!t.active) return false;
    if (t.applicableOrderTypes && t.applicableOrderTypes.length > 0) {
      return t.applicableOrderTypes.includes(orderType);
    }
    return true;
  });

  const taxBreakdown = activeTaxes.map((tax) => {
    const amount = Number(((subtotalAfterDiscounts * tax.percentage) / 100).toFixed(2));
    return {
      name: tax.name,
      percentage: tax.percentage,
      amount,
    };
  });

  const taxAmount = Number(taxBreakdown.reduce((sum, t) => sum + t.amount, 0).toFixed(2));

  // 8: Additional charges
  const activeCharges = chargeRules.filter((c) => {
    if (!c.active) return false;
    if (c.applicableOrderTypes && c.applicableOrderTypes.length > 0) {
      if (!c.applicableOrderTypes.includes(orderType)) return false;
    }
    if (c.minimumSubtotal && subtotal < c.minimumSubtotal) return false;
    if (c.maximumSubtotal && subtotal > c.maximumSubtotal) return false;
    return true;
  });

  const chargesBreakdown = activeCharges.map((charge) => {
    let amount = 0;
    if (charge.type === 'PERCENTAGE') {
      amount = Number(((subtotalAfterDiscounts * charge.value) / 100).toFixed(2));
    } else {
      amount = Number(charge.value.toFixed(2));
    }
    return {
      name: charge.name,
      amount,
    };
  });

  const chargesAmount = Number(chargesBreakdown.reduce((sum, c) => sum + c.amount, 0).toFixed(2));

  // 9: Total before loyalty
  const totalBeforeLoyalty = Number(
    (subtotalAfterDiscounts + taxAmount + chargesAmount).toFixed(2)
  );

  // 10: Loyalty points redemption (1 point = ₹1)
  const maxPossiblePoints = Math.min(
    availableLoyaltyPoints,
    Math.floor(totalBeforeLoyalty),
    Math.max(0, loyaltyPointsToRedeem)
  );

  const loyaltyPointsRedeemed = Math.max(0, maxPossiblePoints);
  const loyaltyValueRedeemed = loyaltyPointsRedeemed; // 1 point = ₹1

  // 11: Final payable amount
  const finalPayable = Number(Math.max(0, totalBeforeLoyalty - loyaltyValueRedeemed).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    membershipDiscount,
    couponDiscount,
    couponCode: coupon?.code,
    taxAmount,
    taxBreakdown,
    chargesAmount,
    chargesBreakdown,
    totalBeforeLoyalty,
    loyaltyPointsRedeemed,
    loyaltyValueRedeemed,
    finalPayable,
  };
}

export function calculateEarnedLoyaltyPoints(
  finalPaidAmount: number, // Actual money paid (excluding redeemed points)
  membershipMultiplier = 1,
  baseSpendThreshold = 50
): number {
  if (finalPaidAmount <= 0) return 0;
  const basePoints = Math.floor(finalPaidAmount / baseSpendThreshold);
  const multiplier = Math.max(1, membershipMultiplier);
  return basePoints * multiplier;
}
