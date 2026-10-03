export type ReviewStatus = 'PUBLISHED' | 'HIDDEN';

export interface Review {
  id: string;
  restaurantId: string;
  customerUid: string;
  customerName: string;
  customerAvatar?: string;
  orderId: string;
  orderNumber?: string;
  menuItemId?: string;
  menuItemName?: string;
  rating: number; // 1 to 5
  reviewText: string;
  status: ReviewStatus;
  createdAt: any;
  updatedAt: any;
}
