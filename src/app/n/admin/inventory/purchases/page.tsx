'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { InventoryPurchase } from '@/types/inventory';
import { MenuItem } from '@/types/menu';
import {
  ShoppingBag,
  Plus,
  ArrowLeft,
  Calendar,
  Building,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPurchasesPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const { profile, user } = useAuth();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [uom, setUom] = useState('units');
  const [unitCost, setUnitCost] = useState('100');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Load Purchases
      const purchRef = collection(db, 'inventoryPurchases');
      const purchQ = query(
        purchRef,
        where('restaurantId', '==', activeRestaurantId),
        orderBy('purchaseDate', 'desc')
      );
      const purchSnap = await getDocs(purchQ);
      const purchList: InventoryPurchase[] = [];
      purchSnap.forEach((d) => {
        purchList.push({ id: d.id, ...d.data() } as InventoryPurchase);
      });
      setPurchases(purchList);

      // 2. Load Menu Items for stock replenishment linking
      const itemsRef = collection(db, 'menuItems');
      const itemsQ = query(itemsRef, where('restaurantId', '==', activeRestaurantId));
      const itemsSnap = await getDocs(itemsQ);
      const itemsList: MenuItem[] = [];
      itemsSnap.forEach((d) => {
        itemsList.push({ id: d.id, ...d.data() } as MenuItem);
      });
      setMenuItems(itemsList);
    } catch (err) {
      console.error('Purchases load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeRestaurantId]);

  const handleOpenModal = () => {
    setSelectedItemId(menuItems.length > 0 ? menuItems[0].id : '');
    setItemName(menuItems.length > 0 ? menuItems[0].name : '');
    setQuantity('10');
    setUom('units');
    setUnitCost('150');
    setVendor('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    const found = menuItems.find((i) => i.id === id);
    if (found) setItemName(found.name);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId) return;

    const qtyNum = parseFloat(quantity) || 0;
    const costNum = parseFloat(unitCost) || 0;
    const totalAmount = qtyNum * costNum;

    setSaving(true);
    try {
      // 1. Create Purchase record
      await addDoc(collection(db, 'inventoryPurchases'), {
        restaurantId: activeRestaurantId,
        itemId: selectedItemId,
        itemName: itemName || 'Inventory Restock',
        quantity: qtyNum,
        uom: uom.trim(),
        cost: costNum,
        totalCost: totalAmount,
        vendor: vendor.trim() || undefined,
        notes: notes.trim() || undefined,
        enteredBy: profile?.displayName || user?.email || 'Admin',
        purchaseDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // 2. Increment stock quantity on the menu item if stock is tracked
      if (selectedItemId) {
        const itemRef = doc(db, 'menuItems', selectedItemId);
        await updateDoc(itemRef, {
          stockQuantity: increment(qtyNum),
          stockTracked: true,
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(`Purchase logged and +${qtyNum} added to stock!`);
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to log purchase: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/n/admin/inventory" className="text-xs text-gray-500 hover:text-gray-900 flex items-center">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Inventory
              </Link>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Inventory Purchases ({purchases.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Log supply replenishments. Purchases automatically update item stock quantities.
            </p>
          </div>

          <Button onClick={handleOpenModal}>
            <Plus className="w-4 h-4 mr-2" />
            Log Purchase
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No Purchases Recorded"
            description="Log incoming ingredients or packaged menu items to track expenses and increment stock."
            actionLabel="Log First Purchase"
            onAction={handleOpenModal}
          />
        ) : (
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Item Name</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Unit Cost</th>
                    <th className="pb-3 text-right">Total Cost</th>
                    <th className="pb-3">Vendor</th>
                    <th className="pb-3">Entered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#22222A]/50">
                      <td className="py-3 font-semibold text-gray-900 dark:text-white">
                        {p.itemName}
                      </td>
                      <td className="py-3">
                        {p.quantity} {p.uom}
                      </td>
                      <td className="py-3">₹{p.cost || p.unitCost || 0}</td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600">
                        ₹{p.totalCost || p.quantity * (p.cost || p.unitCost || 0)}
                      </td>
                      <td className="py-3 text-gray-500">{p.vendor || 'Local Market'}</td>
                      <td className="py-3 text-gray-400">{p.enteredBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Modal: Log Purchase */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Log Inventory Stock Purchase"
        >
          <form onSubmit={handleSavePurchase} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Link to Menu Item (Replenishes Stock)
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => handleSelectItem(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
              >
                {menuItems.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Current Stock: {m.stockQuantity ?? 'Untracked'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Quantity
                </label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Unit of Measure
                </label>
                <Input
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                  placeholder="units, kg, ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cost per Unit (₹)
                </label>
                <Input
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Vendor / Supplier Name
              </label>
              <Input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Royal Spice Wholesalers"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Notes / Invoice Ref
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bill #INV-4920"
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
                {saving ? 'Logging...' : 'Save Purchase'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
