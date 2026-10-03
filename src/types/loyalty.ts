export interface LoyaltyAccount {
  id: string; // `${customerUid}_${restaurantId}` or doc id
  customerUid: string;
  restaurantId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: number;
}

export type LoyaltyTransactionType = 'EARNED' | 'REDEEMED' | 'ADJUSTED';

export interface LoyaltyTransaction {
  id: string;
  customerUid: string;
  restaurantId: string;
  type: LoyaltyTransactionType;
  points: number; // positive for earned/adjusted, negative for redeemed
  balanceAfter: number;
  referenceType: 'ORDER' | 'ADMIN_ADJUSTMENT';
  referenceId?: string;
  description: string;
  createdAt: number;
}
