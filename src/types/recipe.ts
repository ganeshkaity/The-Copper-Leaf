export interface RecipeIngredient {
  id?: string;
  item?: string;
  name: string;
  quantity?: number;
  netQty?: number;
  uom: string;
  cost: number;
  includeCost?: boolean;
  modifier?: string;
}

export type RecipeIngredientRow = RecipeIngredient;

export interface Recipe {
  id: string;
  restaurantId: string;
  recipeType: any;
  recipeCode?: string;
  code?: string;
  recipeName?: string;
  name?: string;
  recipeNameAlt?: string;
  alternateName?: string;
  menuCategory: string;
  salesType: any;
  imageUrl?: string;
  ingredients: RecipeIngredient[];
  totalCost?: number;
  portionUom?: string;
  portionSize?: any;
  portion?: any;
  yieldQuantity?: any;
  yield?: any;
  stockable: boolean;
  createdAt: any;
  updatedAt: any;
}
