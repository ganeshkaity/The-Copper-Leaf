export type OrderType = 'DINE_IN' | 'TAKEAWAY';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderItemStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED';

export interface OrderItemSnapshot {
  menuItemId: string;
  nameSnapshot: string;
  imageUrlSnapshot?: string;
  variantSnapshot?: {
    id: string;
    name: string;
    priceDelta: number;
    price?: number;
  };
  modifierSnapshot?: {
    id: string;
    name: string;
    price: number;
  }[];
  unitPriceSnapshot: number; // Base price + variant price + addons price
  quantity: number;
  removedIngredients?: string[];
  specialInstructions?: string;
  discountSnapshot?: number;
  itemStatus: OrderItemStatus;
}

import { PaymentStatus } from './payment';

export interface OrderPricingSnapshot {
  subtotal: number;
  membershipDiscount: number;
  couponDiscount: number;
  couponCode?: string;
  taxAmount: number;
  taxBreakdown: { name: string; percentage: number; amount: number }[];
  chargesAmount: number;
  chargesBreakdown: { name: string; amount: number }[];
  totalBeforeLoyalty: number;
  loyaltyPointsRedeemed: number;
  loyaltyValueRedeemed: number;
  finalPayable: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "#20261003-4587"
  restaurantId: string;
  restaurantNameSnapshot?: string;
  customerUid: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  source: 'ONLINE_QR' | 'ONLINE_WEB' | 'WAITER_POS';
  orderType: OrderType;
  tableId?: string;
  tableNumberSnapshot?: string;
  reservationId?: string;
  diningSessionId?: string;
  waiterId?: string;
  waiterNameSnapshot?: string;
  items: OrderItemSnapshot[];
  pricing: OrderPricingSnapshot;
  subtotal?: number;
  membershipDiscount?: number;
  couponDiscount?: number;
  taxes?: number;
  charges?: number;
  loyaltyPointsUsed?: number;
  loyaltyValue?: number;
  totalBeforePoints?: number;
  finalPayable?: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  cancellationReason?: string;
  managerApprovalRequiredForCancel?: boolean;
  notes?: string;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
}

export interface DiningSession {
  id: string;
  restaurantId: string;
  tableIds: string[]; // Merged tables support
  tableNumbersSnapshot: string[];
  reservationId?: string;
  customerUid?: string;
  customerName?: string;
  status: 'ACTIVE' | 'BILLED' | 'COMPLETED';
  assignedWaiterId?: string;
  assignedWaiterName?: string;
  startedAt: number;
  endedAt?: number;
}
