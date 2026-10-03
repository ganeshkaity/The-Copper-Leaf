'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Grid2X2,
  CalendarCheck,
  ShoppingBag,
  Laptop,
  Receipt,
  CreditCard,
  BellRing,
  Clock,
  LogOut,
  Sun,
  Moon,
  Building2,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/context/auth-context';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { useTheme } from '@/lib/context/theme-context';
import { WaiterBottomNav } from './waiter-bottom-nav';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';

export function WaiterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading: authLoading, isWaiter, isAdmin, signOut } = useAuth();
  const { restaurants, selectedRestaurant, setSelectedRestaurantId } = useRestaurant();
  const { theme, toggleTheme } = useTheme();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [unhandledRequestsCount, setUnhandledRequestsCount] = useState(0);

  // Real-time listener for pending customer service requests (waiter calls)
  useEffect(() => {
    if (!selectedRestaurant) return;
    const q = query(
      collection(db, 'serviceRequests'),
      where('restaurantId', '==', selectedRestaurant.id),
      where('status', '==', 'PENDING')
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnhandledRequestsCount(snap.size);
    });
    return () => unsub();
  }, [selectedRestaurant]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#0F0F12]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#C8622A]/20 border-t-[#C8622A] rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#78716C] dark:text-[#A1A1AA]">
            Loading Waiter Operations...
          </p>
        </div>
      </div>
    );
  }

  // Guard: allow WAITER or ADMIN
  if (!profile || (!isWaiter && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#0F0F12] p-6">
        <div className="max-w-md w-full rounded-2xl border border-[#E8E0D5] bg-white p-8 text-center shadow-lg dark:bg-[#18181D] dark:border-[#2A2A33]">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1917] dark:text-white mb-2">
            Staff Access Required
          </h2>
          <p className="text-sm text-[#78716C] dark:text-[#A1A1AA] mb-6">
            You must be signed in with a Waiter or Administrator account. Current role:{' '}
            <span className="font-semibold text-[#C8622A]">{profile?.role || 'Guest'}</span>.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link href="/auth/sign-in">
              <Button className="w-full">Sign In with Staff Account</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { label: 'Dashboard', href: '/management/manage/dashboard', icon: LayoutDashboard },
    { label: 'Tables', href: '/management/manage/tables', icon: Grid2X2 },
    { label: 'POS Terminal', href: '/management/manage/pos', icon: Laptop },
    { label: 'Bookings', href: '/management/manage/bookings', icon: CalendarCheck },
    { label: 'Orders', href: '/management/manage/orders', icon: ShoppingBag },
    { label: 'Billing', href: '/management/manage/billing', icon: Receipt },
    { label: 'Payments', href: '/management/manage/payments', icon: CreditCard },
    {
      label: 'Service Calls',
      href: '/management/manage/requests',
      icon: BellRing,
      badge: unhandledRequestsCount > 0 ? unhandledRequestsCount : undefined,
    },
    { label: 'My Attendance', href: '/management/manage/attendance', icon: Clock },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/sign-in');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAF6F0] dark:bg-[#0F0F12] pb-16 md:pb-0">
      {/* Desktop/Tablet Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[#E8E0D5] bg-white dark:bg-[#18181D] dark:border-[#2A2A33]">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#E8E0D5] dark:border-[#2A2A33]">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
            <Image src="/brand/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <div>
            <div className="font-serif font-bold text-sm text-[#1C1917] dark:text-white leading-tight">
              The Copper Leaf
            </div>
            <div className="text-[10px] text-[#C8622A] font-semibold tracking-wider uppercase">
              Waiter Console
            </div>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="p-3 border-b border-[#E8E0D5] dark:border-[#2A2A33] relative">
          <button
            type="button"
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-[#E8E0D5] bg-[#FAF6F0] hover:bg-[#F3ECE2] dark:bg-[#22222A] dark:border-[#2A2A33] text-left transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="w-4 h-4 text-[#C8622A] shrink-0" />
              <span className="text-xs font-semibold truncate text-[#1C1917] dark:text-white">
                {selectedRestaurant ? selectedRestaurant.name : 'Select Branch'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
          </button>

          {storeDropdownOpen && (
            <div className="absolute left-3 right-3 top-14 z-50 rounded-xl border border-[#E8E0D5] bg-white p-1.5 shadow-xl dark:border-[#2A2A33] dark:bg-[#1C1C22]">
              {restaurants.map((rest) => (
                <button
                  key={rest.id}
                  onClick={() => {
                    setSelectedRestaurantId(rest.id);
                    setStoreDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between p-2 rounded-lg text-xs text-left',
                    selectedRestaurant?.id === rest.id
                      ? 'bg-[#C8622A] text-white font-medium'
                      : 'hover:bg-[#F3ECE2] dark:hover:bg-[#2A2A33] text-[#1C1917] dark:text-white'
                  )}
                >
                  <span className="truncate">{rest.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors select-none',
                  isActive
                    ? 'bg-[#C8622A] text-white shadow-sm'
                    : 'text-[#44403C] hover:bg-[#F3ECE2] dark:text-[#D4D4D8] dark:hover:bg-[#22222A]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'text-xs font-bold px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-white text-[#C8622A]' : 'bg-red-600 text-white'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer User & Theme */}
        <div className="p-3 border-t border-[#E8E0D5] dark:border-[#2A2A33] flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className="w-8 h-8 rounded-full bg-[#C8622A] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {profile.displayName?.slice(0, 2).toUpperCase() || 'W'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold truncate text-[#1C1917] dark:text-white">
                {profile.displayName || 'Staff Member'}
              </div>
              <div className="text-[10px] text-[#78716C] dark:text-[#A1A1AA]">{profile.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-[#78716C] hover:bg-[#FAF6F0] dark:hover:bg-[#22222A]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-[#78716C] hover:text-red-600 hover:bg-[#FAF6F0] dark:hover:bg-[#22222A]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex h-14 items-center justify-between px-4 border-b border-[#E8E0D5] bg-white dark:bg-[#18181D] dark:border-[#2A2A33] sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-md overflow-hidden">
              <Image src="/brand/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="font-serif font-bold text-sm text-[#1C1917] dark:text-white">
              {selectedRestaurant?.name || 'The Copper Leaf'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[#E8E0D5] dark:border-[#2A2A33] text-[#78716C]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg border border-[#E8E0D5] dark:border-[#2A2A33] text-[#78716C]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <WaiterBottomNav unhandledRequestsCount={unhandledRequestsCount} />
    </div>
  );
}
