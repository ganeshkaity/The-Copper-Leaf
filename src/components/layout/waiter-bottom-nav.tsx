'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Grid2X2,
  Laptop,
  ShoppingBag,
  Receipt,
  BellRing,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function WaiterBottomNav({ unhandledRequestsCount = 0 }: { unhandledRequestsCount?: number }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dash', href: '/management/manage/dashboard', icon: LayoutDashboard },
    { label: 'Tables', href: '/management/manage/tables', icon: Grid2X2 },
    { label: 'POS', href: '/management/manage/pos', icon: Laptop, highlight: true },
    { label: 'Orders', href: '/management/manage/orders', icon: ShoppingBag },
    { label: 'Billing', href: '/management/manage/billing', icon: Receipt },
    {
      label: 'Calls',
      href: '/management/manage/requests',
      icon: BellRing,
      badge: unhandledRequestsCount > 0 ? unhandledRequestsCount : undefined,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8E0D5] py-2 px-2 md:hidden dark:bg-[#18181D] dark:border-[#2A2A33] shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-[#C8622A] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold text-[#C8622A] mt-1">POS</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors relative',
                isActive
                  ? 'text-[#C8622A] font-bold'
                  : 'text-[#78716C] dark:text-[#A1A1AA]'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
