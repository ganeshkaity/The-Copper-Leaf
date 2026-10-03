'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
  Settings,
  Building2,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Save,
  Globe,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploadOrLink } from '@/components/ui/image-upload-or-link';
import { AiGenerateButton } from '@/components/ui/ai-generate-button';

export default function AdminSettingsPage() {
  const { currentRestaurant, restaurants, refreshRestaurants } = useRestaurant();
  const activeRestaurant = currentRestaurant || (restaurants.length > 0 ? restaurants[0] : null);

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [whyChooseUs, setWhyChooseUs] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [openTime, setOpenTime] = useState('11:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [bookingCta, setBookingCta] = useState('Reserve an Artisanal Table Experience');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (activeRestaurant) {
      setName(activeRestaurant.name || '');
      setTagline(activeRestaurant.tagline || '');
      setAbout(activeRestaurant.about || activeRestaurant.description || '');
      setWhyChooseUs(activeRestaurant.whyChooseUs || '');
      const addrStr = typeof activeRestaurant.address === 'object' && activeRestaurant.address !== null
        ? `${activeRestaurant.address.street || ''}${activeRestaurant.address.city ? ', ' + activeRestaurant.address.city : ''}`
        : ((activeRestaurant.address as unknown as string) || '');
      setAddress(addrStr);
      setPhone(activeRestaurant.phone || '');
      setEmail(activeRestaurant.email || '');
      setHeroImageUrl(activeRestaurant.heroImageUrl || '');
      setLogoUrl(activeRestaurant.logoUrl || '');
      if (activeRestaurant.openingHours?.monday) {
        setOpenTime(activeRestaurant.openingHours.monday.open || '11:00');
        setCloseTime(activeRestaurant.openingHours.monday.close || '23:00');
      }
      if (activeRestaurant.bookingSettings?.ctaText) {
        setBookingCta(activeRestaurant.bookingSettings.ctaText);
      }
    }
  }, [activeRestaurant]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'hero' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');
      if (target === 'hero') setHeroImageUrl(data.url);
      else setLogoUrl(data.url);
      toast.success('Image uploaded successfully');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurant) return;

    setSaving(true);
    try {
      const restRef = doc(db, 'restaurants', activeRestaurant.id);
      await updateDoc(restRef, {
        name: name.trim(),
        tagline: tagline.trim(),
        about: about.trim(),
        description: about.trim(),
        whyChooseUs: whyChooseUs.trim(),
        address: {
          street: address.trim(),
          city: (typeof activeRestaurant.address === 'object' && activeRestaurant.address?.city) || 'City',
          state: (typeof activeRestaurant.address === 'object' && activeRestaurant.address?.state) || '',
          postalCode: (typeof activeRestaurant.address === 'object' && activeRestaurant.address?.postalCode) || '',
          country: (typeof activeRestaurant.address === 'object' && activeRestaurant.address?.country) || 'India',
        },
        phone: phone.trim(),
        email: email.trim(),
        heroImageUrl: heroImageUrl.trim(),
        logoUrl: logoUrl.trim(),
        'openingHours.monday.open': openTime,
        'openingHours.monday.close': closeTime,
        'openingHours.tuesday.open': openTime,
        'openingHours.tuesday.close': closeTime,
        'openingHours.wednesday.open': openTime,
        'openingHours.wednesday.close': closeTime,
        'openingHours.thursday.open': openTime,
        'openingHours.thursday.close': closeTime,
        'openingHours.friday.open': openTime,
        'openingHours.friday.close': closeTime,
        'openingHours.saturday.open': openTime,
        'openingHours.saturday.close': closeTime,
        'openingHours.sunday.open': openTime,
        'openingHours.sunday.close': closeTime,
        'bookingSettings.ctaText': bookingCta.trim(),
        updatedAt: serverTimestamp(),
      });

      await refreshRestaurants();
      toast.success('Restaurant content & public settings saved');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!activeRestaurant) {
    return (
      <AdminShell>
        <div className="p-8 text-center text-xs text-gray-500">
          No restaurant selected. Please configure a branch in Setup or Restaurants.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Restaurant Brand & CMS Content
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage public website copy, hero text, about story, contact details, and operating schedules for{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {activeRestaurant.name}
            </span>
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Identity & Story */}
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] space-y-4">
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Brand Identity & Narrative
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Restaurant Display Name *
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tagline
                </label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Artisanal Dining & Crafted Cocktails"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Culinary Story (About Us)
                </label>
                <AiGenerateButton
                  type="restaurant-about"
                  itemName={name}
                  currentText={about}
                  onGenerated={(generated) => setAbout(generated)}
                />
              </div>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={3}
                placeholder="A gastronomic haven celebrating heirloom recipes, authentic Indian tandoor..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Why Choose Us Highlights
                </label>
                <AiGenerateButton
                  type="restaurant-about"
                  itemName={name}
                  promptHint="Highlight the unique value propositions, culinary heritage, ambiance, and impeccable service in 2-3 concise bullet points"
                  currentText={whyChooseUs}
                  onGenerated={(generated) => setWhyChooseUs(generated)}
                />
              </div>
              <textarea
                value={whyChooseUs}
                onChange={(e) => setWhyChooseUs(e.target.value)}
                rows={2}
                placeholder="Heirloom slow cooking • Farm-fresh ingredients • Artisanal mixology..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <ImageUploadOrLink
                  value={logoUrl}
                  onChange={(url) => setLogoUrl(url)}
                  label="Restaurant Logo (File or Link)"
                  placeholder="https://... logo image link"
                />
              </div>

              <div>
                <ImageUploadOrLink
                  value={heroImageUrl}
                  onChange={(url) => setHeroImageUrl(url)}
                  label="Hero Cover Image (File or Link)"
                  placeholder="https://... cover image link"
                />
              </div>
            </div>
          </Card>

          {/* Location & Contact */}
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] space-y-4">
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Location & Contact Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Physical Address
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Unit 12, Cyber Hub, Gurugram"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Customer Email
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@thecopperleaf.com"
                />
              </div>
            </div>
          </Card>

          {/* Service Hours & Booking CTA */}
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] space-y-4">
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Operating Hours & Booking CTA
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Opening Time
                </label>
                <Input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Closing Time
                </label>
                <Input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Booking Call-to-Action Text
              </label>
              <Input
                value={bookingCta}
                onChange={(e) => setBookingCta(e.target.value)}
                placeholder="Reserve an Artisanal Table Experience"
              />
            </div>
          </Card>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving || uploading} className="px-8 py-3">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving Settings...' : 'Save Public Settings'}
            </Button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
