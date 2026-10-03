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
import { Recipe, RecipeIngredient } from '@/types/recipe';
import {
  BookOpen,
  Plus,
  Trash2,
  Upload,
  ArrowLeft,
  Edit2,
  DollarSign,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminRecipesPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Creator State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields matching `create_new_food_admin panel.png`
  const [recipeName, setRecipeName] = useState('');
  const [alternateName, setAlternateName] = useState('');
  const [recipeType, setRecipeType] = useState('Food');
  const [code, setCode] = useState('');
  const [menuCategory, setMenuCategory] = useState('Main Course');
  const [salesType, setSalesType] = useState('Direct');
  const [imageUrl, setImageUrl] = useState('');
  const [portion, setPortion] = useState('1');
  const [recipeYield, setRecipeYield] = useState('1');
  const [isStockable, setIsStockable] = useState(false);

  // Ingredients rows
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { name: '', quantity: 1, uom: 'grams', cost: 0 },
  ]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchRecipes = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'recipes');
      const q = query(ref, where('restaurantId', '==', activeRestaurantId));
      const snap = await getDocs(q);
      const list: Recipe[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Recipe);
      });
      setRecipes(list);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [activeRestaurantId]);

  const handleOpenModal = (r?: Recipe) => {
    if (r) {
      setEditingRecipe(r);
      setRecipeName(r.name || r.recipeName || '');
      setAlternateName(r.alternateName || '');
      setRecipeType(r.recipeType || 'Food');
      setCode(r.code || '');
      setMenuCategory(r.menuCategory || 'Main Course');
      setSalesType(r.salesType || 'Direct');
      setImageUrl(r.imageUrl || '');
      setPortion(r.portion?.toString() || '1');
      setRecipeYield(r.yield?.toString() || '1');
      setIsStockable(r.stockable || false);
      setIngredients(r.ingredients || [{ name: '', quantity: 1, uom: 'grams', cost: 0 }]);
    } else {
      setEditingRecipe(null);
      setRecipeName('');
      setAlternateName('');
      setRecipeType('Food');
      setCode(`REC-${Math.floor(1000 + Math.random() * 9000)}`);
      setMenuCategory('Main Course');
      setSalesType('Direct');
      setImageUrl('');
      setPortion('1');
      setRecipeYield('1');
      setIsStockable(false);
      setIngredients([{ name: '', quantity: 100, uom: 'grams', cost: 50 }]);
    }
    setIsModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    setIngredients((prev) => [...prev, { name: '', quantity: 1, uom: 'grams', cost: 0 }]);
  };

  const handleRemoveIngredientRow = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateIngredient = (idx: number, field: keyof RecipeIngredient, value: any) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
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
      if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');
      setImageUrl(data.url);
      toast.success('Recipe photo uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const totalCalculatedCost = ingredients.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !recipeName.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    setSaving(true);
    try {
      const validIngredients = ingredients.filter((i) => i.name.trim());

      const payload: Partial<Recipe> = {
        restaurantId: activeRestaurantId,
        name: recipeName.trim(),
        alternateName: alternateName.trim(),
        recipeType,
        code: code.trim(),
        menuCategory,
        salesType,
        imageUrl,
        ingredients: validIngredients,
        totalCost: totalCalculatedCost,
        portion: parseInt(portion) || 1,
        yield: parseInt(recipeYield) || 1,
        stockable: isStockable,
        updatedAt: serverTimestamp() as any,
      };

      if (editingRecipe) {
        await updateDoc(doc(db, 'recipes', editingRecipe.id), payload);
        toast.success(`Recipe "${payload.name}" updated`);
      } else {
        payload.createdAt = serverTimestamp() as any;
        await addDoc(collection(db, 'recipes'), payload);
        toast.success(`Recipe "${payload.name}" created`);
      }

      setIsModalOpen(false);
      await fetchRecipes();
    } catch (err: any) {
      toast.error('Failed to save recipe: ' + err.message);
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
              Chef Recipe Management ({recipes.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Document preparation specifications, ingredient cost sheets, and kitchen yields.
            </p>
          </div>

          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Recipe
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : recipes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Culinary Recipes Documented"
            description="Create recipes with ingredient breakdowns, cost per portion, and preparation guidelines."
            actionLabel="Create Recipe Now"
            onAction={() => handleOpenModal()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((r) => (
              <Card
                key={r.id}
                className="overflow-hidden rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 bg-gray-100 dark:bg-gray-800 relative">
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[10px]">
                      {r.code}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                      {r.name}
                    </h3>
                    {r.alternateName && (
                      <p className="text-xs text-gray-400 italic">{r.alternateName}</p>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Category: {r.menuCategory}</span>
                      <span className="font-bold text-emerald-600">
                        Cost: ₹{r.totalCost || 0}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 mt-1">
                      {r.ingredients?.length || 0} Ingredients • {r.portion} Portion
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenModal(r)}
                    className="text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit Recipe
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Recipe Modal matching `create_new_food_admin panel.png` */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRecipe ? `Edit Recipe: ${editingRecipe.name}` : 'Create New Food Recipe'}
        >
          <form onSubmit={handleSaveRecipe} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Recipe Name *
                </label>
                <Input
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g. Copper Smoked Butter Chicken"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Alternate Name
                </label>
                <Input
                  value={alternateName}
                  onChange={(e) => setAlternateName(e.target.value)}
                  placeholder="e.g. Murgh Makhani Special"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Code
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="REC-001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <Input
                  value={menuCategory}
                  onChange={(e) => setMenuCategory(e.target.value)}
                  placeholder="Main Course"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Sales Type
                </label>
                <Input
                  value={salesType}
                  onChange={(e) => setSalesType(e.target.value)}
                  placeholder="Direct / Buffet"
                />
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Recipe Image (ImgBB Storage)
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
                  className="h-16 w-16 object-cover rounded-xl mt-2 border"
                />
              )}
            </div>

            {/* Ingredients table */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Ingredients List ({ingredients.length})
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddIngredientRow}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Ingredient
                </Button>
              </div>

              <div className="space-y-2">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <Input
                      value={ing.name}
                      onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                      placeholder="Ingredient (e.g. Chicken Breast)"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={ing.quantity}
                      onChange={(e) => handleUpdateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Qty"
                      className="w-16"
                    />
                    <Input
                      value={ing.uom}
                      onChange={(e) => handleUpdateIngredient(idx, 'uom', e.target.value)}
                      placeholder="UOM"
                      className="w-16"
                    />
                    <Input
                      type="number"
                      value={ing.cost}
                      onChange={(e) => handleUpdateIngredient(idx, 'cost', parseFloat(e.target.value) || 0)}
                      placeholder="Cost (₹)"
                      className="w-20 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredientRow(idx)}
                      className="p-1.5 text-gray-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-3 mt-3 rounded-xl bg-gray-50 dark:bg-[#22222A] text-xs font-semibold">
                <span>Calculated Ingredient Cost:</span>
                <span className="font-mono text-base text-primary">₹{totalCalculatedCost}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Portion (Per serving)
                </label>
                <Input
                  type="number"
                  value={portion}
                  onChange={(e) => setPortion(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Yield
                </label>
                <Input
                  type="number"
                  value={recipeYield}
                  onChange={(e) => setRecipeYield(e.target.value)}
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
              <Button type="submit" disabled={saving || uploadingImage}>
                {saving ? 'Saving...' : editingRecipe ? 'Save Changes' : 'Save Recipe'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
