export type DiscountType = 'PERCENTAGE' | 'FIXED' | 'PERCENT';

export interface Coupon {
  id: string;
  code: string; // uppercase e.g. "WELCOME10"
  description?: string;
  restaurantId?: string; // If undefined/null, applies globally to all branches
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  minOrderAmount?: number; // alias
  maximumDiscountAmount?: number;
  maxDiscount?: number; // alias
  startDate: any;
  endDate: any;
  usageLimit?: number;
  usedCount: number;
  usageCount?: number; // alias
  perCustomerLimit?: number;
  stackable: boolean;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}
