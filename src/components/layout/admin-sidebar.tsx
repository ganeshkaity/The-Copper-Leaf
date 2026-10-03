'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Grid2X2,
  UtensilsCrossed,
  BookOpen,
  CalendarCheck,
  Users,
  TrendingUp,
  BarChart3,
  Award,
  Coins,
  Ticket,
  Tag,
  Star,
  Package,
  ScrollText,
  Truck,
  Receipt,
  Clock,
  Percent,
  UserCheck,
  Building2,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/context/auth-context';
import { useRestaurant } from '@/lib/context/restaurant-context';

export function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { restaurants, selectedRestaurant, setSelectedRestaurantId } = useRestaurant();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

  const menuGroups = [
    {
      title: 'MENU',
      items: [
        { label: 'Dashboard', href: '/n/admin/dashboard', icon: LayoutDashboard },
        { label: 'Orders', href: '/n/admin/orders', icon: ShoppingBag },
        { label: 'Tables', href: '/n/admin/tables', icon: Grid2X2 },
        { label: 'Kitchen', href: '/n/admin/kitchen', icon: UtensilsCrossed },
        { label: 'Menus', href: '/n/admin/menu', icon: BookOpen },
        { label: 'Bookings', href: '/n/admin/bookings', icon: CalendarCheck },
        { label: 'Customers', href: '/n/admin/customers', icon: Users },
      ],
    },
    {
      title: 'BUSINESS',
      items: [
        { label: 'Sales', href: '/n/admin/sales', icon: TrendingUp },
        { label: 'Analytics', href: '/n/admin/analytics', icon: BarChart3 },
        { label: 'Memberships', href: '/n/admin/memberships', icon: Award },
        { label: 'Loyalty', href: '/n/admin/loyalty', icon: Coins },
        { label: 'Coupons', href: '/n/admin/coupons', icon: Ticket },
        { label: 'Offers', href: '/n/admin/offers', icon: Tag },
        { label: 'Reviews', href: '/n/admin/reviews', icon: Star },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Inventory', href: '/n/admin/inventory', icon: Package },
        { label: 'Recipes', href: '/n/admin/inventory/recipes', icon: ScrollText },
        { label: 'Purchases', href: '/n/admin/inventory/purchases', icon: Truck },
        { label: 'Expenses', href: '/n/admin/expenses', icon: Receipt },
        { label: 'Attendance', href: '/n/admin/attendance', icon: Clock },
        { label: 'Commissions', href: '/n/admin/commissions', icon: Percent },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Staff', href: '/n/admin/staff', icon: UserCheck },
        { label: 'Restaurants', href: '/n/admin/restaurants', icon: Building2 },
        { label: 'Taxes & Charges', href: '/n/admin/taxes', icon: Percent },
        { label: 'Reports', href: '/n/admin/reports', icon: FileSpreadsheet },
        { label: 'Settings', href: '/n/admin/settings', icon: Settings },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/sign-in');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#E8E0D5] bg-white transition-transform duration-300 ease-in-out dark:border-[#2A2A33] dark:bg-[#18181D] lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-18 items-center justify-between px-6 border-b border-[#E8E0D5] dark:border-[#2A2A33]">
          <Link href="/n/admin/dashboard" className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm">
              <Image
                src="/brand/logo.png"
                alt="The Copper Leaf"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-[#1C1917] dark:text-white">
                The Copper Leaf
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-[#C8622A] font-semibold">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Store Selector Dropdown */}
        <div className="px-4 py-3 border-b border-[#E8E0D5] dark:border-[#2A2A33] relative">
          <div className="text-[11px] font-semibold text-[#78716C] dark:text-[#A1A1AA] uppercase tracking-wider mb-1 px-1">
            Store / Branch
          </div>
          <button
            type="button"
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-[#E8E0D5] bg-[#FAF6F0] hover:bg-[#F3ECE2] dark:bg-[#22222A] dark:border-[#2A2A33] dark:hover:bg-[#2A2A33] transition-colors text-left"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-6 h-6 rounded-lg bg-[#C8622A]/10 text-[#C8622A] flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium truncate text-[#1C1917] dark:text-white">
                {selectedRestaurant ? selectedRestaurant.name : 'No Branch Configured'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#78716C] shrink-0" />
          </button>

          {storeDropdownOpen && (
            <div className="absolute left-4 right-4 top-16 z-50 rounded-xl border border-[#E8E0D5] bg-white p-1.5 shadow-xl dark:border-[#2A2A33] dark:bg-[#1C1C22]">
              {restaurants.length === 0 ? (
                <div className="p-3 text-xs text-center text-[#78716C]">
                  No restaurants found.
                  <Link
                    href="/n/admin/setup"
                    onClick={() => setStoreDropdownOpen(false)}
                    className="block mt-2 text-[#C8622A] font-semibold hover:underline"
                  >
                    Run Setup Wizard &rarr;
                  </Link>
                </div>
              ) : (
                restaurants.map((rest) => (
                  <button
                    key={rest.id}
                    onClick={() => {
                      setSelectedRestaurantId(rest.id);
                      setStoreDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-lg text-sm text-left transition-colors',
                      selectedRestaurant?.id === rest.id
                        ? 'bg-[#C8622A] text-white font-medium'
                        : 'hover:bg-[#F3ECE2] dark:hover:bg-[#2A2A33] text-[#1C1917] dark:text-white'
                    )}
                  >
                    <span className="truncate">{rest.name}</span>
                    <span className="text-[10px] opacity-75">{rest.address.city}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#78716C] dark:text-[#A1A1AA]">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onClose && onClose()}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group select-none',
                        isActive
                          ? 'bg-[#C8622A] text-white shadow-sm'
                          : 'text-[#44403C] hover:bg-[#F3ECE2] dark:text-[#D4D4D8] dark:hover:bg-[#22222A]'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                          isActive ? 'text-white' : 'text-[#78716C] dark:text-[#A1A1AA]'
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Setup Store Progress Card matching reference */}
          {restaurants.length === 0 && (
            <div className="p-4 rounded-2xl border border-[#E8E0D5] bg-[#FAF6F0] dark:bg-[#22222A] dark:border-[#2A2A33]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1C1917] dark:text-white mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8622A]" />
                  SETUP STORE
                </span>
                <span className="text-[#C8622A]">0 / 10 complete</span>
              </div>
              <p className="text-xs text-[#78716C] dark:text-[#A1A1AA] mb-3">
                Configure your first restaurant branch, tables, and menu.
              </p>
              <Link
                href="/n/admin/setup"
                className="w-full inline-flex items-center justify-center py-2 px-3 rounded-xl bg-white border border-[#E8E0D5] text-xs font-semibold text-[#1C1917] hover:bg-[#F3ECE2] dark:bg-[#18181D] dark:border-[#2A2A33] dark:text-white transition-colors"
              >
                Start Setup
              </Link>
            </div>
          )}
        </div>

        {/* User Footer Profile Card matching reference tables.png */}
        <div className="p-4 border-t border-[#E8E0D5] dark:border-[#2A2A33]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF6F0] dark:bg-[#22222A]">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-9 h-9 rounded-full bg-[#C8622A] text-white flex items-center justify-center font-bold text-sm shrink-0">
                {profile?.displayName
                  ? profile.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'A'}
              </div>
              <div className="truncate">
                <div className="text-sm font-semibold truncate text-[#1C1917] dark:text-white">
                  {profile?.displayName || 'Admin'}
                </div>
                <div className="text-[11px] text-[#78716C] dark:text-[#A1A1AA] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {profile?.role || 'ADMIN'}
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#78716C] hover:text-red-600 hover:bg-white dark:hover:bg-[#18181D] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
