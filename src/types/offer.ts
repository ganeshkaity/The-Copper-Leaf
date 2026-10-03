export interface Offer {
  id: string;
  restaurantId: string;
  title: string;
  description: string;
  imageUrl?: string;
  couponId?: string;
  couponCode?: string;
  badgeText?: string;
  startAt: any;
  endAt: any;
  featured: boolean;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}
