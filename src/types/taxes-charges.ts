export interface TaxRule {
  id: string;
  restaurantId: string;
  name: string; // e.g. "GST 5%", "VAT", "Municipal Tax"
  percentage: number;
  priority: number;
  applicableOrderTypes?: ('DINE_IN' | 'TAKEAWAY')[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChargeRule {
  id: string;
  restaurantId: string;
  name: string; // e.g. "Packaging Charge", "Service Charge"
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  applicableOrderTypes?: ('DINE_IN' | 'TAKEAWAY')[];
  minimumSubtotal?: number;
  maximumSubtotal?: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type AdditionalCharge = ChargeRule;
