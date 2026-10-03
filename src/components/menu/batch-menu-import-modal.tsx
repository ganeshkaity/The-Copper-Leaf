'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Upload,
  Download,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MenuCategory, DietaryTag } from '@/types/menu';

interface ParsedMenuItem {
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  dietary?: string;
  calories?: number;
  prepTime?: number;
}

interface BatchMenuImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  existingCategories?: MenuCategory[];
  categories?: MenuCategory[];
  onImportComplete?: () => Promise<void>;
  onSuccess?: () => Promise<void>;
}

const SAMPLE_MENU_ITEMS: ParsedMenuItem[] = [
  {
    name: 'Dum Handi Murgh Biryani',
    category: 'Main Course',
    price: 460,
    description: 'Slow-cooked saffron-scented basmati rice layered with marinated tender chicken and royal tandoor spices.',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
    dietary: 'non-veg',
    calories: 640,
    prepTime: 25,
  },
  {
    name: 'Paneer Tikka Angara',
    category: 'Starters',
    price: 340,
    description: 'Charcoal-smoked cottage cheese cubes tossed in spicy hung curd marinade with charred peppers.',
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800',
    dietary: 'veg',
    calories: 380,
    prepTime: 15,
  },
  {
    name: 'Dal Makhani Bukhara Style',
    category: 'Main Course',
    price: 320,
    description: 'Black lentils slow simmered overnight over charcoal embers, enriched with fresh dairy cream and cultured butter.',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800',
    dietary: 'veg',
    calories: 450,
    prepTime: 12,
  },
  {
    name: 'Artisanal Garlic Naan',
    category: 'Breads',
    price: 95,
    description: 'Leavened clay-oven flatbread brushed with roasted garlic butter and fresh cilantro.',
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800',
    dietary: 'veg',
    calories: 210,
    prepTime: 8,
  },
  {
    name: 'Gulab Jamun Flambé',
    category: 'Desserts',
    price: 210,
    description: 'Cardamom-infused reduced milk dumplings drenched in saffron syrup, served warm with pistachio slivers.',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800',
    dietary: 'veg',
    calories: 320,
    prepTime: 10,
  },
];

