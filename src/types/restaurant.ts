export interface DayOpeningHours {
  open: string;  // e.g. "11:00"
  close: string; // e.g. "23:00"
  isClosed?: boolean;
}

export interface WeeklyOpeningHours {
  monday: DayOpeningHours;
  tuesday: DayOpeningHours;
  wednesday: DayOpeningHours;
  thursday: DayOpeningHours;
  friday: DayOpeningHours;
  saturday: DayOpeningHours;
  sunday: DayOpeningHours;
}

export interface BookingSettings {
  reservationDurationMinutes: number; // default 180 (3 hours)
  bufferBetweenMinutes: number;       // default 10
  noShowWindowMinutes: number;        // default 60
  sameDayOnly: boolean;               // true
  maxPartySize: number;
}

export interface OrderSettings {
  dineInEnabled: boolean;
  takeawayEnabled: boolean;
  onlinePaymentEnabled: boolean;
  cashPaymentEnabled: boolean;
}

export interface RestaurantAddress {
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  heroImageUrl?: string;
  tagline?: string;
  description: string;
  about?: string;
  aboutText?: string;
  whyChooseUs?: any;
  address: RestaurantAddress;
  phone: string;
  email: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  cuisine?: any;
  timezone: string; // default "Asia/Kolkata"
  openingHours?: any;
  closedDays?: string[]; // ISO date strings e.g. ["2026-12-25"]
  active: boolean;
  bookingSettings?: any;
  orderSettings?: any;
  featuredDishIds?: string[];
  galleryImageUrls?: string[];
  bookingCtaTitle?: string;
  bookingCtaSubtitle?: string;
  createdAt: any;
  updatedAt: any;
}
