'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  User as UserIcon,
  Menu as MenuIcon,
  X,
  ChevronDown,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/context/auth-context';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { useCartStore } from '@/lib/stores/cart-store';
import { Button } from '@/components/ui/button';

export function CustomerNavbar({ currentSlug }: { currentSlug?: string }) {
  const pathname = usePathname();
  const { profile, firebaseUser } = useAuth();
  const { restaurants, selectedRestaurant, setSelectedRestaurantId } = useRestaurant();
  const itemCount = useCartStore((s) => s.getItemCount());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  // Active restaurant slug determination
  const activeSlug = currentSlug || selectedRestaurant?.slug || (restaurants[0] ? restaurants[0].slug : '');

  const navLinks = [
    { label: 'Home', href: activeSlug ? `/r/${activeSlug}` : '/' },
    { label: 'Menu', href: activeSlug ? `/r/${activeSlug}/menu` : '/' },
    { label: 'Categories', href: activeSlug ? `/r/${activeSlug}/categories` : '/' },
    { label: 'Offers', href: activeSlug ? `/r/${activeSlug}/offers` : '/' },
    { label: 'Gallery', href: activeSlug ? `/r/${activeSlug}/gallery` : '/' },
    { label: 'Reserve Table', href: activeSlug ? `/r/${activeSlug}/booking` : '/' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E0D5] bg-[#FAF6F0]/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href={activeSlug ? `/r/${activeSlug}` : '/'} className="flex items-center gap-3">
          <div className="relative w-11 h-11 shrink-0">
            <Image
              src="/brand/logo.png"
              alt="The Copper Leaf"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917]">
              The Copper Leaf
            </span>
            <span className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-[#C8622A] font-semibold">
              A Taste Worth Remembering
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[#C8622A] font-bold bg-[#FDF4ED]'
                    : 'text-[#44403C] hover:text-[#C8622A] hover:bg-[#F3ECE2]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Branch Dropdown */}
          {restaurants.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E8E0D5] bg-white text-xs font-semibold text-[#1C1917] hover:bg-[#F3ECE2] transition-colors shadow-sm"
              >
                <Building2 className="w-3.5 h-3.5 text-[#C8622A]" />
                <span className="max-w-[110px] truncate">
                  {selectedRestaurant?.name || 'Branches'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#78716C]" />
              </button>

              {branchDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E8E0D5] bg-white p-2 shadow-xl z-50">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#78716C] uppercase">
                    Choose Branch
                  </div>
                  {restaurants.map((rest) => (
                    <Link
                      key={rest.id}
                      href={`/r/${rest.slug}`}
                      onClick={() => {
                        setSelectedRestaurantId(rest.id);
                        setBranchDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors',
                        selectedRestaurant?.id === rest.id
                          ? 'bg-[#C8622A] text-white font-semibold'
                          : 'hover:bg-[#F3ECE2] text-[#1C1917]'
                      )}
                    >
                      <span className="truncate">{rest.name}</span>
                      <span className="text-[10px] opacity-75">{rest.address.city}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart Button */}
          {activeSlug && (
            <Link
              href={`/r/${activeSlug}/cart`}
              className="relative p-2.5 rounded-xl border border-[#E8E0D5] bg-white text-[#1C1917] hover:bg-[#F3ECE2] transition-colors shadow-sm"
              title="View Cart"
            >
              <ShoppingBag className="w-5 h-5 text-[#C8622A]" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#C8622A] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale">
                  {itemCount}
                </span>
              )}
            </Link>
          )}

          {/* User Profile / Sign In */}
          {firebaseUser ? (
            <Link
              href="/account"
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-[#E8E0D5] bg-white text-[#1C1917] hover:bg-[#F3ECE2] transition-colors shadow-sm"
            >
              <div className="w-7 h-7 rounded-full bg-[#C8622A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {profile?.displayName?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline text-xs font-semibold max-w-[100px] truncate">
                {profile?.displayName || 'My Account'}
              </span>
            </Link>
          ) : (
            <Link href="/auth/sign-in">
              <Button size="sm" variant="outline" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-[#1C1917] hover:bg-[#F3ECE2] md:hidden"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E0D5] bg-[#FAF6F0] px-4 pt-3 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top duration-200">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-base font-medium text-[#1C1917] hover:bg-[#F3ECE2]"
            >
              {item.label}
            </Link>
          ))}
          {!firebaseUser && (
            <div className="pt-2">
              <Link href="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">Sign In</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