export function BatchMenuImportModal({
  isOpen,
  onClose,
  restaurantId,
  existingCategories = [],
  categories = [],
  onImportComplete,
  onSuccess,
}: BatchMenuImportModalProps) {
  const currentCategories = categories.length > 0 ? categories : existingCategories;
  const finishCallback = onSuccess || onImportComplete;
  const [parsedItems, setParsedItems] = useState<ParsedMenuItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);

  // 1. Download Demo JSON template
  const handleDownloadJsonTemplate = () => {
    const jsonStr = JSON.stringify(SAMPLE_MENU_ITEMS, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu_import_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded sample JSON template');
  };

  // 2. Download Demo Excel template
  const handleDownloadExcelTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_MENU_ITEMS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MenuTemplate');
    XLSX.writeFile(wb, 'menu_import_template.xlsx');
    toast.success('Downloaded sample Excel template (.xlsx)');
  };

  // 3. File upload and parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isJson = file.name.endsWith('.json');
    const isExcel =
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');

    if (!isJson && !isExcel) {
      toast.error('Please upload a valid .json or .xlsx file');
      return;
    }

    const reader = new FileReader();

    if (isJson) {
      reader.onload = (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          if (!Array.isArray(raw)) {
            toast.error('JSON file must contain an array of menu item objects');
            return;
          }
          const valid = processRawItems(raw);
          setParsedItems(valid);
          toast.success(`Parsed ${valid.length} items from JSON`);
        } catch {
          toast.error('Failed to parse JSON file. Check format syntax.');
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const wb = XLSX.read(buffer, { type: 'array' });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json<any>(firstSheet);
          const valid = processRawItems(raw);
          setParsedItems(valid);
          toast.success(`Parsed ${valid.length} items from Excel`);
        } catch {
          toast.error('Failed to parse Excel spreadsheet.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processRawItems = (raw: any[]): ParsedMenuItem[] => {
    return raw
      .map((item) => ({
        name: String(item.name || item.Item || item.Dish || item.itemName || '').trim(),
        category: String(item.category || item.Category || 'Main Course').trim(),
        price: parseFloat(item.price || item.Price || item.basePrice || item.Cost || '0'),
        description: item.description || item.Description || '',
        imageUrl: item.imageUrl || item.ImageUrl || item.image || '',
        dietary: String(item.dietary || item.Dietary || 'veg').toLowerCase(),
        calories: parseInt(item.calories || item.Calories) || undefined,
        prepTime: parseInt(item.prepTime || item.prepTimeMinutes || item.PrepTime) || 15,
      }))
      .filter((i) => i.name && i.price > 0);
  };

  // 4. Batch import to Firestore
  const handleExecuteImport = async () => {
    if (parsedItems.length === 0) {
      toast.error('No valid menu items to import');
      return;
    }

    setImporting(true);
    try {
      // Build a map of category names to IDs
      const categoryMap = new Map<string, string>();
      currentCategories.forEach((c) => {
        categoryMap.set(c.name.toLowerCase().trim(), c.id);
      });

      let createdCatCount = 0;

      // Ensure every category exists
      for (const item of parsedItems) {
        const catNameLower = item.category.toLowerCase().trim();
        if (!categoryMap.has(catNameLower)) {
          const newCatRef = await addDoc(collection(db, 'menuCategories'), {
            restaurantId,
            name: item.category,
            sortOrder: currentCategories.length + createdCatCount + 1,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          categoryMap.set(catNameLower, newCatRef.id);
          createdCatCount++;
        }
      }

      // Add each dish into Firestore menuItems
      let addedDishesCount = 0;
      for (const item of parsedItems) {
        const catId = categoryMap.get(item.category.toLowerCase().trim()) || '';
        const dietaryTag = item.dietary?.includes('non')
          ? ('non-veg' as DietaryTag)
          : item.dietary?.includes('egg')
          ? ('egg' as DietaryTag)
          : item.dietary?.includes('vegan')
          ? ('vegan' as DietaryTag)
          : item.dietary?.includes('jain')
          ? ('jain' as DietaryTag)
          : ('veg' as DietaryTag);

        await addDoc(collection(db, 'menuItems'), {
          restaurantId,
          categoryId: catId,
          name: item.name,
          normalizedName: item.name.toLowerCase(),
          basePrice: item.price,
          description: item.description || '',
          imageUrl: item.imageUrl || '',
          dietaryTags: [dietaryTag],
          calories: item.calories || null,
          prepTimeMinutes: item.prepTime || 15,
          active: true,
          stockTracked: false,
          stockQuantity: 50,
          lowStockThreshold: 10,
          bestseller: false,
          featured: false,
          variants: [],
          addOns: [],
          modifierIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addedDishesCount++;
      }

      toast.success(
        `Imported ${addedDishesCount} dishes across ${createdCatCount > 0 ? createdCatCount + ' new & ' : ''}categories!`
      );
      setParsedItems([]);
      setFileName('');
      if (finishCallback) await finishCallback();
      onClose();
    } catch (err: any) {
      console.error('Batch import error:', err);
      toast.error('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Batch Menu Import (JSON / Excel)">
      <div className="space-y-5">
        {/* Template Download Guidance */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#22222A] border border-[#E8E0D5] dark:border-[#2A2A33] space-y-2.5">
          <div className="flex items-start gap-2">
            <Download className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">
                Download Sample Data Templates
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Use our pre-formatted templates to prepare your bulk dish catalogue with categories, prices, and dietary tags.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadJsonTemplate}
              className="text-xs h-8 gap-1.5"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-600" />
              Download Sample JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadExcelTemplate}
              className="text-xs h-8 gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Download Sample Excel (.xlsx)
            </Button>
          </div>
        </div>

        {/* Upload Zone */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Select JSON or Excel Spreadsheet File
          </label>
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center bg-gray-50/50 dark:bg-[#22222A]/40 hover:bg-gray-50 transition-colors">
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Drag & drop or click to browse
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Supports .json, .xlsx, .xls, .csv</p>
            <input
              type="file"
              accept=".json,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="mt-3 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
            />
          </div>
        </div>

        {/* Parsed Preview Table */}
        {parsedItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Ready to Import: {parsedItems.length} dishes
              </span>
              <button
                type="button"
                onClick={() => setParsedItems([])}
                className="text-rose-500 hover:text-rose-600 flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-[#22222A] sticky top-0 border-b border-gray-200 dark:border-gray-800">
                  <tr className="text-gray-500 font-semibold text-[11px]">
                    <th className="p-2.5">Dish</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5">Dietary</th>
                    <th className="p-2.5 text-right">Calories</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {parsedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#22222A]/50">
                      <td className="p-2.5 font-medium text-gray-900 dark:text-white max-w-[140px] truncate">
                        {item.name}
                      </td>
                      <td className="p-2.5 text-gray-500">{item.category}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                        ₹{item.price}
                      </td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {item.dietary || 'veg'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right text-gray-400">
                        {item.calories ? `${item.calories} kcal` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedItems.length === 0 || importing}
            className="gap-2"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            {importing ? 'Importing Dishes...' : `Import ${parsedItems.length} Dishes`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
