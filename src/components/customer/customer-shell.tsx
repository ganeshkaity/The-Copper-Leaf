'use client';

import React from 'react';
import { CustomerNavbar } from './customer-navbar';
import { CustomerFooter } from './customer-footer';
import { Restaurant } from '@/types';

export function CustomerShell({
  children,
  currentSlug,
  restaurant,
}: {
  children: React.ReactNode;
  currentSlug?: string;
  restaurant?: Restaurant | null;
}) {
  return (
    <div className="customer-root min-h-screen flex flex-col bg-[#FAF6F0] text-[#1C1917] selection:bg-[#C8622A]/20 selection:text-[#C8622A]">
      <CustomerNavbar currentSlug={currentSlug} />
      <main className="flex-1">{children}</main>
      <CustomerFooter restaurant={restaurant} />
    </div>
  );
}
