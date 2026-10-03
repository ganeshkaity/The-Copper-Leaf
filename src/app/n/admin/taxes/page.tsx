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
import { TaxRule } from '@/types/taxes-charges';
import { Percent, Plus, Edit2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTaxesPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState('5');
  const [priority, setPriority] = useState('1');
  const [saving, setSaving] = useState(false);

  const fetchTaxes = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'taxRules');
      const q = query(ref, where('restaurantId', '==', activeRestaurantId));
      const snap = await getDocs(q);
      const list: TaxRule[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as TaxRule);
      });
      setTaxRules(list);
    } catch (err) {
      console.error('Failed to load tax rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, [activeRestaurantId]);

  const handleOpenModal = (t?: TaxRule) => {
    if (t) {
      setEditingRule(t);
      setName(t.name);
      setPercentage(t.percentage.toString());
      setPriority(t.priority?.toString() || '1');
    } else {
      setEditingRule(null);
      setName('GST');
      setPercentage('5');
      setPriority('1');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !name.trim()) {
      toast.error('Tax name is required');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<TaxRule> = {
        restaurantId: activeRestaurantId,
        name: name.trim(),
        percentage: parseFloat(percentage) || 0,
        priority: parseInt(priority) || 1,
        updatedAt: serverTimestamp() as any,
      };

      if (editingRule) {
        await updateDoc(doc(db, 'taxRules', editingRule.id), payload);
        toast.success(`Tax rule "${payload.name}" updated`);
      } else {
        payload.active = true;
        payload.createdAt = serverTimestamp() as any;
        await addDoc(collection(db, 'taxRules'), payload);
        toast.success(`Tax rule "${payload.name}" added`);
      }

      setIsModalOpen(false);
      await fetchTaxes();
    } catch (err: any) {
      toast.error('Failed to save tax rule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: TaxRule) => {
    try {
      const newActive = !t.active;
      await updateDoc(doc(db, 'taxRules', t.id), {
        active: newActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`${t.name} set to ${newActive ? 'Active' : 'Disabled'}`);
      await fetchTaxes();
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
              Tax Configuration ({taxRules.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure jurisdiction tax rates applied authoritatively during pricing engine calculations.
            </p>
          </div>

          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tax Rule
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : taxRules.length === 0 ? (
          <EmptyState
            icon={Percent}
            title="No Taxes Configured"
            description="Default is 0% tax. Add tax rules such as GST 5% or VAT to enable tax calculations on dining orders."
            actionLabel="Add Tax Rule"
            onAction={() => handleOpenModal()}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {taxRules.map((tax) => (
              <Card
                key={tax.id}
                className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                      {tax.name}
                    </span>
                    <StatusBadge status={tax.active ? 'ACTIVE' : 'INACTIVE'} />
                  </div>

                  <p className="text-3xl font-extrabold text-primary mb-1">
                    {tax.percentage}%
                  </p>
                  <p className="text-xs text-gray-400">Calculation priority: {tax.priority || 1}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(tax)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    {tax.active ? 'Disable' : 'Enable'}
                  </button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenModal(tax)}
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

        {/* Modal: Add/Edit Tax */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRule ? `Edit ${editingRule.name}` : 'Add Tax Rule'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tax Label *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. GST (Goods & Services Tax)"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tax Percentage (%) *
                </label>
                <Input
                  type="number"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="5"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="1"
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
                {saving ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Tax'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
