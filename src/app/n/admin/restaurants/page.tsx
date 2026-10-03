'use client';

import React, { useState, useEffect } from 'react';
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
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant } from '@/types/restaurant';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Clock,
  Edit2,
  ExternalLink,
  Archive,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploadOrLink } from '@/components/ui/image-upload-or-link';
import { AiGenerateButton } from '@/components/ui/ai-generate-button';

export default function AdminRestaurantsPage() {
  const { refreshRestaurants } = useRestaurant();
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const ref = collection(db, 'restaurants');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: Restaurant[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Restaurant);
      });
      setRestaurantsList(list);
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingRestaurant(null);
    setName('');
    setSlug('');
    setTagline('');
    setDescription('');
    setAddress('');
    setPhone('');
    setEmail('');
    setCuisine('');
    setTimezone('Asia/Kolkata');
    setLogoUrl('');
    setHeroImageUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (r: Restaurant) => {
    setEditingRestaurant(r);
    setName(r.name || '');
    setSlug(r.slug || '');
    setTagline(r.tagline || '');
    setDescription(r.description || r.about || '');
    const addrStr = typeof r.address === 'object' && r.address !== null
      ? `${r.address.street || ''}${r.address.city ? ', ' + r.address.city : ''}`
      : ((r.address as unknown as string) || '');
    setAddress(addrStr);
    setPhone(r.phone || '');
    setEmail(r.email || '');
    setCuisine(r.cuisine || '');
    setTimezone(r.timezone || 'Asia/Kolkata');
    setLogoUrl(r.logoUrl || '');
    setHeroImageUrl(r.heroImageUrl || '');
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'hero') => {
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
        throw new Error(data.message || 'Upload failed');
      }

      if (target === 'logo') setLogoUrl(data.url);
      else setHeroImageUrl(data.url);

      toast.success('Image uploaded successfully');
    } catch (err: any) {
      toast.error('Image upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      toast.error('Name and URL slug are required');
      return;
    }

    setSaving(true);
    try {
      const existingAddressObj = editingRestaurant && typeof editingRestaurant.address === 'object' && editingRestaurant.address !== null
        ? editingRestaurant.address
        : { street: '', city: 'City', country: 'India' };

      const payload: Partial<Restaurant> = {
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        tagline: tagline.trim(),
        description: description.trim(),
        about: description.trim(),
        address: {
          ...existingAddressObj,
          street: address.trim(),
        },
        phone: phone.trim(),
        email: email.trim(),
        cuisine: cuisine.trim(),
        timezone: timezone.trim(),
        logoUrl: logoUrl.trim(),
        heroImageUrl: heroImageUrl.trim(),
        updatedAt: serverTimestamp() as any,
      };

      if (editingRestaurant) {
        await updateDoc(doc(db, 'restaurants', editingRestaurant.id), payload);
        toast.success('Restaurant branch updated');
      } else {
        payload.active = true;
        payload.createdAt = serverTimestamp() as any;
        await addDoc(collection(db, 'restaurants'), payload);
        toast.success('New restaurant branch added');
      }

      setIsModalOpen(false);
      await fetchRestaurants();
      await refreshRestaurants();
    } catch (err: any) {
      console.error('Failed to save restaurant:', err);
      toast.error(err.message || 'Error saving restaurant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (r: Restaurant) => {
    try {
      const newStatus = !r.active;
      await updateDoc(doc(db, 'restaurants', r.id), {
        active: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`${r.name} marked as ${newStatus ? 'Active' : 'Inactive'}`);
      await fetchRestaurants();
      await refreshRestaurants();
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
              Restaurant Locations ({restaurantsList.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure multi-location branches, operating parameters, and public profiles.
            </p>
          </div>

          <Button onClick={handleOpenCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Restaurant Branch
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : restaurantsList.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Restaurant Branches Configured"
            description="Add your first restaurant location or run the setup wizard to start accepting table bookings and orders."
            actionLabel="Add Branch Now"
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurantsList.map((r) => (
              <Card
                key={r.id}
                className="overflow-hidden rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 bg-gray-100 dark:bg-gray-800 relative">
                    {r.heroImageUrl ? (
                      <img
                        src={r.heroImageUrl}
                        alt={r.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                        <Building2 className="w-10 h-10" />
                      </div>
                    )}

                    <div className="absolute top-3 right-3">
                      <StatusBadge status={r.active ? 'ACTIVE' : 'INACTIVE'} />
                    </div>

                    {r.logoUrl && (
                      <div className="absolute -bottom-5 left-4 w-12 h-12 rounded-xl bg-white dark:bg-[#18181D] shadow-md border border-[#E8E0D5] dark:border-[#2A2A33] p-1">
                        <img src={r.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                      </div>
                    )}
                  </div>

                  <div className="p-6 pt-8 space-y-3">
                    <div>
                      <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                        {r.name}
                      </h2>
                      <p className="text-xs text-primary font-mono mt-0.5">/r/{r.slug}</p>
                    </div>

                    {r.tagline && (
                      <p className="text-xs text-gray-500 italic">"{r.tagline}"</p>
                    )}

                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {typeof r.address === 'object' && r.address !== null
                            ? `${r.address.street}, ${r.address.city}`
                            : (r.address as string) || 'Address not specified'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{r.phone || 'Phone not set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{r.timezone || 'Asia/Kolkata'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-[#E8E0D5] dark:border-[#2A2A33] bg-gray-50/50 dark:bg-[#22222A]/50 flex items-center justify-between gap-2">
                  <a
                    href={`/r/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    title="View Public Page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(r)}
                      className="text-xs"
                    >
                      {r.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEditModal(r)}
                      className="text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRestaurant ? 'Edit Restaurant Branch' : 'Add New Branch'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Branch Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingRestaurant) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)+/g, '')
                      );
                    }
                  }}
                  placeholder="e.g. Cyber Hub"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug *
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="cyber-hub"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tagline
              </label>
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Artisanal Fine Dining & Mixology"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Physical Address
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Unit 12, Cyber Hub, Gurugram"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Contact Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Contact Email
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cyberhub@thecopperleaf.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cuisine
                </label>
                <Input
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="Modern Indian"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Timezone
                </label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Kolkata"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Restaurant Story & Concept
                </label>
                <AiGenerateButton
                  type="restaurant-about"
                  itemName={name}
                  currentText={description}
                  onGenerated={(generated) => setDescription(generated)}
                />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="A prestigious fine-dining establishment blending authentic culinary crafts with luxury ambiance..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white resize-none"
              />
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <ImageUploadOrLink
                  value={logoUrl}
                  onChange={(url) => setLogoUrl(url)}
                  label="Logo Image (Upload or Link)"
                  placeholder="https://... logo URL"
                />
              </div>

              <div>
                <ImageUploadOrLink
                  value={heroImageUrl}
                  onChange={(url) => setHeroImageUrl(url)}
                  label="Hero Cover Image (Upload or Link)"
                  placeholder="https://... cover URL"
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
                {saving ? 'Saving...' : editingRestaurant ? 'Save Changes' : 'Create Branch'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
