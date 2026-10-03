'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MembershipPlan } from '@/types/membership';
import {
  Crown,
  Plus,
  Check,
  Edit2,
  Trash2,
  Percent,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMembershipsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [loyaltyMultiplier, setLoyaltyMultiplier] = useState('2');
  const [freeDrinks, setFreeDrinks] = useState(false);
  const [customPerks, setCustomPerks] = useState('');

  const fetchPlans = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'membershipPlans');
      const q = query(ref, where('restaurantId', '==', activeRestaurantId));
      const snap = await getDocs(q);
      const list: MembershipPlan[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as MembershipPlan);
      });
      setPlans(list.sort((a, b) => a.price - b.price));
    } catch (err) {
      console.error('Failed to load membership plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [activeRestaurantId]);

  const handleOpenModal = (p?: MembershipPlan) => {
    if (p) {
      setEditingPlan(p);
      setName(p.name);
      setPrice(p.price.toString());
      setDurationDays(p.durationDays.toString());
      setDiscountPercent(p.discountPercent.toString());
      setLoyaltyMultiplier(p.loyaltyMultiplier.toString());
      setFreeDrinks(p.freeDrinksEveryVisit || false);
      setCustomPerks(p.customPerks?.join('\n') || '');
    } else {
      setEditingPlan(null);
      setName('');
      setPrice('299');
      setDurationDays('30');
      setDiscountPercent('10');
      setLoyaltyMultiplier('2');
      setFreeDrinks(false);
      setCustomPerks('');
    }
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !name.trim() || !price) {
      toast.error('Name and price are required');
      return;
    }

    setSaving(true);
    try {
      const perksArray = customPerks
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Partial<MembershipPlan> = {
        restaurantId: activeRestaurantId,
        name: name.trim(),
        price: parseFloat(price) || 0,
        durationDays: parseInt(durationDays) || 30,
        discountPercent: parseFloat(discountPercent) || 0,
        loyaltyMultiplier: parseFloat(loyaltyMultiplier) || 1,
        freeDrinksEveryVisit: freeDrinks,
        customPerks: perksArray,
        updatedAt: serverTimestamp() as any,
      };

      if (editingPlan) {
        await updateDoc(doc(db, 'membershipPlans', editingPlan.id), payload);
        toast.success(`Plan ${payload.name} updated`);
      } else {
        payload.active = true;
        payload.createdAt = serverTimestamp() as any;
        await addDoc(collection(db, 'membershipPlans'), payload);
        toast.success(`Plan ${payload.name} created`);
      }

      setIsModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      toast.error('Failed to save membership plan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: MembershipPlan) => {
    try {
      const newActive = !p.active;
      await updateDoc(doc(db, 'membershipPlans', p.id), {
        active: newActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`${p.name} marked as ${newActive ? 'Active' : 'Inactive'}`);
      await fetchPlans();
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              VIP Membership Club Builder
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure subscription tiers, discount percentages, accelerated loyalty multipliers, and perks for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'All Locations'}
              </span>
            </p>
          </div>

          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Membership Tier
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="No Membership Plans Configured"
            description="Create your first subscription tier (e.g. Silver, Gold, or Platinum) to reward repeat patrons."
            actionLabel="Create Tier Now"
            onAction={() => handleOpenModal()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-serif text-xl font-bold text-gray-900 dark:text-white">
                      {plan.name}
                    </span>
                    <StatusBadge status={plan.active ? 'ACTIVE' : 'INACTIVE'} />
                  </div>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      ₹{plan.price}
                    </span>
                    <span className="text-xs text-gray-400">/ {plan.durationDays} days</span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300 py-3 border-y border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{plan.discountPercent}% order discount</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{plan.loyaltyMultiplier}x loyalty points</span>
                    </div>
                    {plan.freeDrinksEveryVisit && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Complimentary welcome beverage</span>
                      </div>
                    )}
                    {plan.customPerks?.map((perk: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(plan)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    {plan.active ? 'Deactivate' : 'Activate'}
                  </button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenModal(plan)}
                    className="text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Add or Edit Plan */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingPlan ? `Edit ${editingPlan.name}` : 'Create Membership Tier'}
        >
          <form onSubmit={handleSavePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tier Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gold VIP"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Price (₹) *
                </label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="299"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Duration (Days)
                </label>
                <Input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Discount (%)
                </label>
                <Input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Loyalty Multiplier
                </label>
                <Input
                  type="number"
                  value={loyaltyMultiplier}
                  onChange={(e) => setLoyaltyMultiplier(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={freeDrinks}
                onChange={(e) => setFreeDrinks(e.target.checked)}
                className="rounded text-primary"
              />
              <span>Complimentary drink every visit</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Custom Perks (One per line)
              </label>
              <textarea
                value={customPerks}
                onChange={(e) => setCustomPerks(e.target.value)}
                rows={3}
                placeholder="Free sparkling water&#10;Priority weekend seating&#10;Complimentary chef sampler"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Tier'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
