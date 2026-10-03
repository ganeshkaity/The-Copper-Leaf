export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  parentCategoryId?: string | null; // For subcategories
  description?: string;
  sortOrder: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MenuItemVariant {
  id: string;
  name: string;
  priceDelta: number; // e.g. +50 or -20
}

export interface MenuItemAddon {
  id: string;
  name: string;
  price: number;
}

export type DietaryTag = 'veg' | 'non-veg' | 'egg' | 'vegan' | 'jain' | 'VEG' | 'NON-VEG' | 'EGG' | 'VEGAN' | 'JAIN';

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  subcategoryId?: string | null;
  name: string;
  normalizedName: string; // Lowercase for exact/prefix search
  searchTokens?: string[];
  description: string;
  imageUrl?: string;
  basePrice: number;
  variants?: MenuItemVariant[];
  addOns?: MenuItemAddon[];
  modifierIds?: string[];
  removableIngredients?: string[];
  supportsSpecialInstructions?: boolean;
  dietaryTags: DietaryTag[];
  allergens?: string[];
  calories?: number;
  prepTimeMinutes?: number;
  featured?: boolean;
  recommended?: boolean;
  bestseller?: boolean;
  active: boolean;
  stockTracked: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  taxRuleIds?: string[];
  createdAt: any;
  updatedAt: any;
}
