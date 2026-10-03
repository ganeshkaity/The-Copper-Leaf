'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  ShoppingBag,
  CalendarCheck,
  Coins,
  Award,
  Star,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/context/auth-context';

export function AccountNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const links = [
    { label: 'Profile', href: '/account', icon: User },
    { label: 'Orders', href: '/account/orders', icon: ShoppingBag },
    { label: 'Bookings', href: '/account/bookings', icon: CalendarCheck },
    { label: 'Loyalty Points', href: '/account/points', icon: Coins },
    { label: 'Membership', href: '/account/membership', icon: Award },
    { label: 'My Reviews', href: '/account/reviews', icon: Star },
    { label: 'Settings', href: '/account/settings', icon: Settings },
  ];

  return (
    <aside className="w-full lg:w-64 bg-white rounded-3xl border border-[#E8E0D5] p-4 shadow-sm space-y-1">
      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
        Customer Account
      </div>
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#C8622A] text-white font-semibold shadow-sm'
                : 'text-[#44403C] hover:bg-[#FAF6F0] hover:text-[#C8622A]'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="pt-3 mt-3 border-t border-[#E8E0D5]">
        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
