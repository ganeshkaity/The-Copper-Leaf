import { UserRole } from './user';

export interface StaffAttendance {
  id: string;
  staffUid: string;
  staffName: string;
  restaurantId: string;
  role: UserRole;
  dateString?: string; // YYYY-MM-DD
  clockIn?: any; // alias for timestamp or date
  clockInTime?: any; // epoch ms
  clockOut?: any; // alias for timestamp or date
  clockOutTime?: any; // epoch ms
  totalMinutes?: number;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT' | any;
  notes?: string;
  createdAt: any;
}
