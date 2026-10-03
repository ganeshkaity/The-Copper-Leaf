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
import { AdditionalCharge } from '@/types/taxes-charges';
import { Plus, Edit2, DollarSign, Percent } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminChargesPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [charges, setCharges] = useState<AdditionalCharge[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<AdditionalCharge | null>(null);
  const [name, setName] = useState('');
  const [chargeType, setChargeType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('5');
  const [saving, setSaving] = useState(false);

  const fetchCharges = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'additionalCharges');
      const q = query(ref, where('restaurantId', '==', activeRestaurantId));
      const snap = await getDocs(q);
      const list: AdditionalCharge[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AdditionalCharge);
      });
      setCharges(list);
    } catch (err) {
      console.error('Failed to load charges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, [activeRestaurantId]);

  const handleOpenModal = (c?: AdditionalCharge) => {
    if (c) {
      setEditingCharge(c);
      setName(c.name);
      setChargeType(c.type);
      setValue(c.value.toString());
    } else {
      setEditingCharge(null);
      setName('Staff Gratuity / Service Charge');
      setChargeType('PERCENTAGE');
      setValue('5');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !name.trim()) {
      toast.error('Charge name is required');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<AdditionalCharge> = {
        restaurantId: activeRestaurantId,
        name: name.trim(),
        type: chargeType,
        value: parseFloat(value) || 0,
        updatedAt: serverTimestamp() as any,
      };

      if (editingCharge) {
        await updateDoc(doc(db, 'additionalCharges', editingCharge.id), payload);
        toast.success(`Charge "${payload.name}" updated`);
      } else {
        payload.active = true;
        payload.createdAt = serverTimestamp() as any;
        await addDoc(collection(db, 'additionalCharges'), payload);
        toast.success(`Charge "${payload.name}" added`);
      }

      setIsModalOpen(false);
      await fetchCharges();
    } catch (err: any) {
      toast.error('Failed to save charge: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: AdditionalCharge) => {
    try {
      const newActive = !c.active;
      await updateDoc(doc(db, 'additionalCharges', c.id), {
        active: newActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`${c.name} is now ${newActive ? 'Active' : 'Disabled'}`);
      await fetchCharges();
    } catch (err: any) {
      toast.error('Failed to update charge');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Service Charges & Packaging ({charges.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure optional service charges, packaging fees, or event charges. Default is zero.
            </p>
          </div>

          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Surcharge
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : charges.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No Extra Charges Configured"
            description="Default is 0% service charge. Add custom charges if applicable to dine-in or takeaway bills."
            actionLabel="Add Charge"
            onAction={() => handleOpenModal()}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {charges.map((charge) => (
              <Card
                key={charge.id}
                className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                      {charge.name}
                    </span>
                    <StatusBadge status={charge.active ? 'ACTIVE' : 'INACTIVE'} />
                  </div>

                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
                    {charge.type === 'PERCENTAGE' ? `${charge.value}%` : `₹${charge.value}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    Type: {charge.type === 'PERCENTAGE' ? 'Percentage of Bill' : 'Fixed Rupee Amount'}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(charge)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    {charge.active ? 'Disable' : 'Enable'}
                  </button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenModal(charge)}
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

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCharge ? `Edit ${editingCharge.name}` : 'Add Charge Rule'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Charge Label *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Service Charge, Takeaway Eco Packaging"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={chargeType}
                  onChange={(e) => setChargeType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Flat Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Value *
                </label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="5"
                  step="0.1"
                  required
                />
              </div>
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
                {saving ? 'Saving...' : editingCharge ? 'Save Changes' : 'Create Charge'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
