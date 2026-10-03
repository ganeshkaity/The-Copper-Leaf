import { OrderItemSnapshot, OrderPricingSnapshot } from './order';

export interface Bill {
  id: string;
  billNumber: string;
  restaurantId: string;
  diningSessionId?: string;
  orderIds: string[];
  tableId?: string;
  tableNumberSnapshot?: string;
  lineItems: OrderItemSnapshot[];
  pricing: OrderPricingSnapshot;
  status: 'UNPAID' | 'PAID' | 'SPLIT' | 'MERGED';
  splitGroupId?: string;
  parentBillId?: string;
  createdAt: number;
  updatedAt: number;
  paidAt?: number;
}
