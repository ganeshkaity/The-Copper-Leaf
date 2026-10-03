'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';
import { useAuth } from '@/lib/context/auth-context';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, loading: authLoading, isAdmin } = useAuth();
  const { restaurants, loading: restLoading } = useRestaurant();
  const pathname = usePathname();

  if (authLoading || restLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#0F0F12]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#C8622A]/20 border-t-[#C8622A] rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#78716C] dark:text-[#A1A1AA]">
            Loading Copper Leaf Admin...
          </p>
        </div>
      </div>
    );
  }

  // Unauthorized access guard
  if (!profile || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#0F0F12] p-6">
        <div className="max-w-md w-full rounded-2xl border border-[#E8E0D5] bg-white p-8 text-center shadow-lg dark:bg-[#18181D] dark:border-[#2A2A33]">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1917] dark:text-white mb-2">
            Administrator Access Required
          </h2>
          <p className="text-sm text-[#78716C] dark:text-[#A1A1AA] mb-6">
            You must be signed in with an authorized Administrator account to view this section. Current role:{' '}
            <span className="font-semibold text-[#C8622A]">{profile?.role || 'Guest'}</span>.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link href="/auth/sign-in">
              <Button className="w-full">Sign In with Admin Account</Button>
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

  return (
    <div className="min-h-screen flex bg-[#FAF6F0] dark:bg-[#0F0F12]">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Global banner if no restaurant branch is configured yet and not on setup wizard */}
        {restaurants.length === 0 && pathname !== '/n/admin/setup' && (
          <div className="bg-[#FDF4ED] dark:bg-[#2A1C14] border-b border-[#E8E0D5] dark:border-[#2A2A33] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs md:text-sm text-[#1C1917] dark:text-white font-medium">
              <Building2 className="w-4 h-4 text-[#C8622A] shrink-0" />
              <span>No restaurant branch is configured yet. Run the Initial Setup Wizard to get started.</span>
            </div>
            <Link href="/n/admin/setup">
              <Button size="sm" variant="primary">
                Launch Setup Wizard
              </Button>
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
