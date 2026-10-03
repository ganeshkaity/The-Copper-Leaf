export interface Expense {
  id: string;
  restaurantId: string;
  category: string; // e.g. "Utilities", "Supplies", "Rent", "Maintenance", "Marketing"
  amount: number;
  date?: any; // epoch ms or timestamp
  expenseDate?: any;
  description: string;
  createdBy?: string;
  createdByUid?: string;
  createdByName?: string;
  createdAt: any;
  updatedAt?: any;
}
