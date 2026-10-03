export interface InventoryPurchase {
  id: string;
  restaurantId: string;
  menuItemId?: string;
  itemName: string;
  quantity: number;
  uom: string; // e.g. "Kg", "Ltr", "Units", "Pcs"
  unitCost: number;
  cost?: number; // alias
  totalCost: number;
  purchaseDate: any;
  vendor?: string; // alias
  vendorName?: string;
  notes?: string;
  enteredBy?: string; // alias
  enteredByUid: string;
  enteredByName?: string;
  createdAt: any;
}

export interface StockAdjustment {
  id: string;
  restaurantId: string;
  menuItemId: string;
  menuItemName: string;
  previousQuantity: number;
  adjustmentQuantity: number; // Positive or negative
  newQuantity: number;
  reason: 'PURCHASE' | 'ORDER_FULFILLED' | 'SPOILAGE' | 'DAMAGE' | 'MANUAL_AUDIT';
  referenceId?: string; // Order ID or Purchase ID
  adjustedByUid: string;
  adjustedByName?: string;
  createdAt: number;
}
