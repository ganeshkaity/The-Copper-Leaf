'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MenuItem, MenuItemVariant, MenuItemAddon } from '@/types';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Plus, Minus, UtensilsCrossed } from 'lucide-react';
import { useCartStore } from '@/lib/stores/cart-store';
import { toast } from 'sonner';

interface ItemCustomizationModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (customized: {
    menuItemId: string;
    nameSnapshot: string;
    variantSnapshot?: any;
    modifierSnapshot?: any[];
    removedIngredients?: string[];
    specialInstructions?: string;
    unitPriceSnapshot: number;
    quantity: number;
  }) => void;
}

export function ItemCustomizationModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
}: ItemCustomizationModalProps) {
  const addItem = useCartStore((s) => s.addItem);

  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(
    item?.variants && item.variants.length > 0 ? item.variants[0] : undefined
  );
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);

  if (!item) return null;

  // Calculate current unit price with selected options
  const variantDelta = selectedVariant?.priceDelta || 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = Math.max(0, item.basePrice + variantDelta + addonsTotal);
  const lineTotal = unitPrice * quantity;

  const toggleAddon = (addon: MenuItemAddon) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const toggleRemoved = (ing: string) => {
    if (removedIngredients.includes(ing)) {
      setRemovedIngredients(removedIngredients.filter((i) => i !== ing));
    } else {
      setRemovedIngredients([...removedIngredients, ing]);
    }
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart({
        menuItemId: item.id,
        nameSnapshot: item.name,
        variantSnapshot: selectedVariant,
        modifierSnapshot: selectedAddons,
        removedIngredients,
        specialInstructions: specialInstructions.trim() || undefined,
        unitPriceSnapshot: unitPrice,
        quantity,
      });
    } else {
      addItem({
        menuItemId: item.id,
        name: item.name,
        basePrice: item.basePrice,
        imageUrl: item.imageUrl,
        quantity,
        variant: selectedVariant,
        addOns: selectedAddons,
        removedIngredients,
        specialInstructions: specialInstructions.trim() || undefined,
      });
      toast.success(`Added ${quantity}x ${item.name} to cart`);
    }
    onClose();
    // Reset state
    setQuantity(1);
    setSelectedAddons([]);
    setRemovedIngredients([]);
    setSpecialInstructions('');
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 rounded-3xl">
        {/* Item Image Header */}
        <div className="relative h-52 w-full bg-[#F3ECE2]">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed className="w-12 h-12 text-[#C8622A] opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <h2 className="font-serif text-2xl font-bold">{item.name}</h2>
            <div className="text-sm font-semibold text-[#FDF4ED] mt-0.5">
              Base: {formatCurrency(item.basePrice)}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-[#78716C] leading-relaxed">{item.description}</p>

          {/* Variants */}
          {item.variants && item.variants.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                Choose Size / Portion
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {item.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-sm font-medium transition-colors ${
                      selectedVariant?.id === v.id
                        ? 'border-[#C8622A] bg-[#FDF4ED] text-[#C8622A]'
                        : 'border-[#E8E0D5] hover:bg-[#FAF6F0] text-[#1C1917]'
                    }`}
                  >
                    <span>{v.name}</span>
                    <span className="text-xs font-semibold">
                      {v.priceDelta > 0 ? `+${formatCurrency(v.priceDelta)}` : 'Standard'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {item.addOns && item.addOns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                Extra Add-ons
              </h3>
              <div className="space-y-2">
                {item.addOns.map((addon) => {
                  const isChecked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-sm cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[#C8622A] bg-[#FDF4ED]'
                          : 'border-[#E8E0D5] hover:bg-[#FAF6F0]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAddon(addon)}
                          className="w-4 h-4 rounded text-[#C8622A] focus:ring-[#C8622A]"
                        />
                        <span className="font-medium text-[#1C1917]">{addon.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#C8622A]">
                        +{formatCurrency(addon.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Removable Ingredients */}
          {item.removableIngredients && item.removableIngredients.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                Custom Preparation
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.removableIngredients.map((ing) => {
                  const isRemoved = removedIngredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      type="button"
                      onClick={() => toggleRemoved(ing)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        isRemoved
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-[#E8E0D5] bg-white text-[#78716C] hover:bg-[#FAF6F0]'
                      }`}
                    >
                      {isRemoved ? `✕ ${ing}` : ing}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {item.supportsSpecialInstructions !== false && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1C1917] block">
                Special Kitchen Note
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Extra crispy, less salt, sauce on the side..."
                rows={2}
                className="w-full rounded-2xl border border-[#E8E0D5] p-3 text-sm focus:border-[#C8622A] focus:outline-none"
              />
            </div>
          )}

          {/* Footer Quantity & Add CTA */}
          <div className="pt-4 border-t border-[#E8E0D5] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 border border-[#E8E0D5] rounded-xl p-1 bg-white">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#78716C] hover:bg-[#FAF6F0] active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-bold text-[#1C1917]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#78716C] hover:bg-[#FAF6F0] active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button onClick={handleAddToCart} size="lg" className="flex-1 font-semibold">
              Add to Order • {formatCurrency(lineTotal)}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
