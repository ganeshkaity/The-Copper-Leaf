import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MenuItemVariant, MenuItemAddon, OrderType } from '@/types';

export interface CartItem {
  id: string; // Unique cart line item ID (e.g. `${menuItemId}_${variantId}_${addonsHash}`)
  menuItemId: string;
  name: string;
  imageUrl?: string;
  basePrice: number;
  unitPrice: number; // basePrice + variant + addons
  quantity: number;
  variant?: MenuItemVariant;
  addOns?: MenuItemAddon[];
  removedIngredients?: string[];
  specialInstructions?: string;
}

interface CartState {
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;
  orderType: OrderType;
  tableId: string | null;
  tableNumber: string | null;
  items: CartItem[];

  // Actions
  setRestaurantContext: (restaurantId: string, slug: string, name: string) => boolean;
  forceSwitchRestaurant: (restaurantId: string, slug: string, name: string) => void;
  setOrderType: (type: OrderType) => void;
  setTableContext: (tableId: string | null, tableNumber: string | null) => void;
  addItem: (item: Omit<CartItem, 'id' | 'unitPrice'>) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

function generateCartItemId(
  menuItemId: string,
  variant?: MenuItemVariant,
  addOns?: MenuItemAddon[],
  removed?: string[],
  instructions?: string
): string {
  const parts = [
    menuItemId,
    variant?.id || 'novar',
    (addOns || []).map((a) => a.id).sort().join('-'),
    (removed || []).sort().join('-'),
    instructions ? instructions.trim().toLowerCase() : '',
  ];
  return parts.filter(Boolean).join('::');
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantSlug: null,
      restaurantName: null,
      orderType: 'DINE_IN',
      tableId: null,
      tableNumber: null,
      items: [],

      setRestaurantContext: (restaurantId, slug, name) => {
        const state = get();
        if (state.restaurantId && state.restaurantId !== restaurantId && state.items.length > 0) {
          // Warning needed: caller should prompt user to confirm clearing cart
          return false;
        }
        set({
          restaurantId,
          restaurantSlug: slug,
          restaurantName: name,
        });
        return true;
      },

      forceSwitchRestaurant: (restaurantId, slug, name) => {
        set({
          restaurantId,
          restaurantSlug: slug,
          restaurantName: name,
          items: [],
          tableId: null,
          tableNumber: null,
        });
      },

      setOrderType: (orderType) => set({ orderType }),

      setTableContext: (tableId, tableNumber) => set({ tableId, tableNumber }),

      addItem: (newItem) => {
        const lineId = generateCartItemId(
          newItem.menuItemId,
          newItem.variant,
          newItem.addOns,
          newItem.removedIngredients,
          newItem.specialInstructions
        );

        const variantDelta = newItem.variant?.priceDelta || 0;
        const addonsTotal = (newItem.addOns || []).reduce((acc, a) => acc + a.price, 0);
        const unitPrice = Math.max(0, newItem.basePrice + variantDelta + addonsTotal);

        const state = get();
        const existingIndex = state.items.findIndex((i) => i.id === lineId);

        if (existingIndex > -1) {
          const updatedItems = [...state.items];
          updatedItems[existingIndex].quantity += newItem.quantity;
          set({ items: updatedItems });
        } else {
          set({
            items: [
              ...state.items,
              {
                ...newItem,
                id: lineId,
                unitPrice,
              },
            ],
          });
        }
      },

      updateQuantity: (id, delta) => {
        const state = get();
        const updated = state.items
          .map((item) => {
            if (item.id === id) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];
        set({ items: updated });
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'the-copper-leaf-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
