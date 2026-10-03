'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/auth-context';
import { useRestaurant } from '@/lib/context/restaurant-context';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
  Building2,
  MapPin,
  Clock,
  CalendarCheck,
  Percent,
  LayoutGrid,
  UtensilsCrossed,
  Crown,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { AiGenerateButton } from '@/components/ui/ai-generate-button';

export default function AdminSetupWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshRestaurants } = useRestaurant();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 & 2: Restaurant & Branch Details
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Step 3: Opening Hours
  const [openTime, setOpenTime] = useState('11:00');
  const [closeTime, setCloseTime] = useState('23:00');

  // Step 4: Booking Settings
  const [maxPartySize, setMaxPartySize] = useState('12');
  const [durationHours, setDurationHours] = useState('3');
  const [noShowMinutes, setNoShowMinutes] = useState('60');

  // Step 5: Taxes & Charges
  const [taxName, setTaxName] = useState('GST');
  const [taxPercent, setTaxPercent] = useState('5');
  const [serviceChargePercent, setServiceChargePercent] = useState('0');

  // Step 6: Initial Tables Generator
  const [tableCount4Seater, setTableCount4Seater] = useState('6');
  const [tableCount2Seater, setTableCount2Seater] = useState('4');

  // Step 7: Optional Menu Starter
  const [initialCategory, setInitialCategory] = useState('Starters');
  const [initialDishName, setInitialDishName] = useState('');
  const [initialDishPrice, setInitialDishPrice] = useState('');

  // Step 8: Optional Membership
  const [enableMembership, setEnableMembership] = useState(false);
  const [memberPlanName, setMemberPlanName] = useState('Gold VIP');
  const [memberPlanPrice, setMemberPlanPrice] = useState('299');
  const [memberDiscount, setMemberDiscount] = useState('10');

  // Step 9: Payment Configuration
  const [acceptCash, setAcceptCash] = useState(true);
  const [acceptOnline, setAcceptOnline] = useState(true);

  // Auto slug generation
  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );
  };

  const handleFinishWizard = async () => {
    if (!name || !slug) {
      toast.error('Please enter restaurant name and slug');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Restaurant Document
      const restaurantData = {
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        about: description.trim(),
        logoUrl: logoUrl.trim(),
        heroImageUrl: heroImageUrl.trim(),
        address: {
          street: address.trim(),
          city: 'Main City',
          country: 'India',
        },
        phone: phone.trim(),
        email: email.trim(),
        cuisine: cuisine.trim() || 'Modern Indian & Continental',
        timezone: timezone.trim() || 'Asia/Kolkata',
        active: true,
        openingHours: {
          monday: { open: openTime, close: closeTime, closed: false },
          tuesday: { open: openTime, close: closeTime, closed: false },
          wednesday: { open: openTime, close: closeTime, closed: false },
          thursday: { open: openTime, close: closeTime, closed: false },
          friday: { open: openTime, close: closeTime, closed: false },
          saturday: { open: openTime, close: closeTime, closed: false },
          sunday: { open: openTime, close: closeTime, closed: false },
        },
        bookingSettings: {
          enabled: true,
          durationMinutes: parseInt(durationHours) * 60 || 180,
          noShowBufferMinutes: parseInt(noShowMinutes) || 60,
          maxPartySize: parseInt(maxPartySize) || 12,
          sameDayOnly: true,
        },
        orderSettings: {
          acceptDineIn: true,
          acceptTakeaway: true,
          acceptCash,
          acceptOnline,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const restDocRef = await addDoc(collection(db, 'restaurants'), restaurantData);
      const restaurantId = restDocRef.id;

      // 2. Create Initial Tables
      const count4 = parseInt(tableCount4Seater) || 0;
      const count2 = parseInt(tableCount2Seater) || 0;

      let tableNum = 1;
      const tablesRef = collection(db, 'tables');

      for (let i = 0; i < count2; i++) {
        await addDoc(tablesRef, {
          restaurantId,
          tableNumber: `T${tableNum.toString().padStart(2, '0')}`,
          floor: 'Main Floor',
          section: 'Indoor',
          shape: 'SQUARE',
          capacity: 2,
          positionX: (i % 5) * 120 + 40,
          positionY: Math.floor(i / 5) * 120 + 40,
          width: 80,
          height: 80,
          status: 'AVAILABLE',
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tableNum++;
      }

      for (let i = 0; i < count4; i++) {
        await addDoc(tablesRef, {
          restaurantId,
          tableNumber: `T${tableNum.toString().padStart(2, '0')}`,
          floor: 'Main Floor',
          section: 'Indoor',
          shape: 'RECTANGLE',
          capacity: 4,
          positionX: (i % 4) * 140 + 40,
          positionY: 260 + Math.floor(i / 4) * 120,
          width: 100,
          height: 80,
          status: 'AVAILABLE',
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tableNum++;
      }

      // 3. Tax Rule if configured
      if (parseFloat(taxPercent) > 0) {
        await addDoc(collection(db, 'taxRules'), {
          restaurantId,
          name: taxName || 'GST',
          percentage: parseFloat(taxPercent),
          priority: 1,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 4. Initial Menu Category and Dish if provided
      if (initialCategory.trim()) {
        const catRef = await addDoc(collection(db, 'menuCategories'), {
          restaurantId,
          name: initialCategory.trim(),
          sortOrder: 1,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (initialDishName.trim() && parseFloat(initialDishPrice) > 0) {
          await addDoc(collection(db, 'menuItems'), {
            restaurantId,
            categoryId: catRef.id,
            name: initialDishName.trim(),
            normalizedName: initialDishName.trim().toLowerCase(),
            basePrice: parseFloat(initialDishPrice),
            active: true,
            dietaryTags: ['VEG'],
            variants: [],
            modifierIds: [],
            stockTracked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // 5. Membership Plan if enabled
      if (enableMembership && parseFloat(memberPlanPrice) > 0) {
        await addDoc(collection(db, 'membershipPlans'), {
          restaurantId,
          name: memberPlanName.trim(),
          price: parseFloat(memberPlanPrice),
          durationDays: 30,
          discountPercent: parseFloat(memberDiscount) || 10,
          loyaltyMultiplier: 3,
          freeDrinksEveryVisit: true,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Refresh global restaurant context
      await refreshRestaurants();

      toast.success('Restaurant initialized successfully!');
      router.push('/n/admin/dashboard');
    } catch (err: any) {
      console.error('Setup wizard error:', err);
      toast.error('Failed to finish setup: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Brand', icon: Building2 },
    { num: 2, label: 'Location', icon: MapPin },
    { num: 3, label: 'Hours', icon: Clock },
    { num: 4, label: 'Booking', icon: CalendarCheck },
    { num: 5, label: 'Taxes', icon: Percent },
    { num: 6, label: 'Tables', icon: LayoutGrid },
    { num: 7, label: 'Menu', icon: UtensilsCrossed },
    { num: 8, label: 'Club', icon: Crown },
    { num: 9, label: 'Payments', icon: CreditCard },
    { num: 10, label: 'Finish', icon: CheckCircle2 },
  ];

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto py-6">
        {/* Wizard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-gray-900 dark:text-white">
                Initial Restaurant Setup Wizard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure your real restaurant location, tables, operating rules, and menu foundations.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              Step {step} of 10
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {steps.map((s) => {
              const Icon = s.icon;
              const isDone = s.num < step;
              const isCurrent = s.num === step;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-primary text-white font-semibold shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Cards */}
        <Card className="p-8 rounded-2xl border border-[#E8E0D5] bg-white shadow-sm dark:bg-[#18181D] dark:border-[#2A2A33]">
          {/* STEP 1: Restaurant / Brand Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Restaurant & Brand Identity
                </h2>
                <p className="text-xs text-gray-500">
                  This brand name will appear on the customer landing page, invoices, and table QR codes.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Restaurant Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. The Copper Leaf - Cyber Hub"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    URL Slug * (Used for /r/[slug])
                  </label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="the-copper-leaf"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tagline
                  </label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Artisanal Fine Dining & Crafted Mixology"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      About / Story
                    </label>
                    <AiGenerateButton
                      type="restaurant-about"
                      itemName={name}
                      currentText={description}
                      onGenerated={(generated) => setDescription(generated)}
                    />
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="A short culinary story celebrating heirloom spices and modern gastronomy..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] text-sm dark:bg-[#22222A] dark:border-[#2A2A33] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location & Contact */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Location & Contact Details
                </h2>
                <p className="text-xs text-gray-500">
                  Accurate physical address and phone number for customer reservation inquiries and receipts.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Full Physical Address *
                  </label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Unit 12, Ground Floor, Cyber Hub, Gurugram, Haryana 122002"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number *
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Email Address *
                    </label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@thecopperleaf.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Cuisine Style
                    </label>
                    <Input
                      value={cuisine}
                      onChange={(e) => setCuisine(e.target.value)}
                      placeholder="Modern Indian & Pan-Asian"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Timezone
                    </label>
                    <Input
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="Asia/Kolkata"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Operating Hours */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Opening & Closing Hours
                </h2>
                <p className="text-xs text-gray-500">
                  Dine-in booking slots and order acceptance follow these daily service hours.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-xl bg-gray-50 dark:bg-[#22222A]">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Opening Time (24h or HH:MM)
                  </label>
                  <Input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Closing Time (24h or HH:MM)
                  </label>
                  <Input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Booking Settings */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Table Reservation Rules
                </h2>
                <p className="text-xs text-gray-500">
                  Configure dining slot durations and no-show cancellation thresholds.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Standard Dining Duration (Hours)
                  </label>
                  <Input
                    type="number"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Default is 3 hours.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    No-Show Grace Period (Minutes)
                  </label>
                  <Input
                    type="number"
                    value={noShowMinutes}
                    onChange={(e) => setNoShowMinutes(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Reservations expire automatically after 60 minutes if the customer does not arrive.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Maximum Party Size Allowed per Booking
                  </label>
                  <Input
                    type="number"
                    value={maxPartySize}
                    onChange={(e) => setMaxPartySize(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Taxes & Charges */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Taxes & Charges
                </h2>
                <p className="text-xs text-gray-500">
                  Configurable tax rules applied authoritatively at checkout and bill generation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tax Label
                  </label>
                  <Input
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    placeholder="GST"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tax Percentage (%)
                  </label>
                  <Input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Tables Generator */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Floor Layout & Tables Generator
                </h2>
                <p className="text-xs text-gray-500">
                  Bulk create your initial dining tables. You can customize layout and positions visually later in Table Management.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-xl bg-gray-50 dark:bg-[#22222A]">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Number of 2-Seater Tables
                  </label>
                  <Input
                    type="number"
                    value={tableCount2Seater}
                    onChange={(e) => setTableCount2Seater(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Number of 4-Seater Tables
                  </label>
                  <Input
                    type="number"
                    value={tableCount4Seater}
                    onChange={(e) => setTableCount4Seater(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Optional Menu */}
          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Initial Menu Starter (Optional)
                </h2>
                <p className="text-xs text-gray-500">
                  Add your first category and signature dish to jump-start the culinary catalog.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Category Name
                  </label>
                  <Input
                    value={initialCategory}
                    onChange={(e) => setInitialCategory(e.target.value)}
                    placeholder="Appetizers"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Signature Dish Name
                    </label>
                    <Input
                      value={initialDishName}
                      onChange={(e) => setInitialDishName(e.target.value)}
                      placeholder="e.g. Copper Paneer Tikka"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Base Price (₹)
                    </label>
                    <Input
                      type="number"
                      value={initialDishPrice}
                      onChange={(e) => setInitialDishPrice(e.target.value)}
                      placeholder="380"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Membership Program */}
          {step === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  VIP Membership Club (Optional)
                </h2>
                <p className="text-xs text-gray-500">
                  Allow diners to subscribe to VIP discount tiers and accelerated loyalty.
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E0D5] dark:border-[#2A2A33]">
                <input
                  type="checkbox"
                  id="enableMem"
                  checked={enableMembership}
                  onChange={(e) => setEnableMembership(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="enableMem" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                  Launch an initial VIP Tier now
                </label>
              </div>

              {enableMembership && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-orange-50/50 dark:bg-[#2A1C14]">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Tier Name
                    </label>
                    <Input
                      value={memberPlanName}
                      onChange={(e) => setMemberPlanName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Price (₹ / 30 Days)
                    </label>
                    <Input
                      type="number"
                      value={memberPlanPrice}
                      onChange={(e) => setMemberPlanPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Discount (%)
                    </label>
                    <Input
                      type="number"
                      value={memberDiscount}
                      onChange={(e) => setMemberDiscount(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 9: Payment Methods */}
          {step === 9 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Settlement & Payment Acceptance
                </h2>
                <p className="text-xs text-gray-500">
                  Choose payment options supported for customer checkouts and waiter billing.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E0D5] dark:border-[#2A2A33] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptOnline}
                    onChange={(e) => setAcceptOnline(e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Razorpay Online Payment (UPI, Credit/Debit Cards, NetBanking)
                    </p>
                    <p className="text-xs text-gray-500">
                      Authoritatively verified via server route handlers.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E0D5] dark:border-[#2A2A33] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptCash}
                    onChange={(e) => setAcceptCash(e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Cash at Table
                    </p>
                    <p className="text-xs text-gray-500">
                      Customers call the waiter to collect cash and waiter marks it received.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 10: Review & Finish */}
          {step === 10 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Ready to Launch {name || 'Your Restaurant'}!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mt-2">
                  Clicking below will save your branch profile, generate your dining tables, register your initial tax and menu foundations, and bring your restaurant live on the platform.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#22222A] max-w-md mx-auto text-left text-xs space-y-2 text-gray-700 dark:text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">Branch Name:</span>
                  <span className="font-semibold">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">URL Slug:</span>
                  <span className="font-mono">/r/{slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hours:</span>
                  <span>{openTime} - {closeTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Tables:</span>
                  <span>{(parseInt(tableCount2Seater) || 0) + (parseInt(tableCount4Seater) || 0)} tables</span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Action Footer */}
          <div className="flex items-center justify-between pt-8 border-t border-[#E8E0D5] dark:border-[#2A2A33] mt-8">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            ) : (
              <div />
            )}

            {step < 10 ? (
              <Button
                onClick={() => {
                  if (step === 1 && (!name || !slug)) {
                    toast.error('Restaurant name and slug are required');
                    return;
                  }
                  setStep(step + 1);
                }}
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinishWizard}
                disabled={loading}
                className="px-8"
              >
                {loading ? 'Initializing Database...' : 'Complete & Launch Restaurant'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
