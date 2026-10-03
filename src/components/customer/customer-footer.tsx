import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Restaurant } from '@/types';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export function CustomerFooter({ restaurant }: { restaurant?: Restaurant | null }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E8E0D5] bg-[#FAF6F0] text-[#1C1917] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0">
                <Image
                  src="/brand/logo.png"
                  alt="The Copper Leaf"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold tracking-tight">The Copper Leaf</h3>
                <p className="text-xs text-[#C8622A] uppercase tracking-wider font-semibold">
                  A Taste Worth Remembering
                </p>
              </div>
            </div>
            <p className="text-sm text-[#78716C] leading-relaxed">
              {restaurant?.description ||
                'Crafting unforgettable culinary memories through artisanal ingredients, traditional warmth, and refined hospitality.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-bold text-base mb-4 text-[#1C1917]">Experience</h4>
            <ul className="space-y-2.5 text-sm text-[#78716C]">
              {restaurant?.slug ? (
                <>
                  <li>
                    <Link href={`/r/${restaurant.slug}/menu`} className="hover:text-[#C8622A] transition-colors">
                      Chef's Menu
                    </Link>
                  </li>
                  <li>
                    <Link href={`/r/${restaurant.slug}/booking`} className="hover:text-[#C8622A] transition-colors">
                      Table Reservation
                    </Link>
                  </li>
                  <li>
                    <Link href={`/r/${restaurant.slug}/offers`} className="hover:text-[#C8622A] transition-colors">
                      Special Offers
                    </Link>
                  </li>
                  <li>
                    <Link href={`/r/${restaurant.slug}/gallery`} className="hover:text-[#C8622A] transition-colors">
                      Photo Gallery
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/" className="hover:text-[#C8622A] transition-colors">
                      Locations
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link href="/auth/sign-in" className="hover:text-[#C8622A] transition-colors">
                  Member Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="font-serif font-bold text-base mb-4 text-[#1C1917]">Drop By</h4>
            <div className="space-y-3 text-sm text-[#78716C]">
              {restaurant?.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#C8622A] shrink-0 mt-0.5" />
                  <span>
                    {restaurant.address.street}, {restaurant.address.city}
                    {restaurant.address.state ? `, ${restaurant.address.state}` : ''}
                  </span>
                </div>
              )}
              {restaurant?.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#C8622A] shrink-0" />
                  <a href={`tel:${restaurant.phone}`} className="hover:text-[#C8622A]">
                    {restaurant.phone}
                  </a>
                </div>
              )}
              {restaurant?.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#C8622A] shrink-0" />
                  <a href={`mailto:${restaurant.email}`} className="hover:text-[#C8622A]">
                    {restaurant.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Operating Hours */}
          <div>
            <h4 className="font-serif font-bold text-base mb-4 text-[#1C1917]">Hours</h4>
            <div className="space-y-2 text-sm text-[#78716C]">
              <div className="flex items-center gap-2 text-[#C8622A] font-medium mb-2">
                <Clock className="w-4 h-4" />
                <span>Open for Dining & Takeaway</span>
              </div>
              <p className="text-xs leading-relaxed">
                Mon - Sun: 11:00 AM - 11:30 PM
              </p>
              <p className="text-xs text-[#A1A1AA]">
                Same-day reservations recommended for evening dinner services.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#E8E0D5] pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#78716C] gap-4">
          <p>© {currentYear} The Copper Leaf. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#C8622A]">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-[#C8622A]">
              Terms of Service
            </Link>
            <Link href="/management/manage" className="hover:text-[#C8622A] font-semibold text-[#C8622A]">
              Staff Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
