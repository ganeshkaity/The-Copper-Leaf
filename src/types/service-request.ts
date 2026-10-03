export type ServiceRequestReason =
  | 'Need assistance'
  | 'Request water'
  | 'Request bill'
  | 'Payment help'
  | 'Need staff'
  | 'Other';

export interface ServiceRequest {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  customerUid?: string;
  customerName?: string;
  reason: ServiceRequestReason;
  note?: string;
  status: 'PENDING' | 'HANDLED';
  handledBy?: string; // alias
  handledByStaffUid?: string;
  handledByStaffName?: string;
  createdAt: any;
  handledAt?: any;
}
