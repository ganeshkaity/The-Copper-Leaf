export interface StaffCommissionRule {
  id: string;
  restaurantId: string;
  enabled: boolean;
  percentage: number;
  basis: 'COMPLETED_SALES';
  applicableStaffUids?: string[]; // Empty means all waiters in restaurant
  createdAt: number;
  updatedAt: number;
}

export interface CommissionRecord {
  id: string;
  restaurantId: string;
  ruleId?: string;
  orderId: string;
  orderNumber?: string; // alias
  staffUid: string;
  staffName?: string;
  saleAmount?: number;
  orderTotal?: number; // alias
  commissionPercentage?: number;
  percentage?: number; // alias
  commissionAmount: number;
  createdAt: any;
}

export type StaffCommission = CommissionRecord;
