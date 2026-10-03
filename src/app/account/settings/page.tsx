'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { CustomerShell } from '@/components/customer/customer-shell';
import { AccountNav } from '@/components/customer/account-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { User, Camera, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [dietaryType, setDietaryType] = useState('ALL');
  const [spicePreference, setSpicePreference] = useState('MEDIUM');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [photoURL, setPhotoURL] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhone(profile.phone || '');
      setPhotoURL(profile.photoURL || '');
      if (profile.preferences) {
        setDietaryType(profile.preferences.dietaryType || 'ALL');
        setSpicePreference(profile.preferences.spiceLevel || 'MEDIUM');
        setAllergens(profile.preferences.allergens || []);
      }
    } else if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
    }
  }, [profile, user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
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

      setPhotoURL(data.url);
      toast.success('Profile photo uploaded. Click Save to apply.');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleAllergen = (item: string) => {
    setAllergens((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        phone: phone.trim(),
        photoURL: photoURL.trim(),
        preferences: {
          dietaryType,
          spiceLevel: spicePreference,
          allergens,
        },
        updatedAt: serverTimestamp(),
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      toast.success('Profile settings updated successfully!');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to save settings: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const ALLERGEN_OPTIONS = ['Dairy', 'Gluten', 'Peanuts', 'Tree Nuts', 'Soy', 'Shellfish', 'Mustard', 'Sesame'];

  return (
    <CustomerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Account & Taste Preferences
          </h1>
          <p className="text-gray-600 mt-2">
            Personalize your dining profile, culinary preferences, and security details.
          </p>
        </div>

        <AccountNav />

        <form onSubmit={handleSave} className="max-w-3xl space-y-8">
          {/* Avatar and Basic Details */}
          <Card className="p-8 rounded-2xl border border-gray-200 bg-white">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Personal Profile
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-gray-100">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-md hover:bg-primary-hover transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="text-center sm:text-left">
                <p className="font-medium text-gray-900 text-sm">Profile Picture</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {uploadingPhoto ? 'Uploading to secure storage...' : 'JPG, PNG or WEBP up to 5MB'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Managed via authentication provider</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Dining Preferences */}
          <Card className="p-8 rounded-2xl border border-gray-200 bg-white">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Dietary & Kitchen Instructions
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Our chefs and waiters will automatically reference these preferences during your table orders.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dietary Lifestyle
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'ALL', label: 'All Dishes' },
                    { id: 'VEG', label: 'Vegetarian Only' },
                    { id: 'NON_VEG', label: 'Non-Vegetarian' },
                    { id: 'JAIN', label: 'Strict Jain' },
                  ].map((diet) => (
                    <button
                      key={diet.id}
                      type="button"
                      onClick={() => setDietaryType(diet.id)}
                      className={`py-2.5 px-4 rounded-xl text-sm font-medium border text-center transition-all ${
                        dietaryType === diet.id
                          ? 'border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {diet.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Default Spice Tolerance
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['MILD', 'MEDIUM', 'SPICY'].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpicePreference(sp)}
                      className={`py-2.5 px-4 rounded-xl text-sm font-medium border text-center transition-all capitalize ${
                        spicePreference === sp
                          ? 'border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {sp.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Known Allergies
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGEN_OPTIONS.map((item) => {
                    const isSelected = allergens.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleAllergen(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? '✕ ' : '+ '}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Button
              type="submit"
              disabled={saving || uploadingPhoto}
              className="px-8 py-3 text-base rounded-xl font-medium"
            >
              {saving ? 'Saving Preferences...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </CustomerShell>
  );
}
