'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant } from '@/types';
import { useAuth } from './auth-context';

interface RestaurantContextType {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  currentRestaurant: Restaurant | null;
  selectedRestaurantId: string | null;
  setSelectedRestaurantId: (id: string | null) => void;
  refreshRestaurants: () => Promise<void>;
  loading: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to active restaurants
    const q = query(collection(db, 'restaurants'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Restaurant[] = [];
        snapshot.forEach((doc) => {
          list.push({ ...doc.data(), id: doc.id } as Restaurant);
        });

        // Filter based on staff assignedRestaurantIds if not admin and user has restrictions
        let accessible = list;
        if (profile && !isAdmin && (profile.role === 'WAITER' || profile.role === 'KITCHEN')) {
          if (profile.assignedRestaurantIds && profile.assignedRestaurantIds.length > 0) {
            accessible = list.filter((r) => profile.assignedRestaurantIds.includes(r.id));
          }
        }

        setRestaurants(accessible);

        // Auto-select first active restaurant if none currently chosen or previous is invalid
        if (accessible.length > 0) {
          const currentValid = accessible.some((r) => r.id === selectedRestaurantId);
          if (!selectedRestaurantId || !currentValid) {
            // Prefer stored in localStorage if available
            const savedId = typeof window !== 'undefined' ? localStorage.getItem('tcl_selected_restaurant') : null;
            const hasSaved = accessible.find((r) => r.id === savedId);
            const toSelect = hasSaved ? hasSaved.id : accessible[0].id;
            setSelectedRestaurantId(toSelect);
          }
        } else {
          setSelectedRestaurantId(null);
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error fetching restaurants:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile, isAdmin, selectedRestaurantId]);

  const handleSelectRestaurantId = (id: string | null) => {
    setSelectedRestaurantId(id);
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem('tcl_selected_restaurant', id);
    }
  };

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) || null;

  const refreshRestaurants = async () => {
    // onSnapshot already keeps it fresh, but exposed for wizard / setup completions
    return Promise.resolve();
  };

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        selectedRestaurant,
        currentRestaurant: selectedRestaurant,
        selectedRestaurantId,
        setSelectedRestaurantId: handleSelectRestaurantId,
        refreshRestaurants,
        loading,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}
