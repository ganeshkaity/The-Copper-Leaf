export type PaymentProvider = 'RAZORPAY' | 'CASH';

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'CASH';

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED';

export interface RefundRecord {
  refundId: string;
  amount: number;
  reason: string;
  refundedByUid: string;
  refundedByName?: string;
  gatewayRefundId?: string;
  refundedAt: number;
}

export interface PaymentRecord {
  id: string;
  restaurantId: string;
  billId?: string;
  orderId?: string;
  customerUid: string;
  customerName?: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  receivedByStaffUid?: string; // For cash payments
  receivedByStaffName?: string;
  refunds?: RefundRecord[];
  createdAt: number;
  paidAt?: number;
}
