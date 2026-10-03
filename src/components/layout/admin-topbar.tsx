'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Bell,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { useTheme } from '@/lib/context/theme-context';
import { useRestaurant } from '@/lib/context/restaurant-context';

export function AdminTopbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { selectedRestaurant } = useRestaurant();
  const [notificationOpen, setNotificationOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-18 w-full items-center justify-between border-b border-[#E8E0D5] bg-white/80 px-4 md:px-8 backdrop-blur-md dark:border-[#2A2A33] dark:bg-[#18181D]/80">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-[#78716C] hover:bg-[#F3ECE2] dark:hover:bg-[#22222A] lg:hidden"
        >
          <Menu className="w-5 h-5" />
          <span className="sr-only">Toggle Menu</span>
        </button>

        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-[#78716C] pointer-events-none" />
          <input
            type="text"
            placeholder="Search orders, dishes, customers..."
            className="h-10 w-72 lg:w-96 rounded-xl border border-[#E8E0D5] bg-[#FAF6F0] pl-10 pr-12 text-sm text-[#1C1917] placeholder:text-[#A1A1AA] focus:border-[#C8622A] focus:outline-none dark:bg-[#22222A] dark:border-[#2A2A33] dark:text-white"
          />
          <kbd className="absolute right-3 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[#E8E0D5] bg-white px-1.5 font-mono text-[10px] font-medium text-[#78716C] dark:bg-[#18181D] dark:border-[#2A2A33]">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {selectedRestaurant && (
          <Link
            href={`/r/${selectedRestaurant.slug}`}
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E0D5] text-xs font-semibold text-[#1C1917] hover:bg-[#FAF6F0] dark:border-[#2A2A33] dark:text-white dark:hover:bg-[#22222A] transition-colors"
          >
            <span>Live Site</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#C8622A]" />
          </Link>
        )}

        <Link
          href="/management/manage/pos"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF4ED] text-xs font-semibold text-[#C8622A] hover:bg-[#F9E8DA] dark:bg-[#2A1C14] dark:text-[#E2773F] transition-colors"
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Launch POS</span>
        </Link>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle Light / Dark mode"
          className="rounded-xl border border-[#E8E0D5] p-2 text-[#78716C] hover:bg-[#FAF6F0] dark:border-[#2A2A33] dark:hover:bg-[#22222A] dark:text-[#D4D4D8] transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="rounded-xl border border-[#E8E0D5] p-2 text-[#78716C] hover:bg-[#FAF6F0] dark:border-[#2A2A33] dark:hover:bg-[#22222A] dark:text-[#D4D4D8] transition-colors relative"
          >
            <Bell className="w-4 h-4" />
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-[#E8E0D5] bg-white p-4 shadow-xl dark:border-[#2A2A33] dark:bg-[#1C1C22]">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E0D5] dark:border-[#2A2A33]">
                <h4 className="text-sm font-semibold text-[#1C1917] dark:text-white">Notifications</h4>
                <span className="text-[11px] text-[#78716C]">0 new</span>
              </div>
              <div className="py-8 text-center text-xs text-[#78716C] dark:text-[#A1A1AA]">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#C8622A]" />
                No unread notifications at this time.
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
