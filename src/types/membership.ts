export interface MembershipPlan {
  id: string;
  restaurantId: string;
  name: string; // e.g. "Silver", "Gold", "Platinum"
  price: number;
  durationDays: number; // e.g. 30, 365
  discountPercent: number; // e.g. 5, 10, 20
  loyaltyMultiplier: number; // e.g. 2, 3, 5
  freeAddonItemIds?: string[];
  freeDrinkItemIds?: string[];
  freeJuiceItemIds?: string[];
  freeDrinksEveryVisit?: boolean;
  customPerks?: string[];
  perksDescription?: string[];
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface CustomerMembership {
  id: string;
  customerUid: string;
  customerName?: string;
  customerEmail?: string;
  restaurantId: string;
  planId: string;
  planSnapshot: MembershipPlan;
  startsAt: any;
  endsAt: any;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  razorpayPaymentId?: string;
  createdAt: any;
}
