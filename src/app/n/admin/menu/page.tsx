'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MenuItem, MenuCategory, DietaryTag } from '@/types/menu';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Filter,
  Edit2,
  FolderTree,
  Sparkles,
  Tag,
  Upload,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMenuPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Item Modal state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  // Item form fields
  const [itemName, setItemName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('15');
  const [calories, setCalories] = useState('');
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>(['VEG']);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [stockTracked, setStockTracked] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('50');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Modal state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  const loadMenuData = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Categories
      const catsRef = collection(db, 'menuCategories');
      const catsQ = query(
        catsRef,
        where('restaurantId', '==', activeRestaurantId),
        orderBy('sortOrder', 'asc')
      );
      const catsSnap = await getDocs(catsQ);
      const catsList: MenuCategory[] = [];
      catsSnap.forEach((d) => {
        catsList.push({ id: d.id, ...d.data() } as MenuCategory);
      });
      setCategories(catsList);

      // 2. Items
      const itemsRef = collection(db, 'menuItems');
      const itemsQ = query(
        itemsRef,
        where('restaurantId', '==', activeRestaurantId)
      );
      const itemsSnap = await getDocs(itemsQ);
      const itemsList: MenuItem[] = [];
      itemsSnap.forEach((d) => {
        itemsList.push({ id: d.id, ...d.data() } as MenuItem);
      });
      setItems(itemsList);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuData();
  }, [activeRestaurantId]);

  const handleOpenItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setCategoryId(item.categoryId);
      setBasePrice(item.basePrice.toString());
      setDescription(item.description || '');
      setImageUrl(item.imageUrl || '');
      setPrepTimeMinutes(item.prepTimeMinutes?.toString() || '15');
      setCalories(item.calories?.toString() || '');
      setDietaryTags(item.dietaryTags || ['VEG']);
      setIsFeatured(item.featured || false);
      setIsBestseller(item.bestseller || false);
      setStockTracked(item.stockTracked || false);
      setStockQuantity(item.stockQuantity?.toString() || '50');
      setLowStockThreshold(item.lowStockThreshold?.toString() || '10');
    } else {
      setEditingItem(null);
      setItemName('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setBasePrice('');
      setDescription('');
      setImageUrl('');
      setPrepTimeMinutes('15');
      setCalories('');
      setDietaryTags(['VEG']);
      setIsFeatured(false);
      setIsBestseller(false);
      setStockTracked(false);
      setStockQuantity('50');
      setLowStockThreshold('10');
    }
    setIsItemModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Image upload failed');
      }
      setImageUrl(data.url);
      toast.success('Food photo uploaded successfully');
    } catch (err: any) {
      toast.error('Upload error: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !itemName.trim() || !basePrice) {
      toast.error('Name, price and category are required');
      return;
    }

    setSavingItem(true);
    try {
      const priceNum = parseFloat(basePrice);
      const payload: Partial<MenuItem> = {
        restaurantId: activeRestaurantId,
        name: itemName.trim(),
        normalizedName: itemName.trim().toLowerCase(),
        categoryId,
        basePrice: priceNum,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        prepTimeMinutes: parseInt(prepTimeMinutes) || 15,
        calories: parseInt(calories) || undefined,
        dietaryTags,
        featured: isFeatured,
        bestseller: isBestseller,
        stockTracked,
        stockQuantity: stockTracked ? parseInt(stockQuantity) || 0 : undefined,
        lowStockThreshold: stockTracked ? parseInt(lowStockThreshold) || 10 : undefined,
        updatedAt: serverTimestamp() as any,
      };

      if (editingItem) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), payload);
        toast.success(`Dish "${payload.name}" updated`);
      } else {
        payload.active = true;
        payload.variants = [];
        payload.modifierIds = [];
        payload.createdAt = serverTimestamp() as any;
        await addDoc(collection(db, 'menuItems'), payload);
        toast.success(`Dish "${payload.name}" added to menu`);
      }

      setIsItemModalOpen(false);
      await loadMenuData();
    } catch (err: any) {
      toast.error('Failed to save dish: ' + err.message);
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleItemActive = async (item: MenuItem) => {
    try {
      const newActive = !item.active;
      await updateDoc(doc(db, 'menuItems', item.id), {
        active: newActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`"${item.name}" marked as ${newActive ? 'Available' : 'Unavailable'}`);
      await loadMenuData();
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !newCatName.trim()) return;

    setSavingCat(true);
    try {
      await addDoc(collection(db, 'menuCategories'), {
        restaurantId: activeRestaurantId,
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        sortOrder: categories.length + 1,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success(`Category "${newCatName}" created`);
      setNewCatName('');
      setNewCatDesc('');
      setIsCatModalOpen(false);
      await loadMenuData();
    } catch (err: any) {
      toast.error('Failed to create category: ' + err.message);
    } finally {
      setSavingCat(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Menu & Recipe Catalog
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage categories, culinary dishes, variants, dietary flags, and stock limits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCatModalOpen(true)}>
              <FolderTree className="w-4 h-4 mr-1.5" />
              Add Category
            </Button>
            <Button size="sm" onClick={() => handleOpenItemModal()}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Dish
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white dark:bg-[#18181D] text-gray-600 dark:text-gray-400 border border-[#E8E0D5] dark:border-[#2A2A33]'
              }`}
            >
              All Dishes ({items.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  selectedCategory === c.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white dark:bg-[#18181D] text-gray-600 dark:text-gray-400 border border-[#E8E0D5] dark:border-[#2A2A33]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No Menu Items Found"
            description="Add your first culinary creation or select a different category filter."
            actionLabel="Add Dish Now"
            onAction={() => handleOpenItemModal()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const catName = categories.find((c) => c.id === item.categoryId)?.name || 'Category';

              return (
                <Card
                  key={item.id}
                  className="p-4 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UtensilsCrossed className="w-6 h-6" />
                        </div>
                      )}
                      {!item.active && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          Sold Out
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-primary uppercase">
                          {catName}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.bestseller && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              Bestseller
                            </span>
                          )}
                          {item.featured && (
                            <span className="text-[9px] font-bold bg-orange-100 text-primary px-1.5 py-0.5 rounded">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-serif text-base font-bold text-gray-900 dark:text-white truncate mt-0.5">
                        {item.name}
                      </h3>

                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {item.description || 'Artisanal culinary preparation'}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          ₹{item.basePrice}
                        </span>
                        {item.stockTracked && (
                          <span className="text-[10px] text-gray-400">
                            Stock: {item.stockQuantity ?? 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleItemActive(item)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${
                        item.active
                          ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'text-gray-500 bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      {item.active ? 'Available' : 'Unavailable'}
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenItemModal(item)}
                      className="text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Add or Edit Menu Item */}
        <Modal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          title={editingItem ? `Edit ${editingItem.name}` : 'Add New Culinary Dish'}
        >
          <form onSubmit={handleSaveItem} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Dish Name *
                </label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Copper Smoked Butter Chicken"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Base Price (₹) *
                </label>
                <Input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="420"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Prep Time (Mins)
                </label>
                <Input
                  type="number"
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Calories (kcal)
                </label>
                <Input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g. 520"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Description / Ingredients
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Succulent slow-cooked poultry in rich heirloom tomato and white butter gravy..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white resize-none"
              />
            </div>

            {/* Food Image upload via ImgBB */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Dish Photography (ImgBB Storage)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="text-xs"
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-16 w-16 object-cover rounded-xl mt-2 border border-gray-200"
                />
              )}
            </div>

            {/* Flags */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="rounded text-primary"
                />
                <span>Bestseller Dish</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-primary"
                />
                <span>Featured on Home</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={stockTracked}
                  onChange={(e) => setStockTracked(e.target.checked)}
                  className="rounded text-primary"
                />
                <span>Track Stock Quantity</span>
              </label>
            </div>

            {stockTracked && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#22222A]">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Current Stock
                  </label>
                  <Input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Low Stock Alert At
                  </label>
                  <Input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsItemModalOpen(false)}
                disabled={savingItem}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingItem || uploadingImage}>
                {savingItem ? 'Saving Dish...' : editingItem ? 'Save Changes' : 'Add Dish'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Category */}
        <Modal
          isOpen={isCatModalOpen}
          onClose={() => setIsCatModalOpen(false)}
          title="Add Menu Category"
        >
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Category Name *
              </label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Clay Oven Tandoor, Mocktails, Desserts"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Description / Subtitle
              </label>
              <Input
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="e.g. Smoky delicacies roasted in our traditional clay tandoor"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCatModalOpen(false)}
                disabled={savingCat}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingCat}>
                {savingCat ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
