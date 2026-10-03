'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { useAuth } from '@/lib/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Expense } from '@/types/expense';
import {
  DollarSign,
  Plus,
  Receipt,
  Tag,
  Calendar,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminExpensesPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const { profile, user } = useAuth();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('Utilities');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'expenses');
      const q = query(
        ref,
        where('restaurantId', '==', activeRestaurantId),
        orderBy('expenseDate', 'desc')
      );
      const snap = await getDocs(q);
      const list: Expense[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Expense);
      });
      setExpenses(list);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeRestaurantId]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        restaurantId: activeRestaurantId,
        category,
        amount: parseFloat(amount),
        description: description.trim(),
        createdBy: profile?.displayName || user?.email || 'Admin',
        expenseDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      toast.success('Expense recorded');
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      await fetchExpenses();
    } catch (err: any) {
      toast.error('Failed to save expense: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Operational Expenses ({expenses.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track utilities, equipment repairs, supplies, and miscellaneous restaurant expenditures for{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentRestaurant?.name || 'All Locations'}
              </span>
            </p>
          </div>

          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Expense
          </Button>
        </div>

        {/* Total Expense Banner Card */}
        <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Recorded Expenses</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
              ₹{totalExpenseAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-primary flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </Card>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Expenses Logged"
            description="Log operating costs to calculate net profitability."
            actionLabel="Record Expense"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3 text-right">Amount (₹)</th>
                    <th className="pb-3">Logged By</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-[#22222A]/50">
                      <td className="py-3 font-semibold text-gray-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 text-gray-700 dark:text-gray-300">
                        {exp.description || 'Operating expense'}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-rose-600">
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-gray-500">{exp.createdBy}</td>
                      <td className="py-3 text-gray-400">
                        {exp.expenseDate?.seconds
                          ? new Date(exp.expenseDate.seconds * 1000).toLocaleDateString('en-IN')
                          : 'Today'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Modal: Record Expense */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Record Restaurant Expense"
        >
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Expense Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
              >
                <option value="Utilities">Utilities (Gas, Electricity, Water)</option>
                <option value="Rent">Property Rent / Lease</option>
                <option value="Maintenance">Equipment Repairs & Maintenance</option>
                <option value="Supplies">Bar & Kitchen Supplies</option>
                <option value="Marketing">Marketing & Promotions</option>
                <option value="Staff Meals">Staff Meals & Welfare</option>
                <option value="Other">Other Operating Cost</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Amount (₹) *
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Description / Memo
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Commercial gas cylinder refilling"
                required
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
                {saving ? 'Recording...' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
