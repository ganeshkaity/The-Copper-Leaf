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
import { Coupon, DiscountType } from '@/types/coupon';
import {
  Ticket,
  Plus,
  Percent,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCouponsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT');
  const [discountValue, setDiscountValue] = useState('15');
  const [minOrderAmount, setMinOrderAmount] = useState('500');
  const [maxDiscount, setMaxDiscount] = useState('200');
  const [description, setDescription] = useState('');

  const fetchCoupons = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'coupons');
      const q = query(ref, where('restaurantId', '==', activeRestaurantId));
      const snap = await getDocs(q);
      const list: Coupon[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Coupon);
      });
      setCoupons(list);
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [activeRestaurantId]);

  const handleOpenModal = (c?: Coupon) => {
    if (c) {
      setEditingCoupon(c);
      setCode(c.code);
      setDiscountType(c.discountType);
      setDiscountValue(c.discountValue.toString());
      setMinOrderAmount(c.minOrderAmount?.toString() || '0');
      setMaxDiscount(c.maxDiscount?.toString() || '');
      setDescription(c.description || '');
    } else {
      setEditingCoupon(null);
      setCode('');
      setDiscountType('PERCENT');
      setDiscountValue('15');
      setMinOrderAmount('500');
      setMaxDiscount('200');
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !code.trim() || !discountValue) {
      toast.error('Code and discount value are required');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Coupon> = {
        restaurantId: activeRestaurantId,
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        description: description.trim(),
        updatedAt: serverTimestamp() as any,
      };

      if (editingCoupon) {
        await updateDoc(doc(db, 'coupons', editingCoupon.id), payload);
        toast.success(`Coupon ${payload.code} updated`);
      } else {
        payload.active = true;
        payload.usageCount = 0;
        payload.createdAt = serverTimestamp() as any;
        await addDoc(collection(db, 'coupons'), payload);
        toast.success(`Coupon ${payload.code} created`);
      }

      setIsModalOpen(false);
      await fetchCoupons();
    } catch (err: any) {
      toast.error('Failed to save coupon: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      const newActive = !c.active;
      await updateDoc(doc(db, 'coupons', c.id), {
        active: newActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Coupon ${c.code} is now ${newActive ? 'Active' : 'Disabled'}`);
      await fetchCoupons();
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
              Promotional Coupons ({coupons.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create and manage promo codes with authoritative server-side calculation and min-spend thresholds.
            </p>
          </div>

          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Coupon
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : coupons.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No Coupons Configured"
            description="Create promotional codes (e.g. WELCOME50, COPPER15) to offer seasonal or welcome discounts."
            actionLabel="Create Promo Code"
            onAction={() => handleOpenModal()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coupons.map((coupon) => (
              <Card
                key={coupon.id}
                className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-base font-bold text-primary tracking-wider px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
                      {coupon.code}
                    </span>
                    <StatusBadge status={coupon.active ? 'ACTIVE' : 'INACTIVE'} />
                  </div>

                  <p className="font-serif text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {coupon.discountType === 'PERCENT'
                      ? `${coupon.discountValue}% OFF`
                      : `₹${coupon.discountValue} FLAT OFF`}
                  </p>

                  <p className="text-xs text-gray-500 mb-3">
                    {coupon.description || 'Promotional dining discount'}
                  </p>

                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 py-2 border-t border-gray-100 dark:border-gray-800">
                    <p>Min Order: ₹{coupon.minOrderAmount || 0}</p>
                    {coupon.maxDiscount && <p>Max Discount: ₹{coupon.maxDiscount}</p>}
                    <p className="text-gray-400">Total Redeemed: {coupon.usageCount || 0} times</p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(coupon)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    {coupon.active ? 'Disable' : 'Enable'}
                  </button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenModal(coupon)}
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

        {/* Modal: Create/Edit Coupon */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCoupon ? `Edit Coupon ${editingCoupon.code}` : 'Create Promotional Coupon'}
        >
          <form onSubmit={handleSaveCoupon} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Coupon Code *
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. COPPER20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Flat Rupee Amount (₹)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Discount Value *
                </label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="15"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Min Order (₹)
                </label>
                <Input
                  type="number"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  placeholder="500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Max Cap (₹)
                </label>
                <Input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="250"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Description / Terms
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Valid on orders above ₹500"
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
                {saving ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
