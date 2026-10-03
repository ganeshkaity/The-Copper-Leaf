export type UserRole = 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CUSTOMER';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  phone?: string | null;
  photoURL?: string | null;
  role: UserRole;
  accountType: 'anonymous' | 'registered';
  assignedRestaurantIds: string[];
  status: 'active' | 'inactive';
  dateOfBirth?: string;
  preferences?: {
    dietary?: string[];
    dietaryType?: string;
    allergens?: string[];
    spiciness?: 'mild' | 'medium' | 'spicy';
    spiceLevel?: string;
  };
  favoriteDishIds?: string[];
  forceLogoutAt?: any; // epoch ms or timestamp
  createdAt: any;
  updatedAt: any;
  lastLoginAt?: any;
}

export interface LoginActivity {
  id: string;
  uid: string;
  email?: string;
  role: UserRole;
  platform?: string;
  restaurantId?: string;
  timestamp: number;
}
