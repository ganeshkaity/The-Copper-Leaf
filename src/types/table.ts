export type TableStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'PLACING_ORDER'
  | 'OCCUPIED'
  | 'CLEANING'
  | 'BLOCKED';

export type TableShape = 'rectangle' | 'round' | 'square' | 'RECTANGLE' | 'ROUND' | 'SQUARE';
export type TableSize = 'Small' | 'Medium' | 'Large';

export type ReservationStatus = 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type Table = RestaurantTable;

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  tableNumber: string;
  floor: string; // e.g. "Ground Floor", "Rooftop", "Mezzanine"
  section?: string; // e.g. "Main Dining", "Window Side", "Patio"
  shape: TableShape;
  positionX: number; // For drag and drop floor plan editor
  positionY: number;
  width: number;
  height: number;
  capacity: number; // e.g. 2, 4, 6, 8
  size: TableSize;
  landmark?: string; // e.g. "Near Fountain", "Window View"
  status: TableStatus;
  active: boolean;
  currentOrderId?: string;
  currentSessionId?: string;
  currentOrderDishSummary?: string; // e.g. "Paneer Tikka, Dal Makhani"
  currentOrderValue?: number;
  createdAt: number;
  updatedAt: number;
}

export interface TableLock {
  uid: string;
  purpose: 'QR_ORDER' | 'BOOKING';
  startedAt: number;
  expiresAt: number;
  referenceId: string; // Order session or booking attempt ID
}

export interface TableReservation {
  id: string;
  reservationNumber: string;
  restaurantId: string;
  tableId: string;
  tableNumberSnapshot?: string;
  customerUid: string;
  customerName: string;
  email: string;
  phone?: string;
  partySize: number;
  startAt: any; // Timestamp epoch ms or Firestore Timestamp
  endAt: any;   // Timestamp epoch ms (startAt + 3h)
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  source: 'ONLINE_CUSTOMER' | 'WAITER_WALKIN';
  note?: string;
  checkedInAt?: any;
  noShowAt?: any;
  createdAt: any;
  updatedAt: any;
}
