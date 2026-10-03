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
import { Offer } from '@/types/offer';
import {
  Sparkles,
  Plus,
  Tag,
  Edit2,
  Trash2,
  Upload,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploadOrLink } from '@/components/ui/image-upload-or-link';
import { AiGenerateButton } from '@/components/ui/ai-generate-button';

export default function AdminOffersPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badgeText, setBadgeText] = useState('Limited Time');
  const [featured, setFeatured] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchOffers = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'offers');
      const q = query(ref, where('restaurantId', '==', activeRestaurantId));
      const snap = await getDocs(q);
      const list: Offer[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Offer);
      });
      setOffers(list);
    } catch (err) {
      console.error('Failed to load offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [activeRestaurantId]);

  const handleOpenModal = (o?: Offer) => {
    if (o) {
      setEditingOffer(o);
      setTitle(o.title);
      setDescription(o.description || '');
      setImageUrl(o.imageUrl || '');
      setBadgeText(o.badgeText || 'Special Offer');
      setFeatured(o.featured || false);
    } else {
      setEditingOffer(null);
      setTitle('');
      setDescription('');
      setImageUrl('');
      setBadgeText('Weekend Special');
      setFeatured(true);
    }
    setIsModalOpen(true);
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
      toast.success('Offer banner image uploaded');
    } catch (err: any) {
      toast.error('Image upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Offer> = {
        restaurantId: activeRestaurantId,
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        badgeText: badgeText.trim(),
        featured,
        updatedAt: serverTimestamp() as any,
      };

      if (editingOffer) {
        await updateDoc(doc(db, 'offers', editingOffer.id), payload);
        toast.success('Offer banner updated');
      } else {
        payload.active = true;
        payload.createdAt = serverTimestamp() as any;
        await addDoc(collection(db, 'offers'), payload);
        toast.success('Offer banner published');
      }

      setIsModalOpen(false);
      await fetchOffers();
    } catch (err: any) {
      toast.error('Failed to save offer: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (o: Offer) => {
    try {
      const newActive = !o.active;
      await updateDoc(doc(db, 'offers', o.id), {
        active: newActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Offer marked as ${newActive ? 'Active' : 'Hidden'}`);
      await fetchOffers();
    } catch (err: any) {
      toast.error('Failed to update offer');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Promotional Offers & Highlights ({offers.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Publish marketing banners and featured culinary announcements on the public restaurant pages.
            </p>
          </div>

          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Offer
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : offers.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No Active Offers"
            description="Publish banner offers (e.g. Weekend Degustation Menus, Happy Hours) to attract diner bookings."
            actionLabel="Create Offer Now"
            onAction={() => handleOpenModal()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <Card
                key={offer.id}
                className="overflow-hidden rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="h-36 bg-gray-100 dark:bg-gray-800 relative">
                    {offer.imageUrl ? (
                      <img
                        src={offer.imageUrl}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                        <Sparkles className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold tracking-wider uppercase shadow">
                      {offer.badgeText || 'Special'}
                    </div>
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={offer.active ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                      {offer.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {offer.description || 'Exclusive culinary experience'}
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(offer)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    {offer.active ? 'Hide from Public' : 'Publish'}
                  </button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenModal(offer)}
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

        {/* Modal: Create or Edit Offer */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingOffer ? 'Edit Offer Banner' : 'Create Promotional Offer'}
        >
          <form onSubmit={handleSaveOffer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Offer Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Royal Degustation Menu 4-Course Pairing"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Badge Label
              </label>
              <Input
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. Weekend Special, Chef Tasting"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Description / Highlights
                </label>
                <AiGenerateButton
                  type="offer"
                  itemName={title}
                  currentText={description}
                  onGenerated={(generated) => setDescription(generated)}
                />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Experience hand-curated multi-course artisanal courses paired with sommelier selections..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white resize-none"
              />
            </div>

            <div>
              <ImageUploadOrLink
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
                searchQuery={title}
                label="Banner Image (Upload, Link or Fetch Online)"
                placeholder="https://images.unsplash.com/... or paste image URL"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded text-primary"
              />
              <span className="text-red-500 dark:text-red-400">Feature prominently on restaurant landing hero</span>
            </label>

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
                {saving ? 'Publishing...' : editingOffer ? 'Save Changes' : 'Create Offer'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
