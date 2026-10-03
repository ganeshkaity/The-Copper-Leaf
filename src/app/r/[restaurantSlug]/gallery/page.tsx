'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Restaurant } from '@/types';
import { CustomerShell } from '@/components/customer/customer-shell';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon } from 'lucide-react';

export default function RestaurantGalleryPage() {
  const params = useParams();
  const restaurantSlug = params?.restaurantSlug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGallery() {
      if (!restaurantSlug) return;
      try {
        const restSnap = await getDocs(
          query(collection(db, 'restaurants'), where('slug', '==', restaurantSlug), where('active', '==', true))
        );
        if (restSnap.empty) {
          setLoading(false);
          return;
        }

        const restData = { ...restSnap.docs[0].data(), id: restSnap.docs[0].id } as Restaurant;
        setRestaurant(restData);

        // Fetch images from gallery collection or restaurant document
        const gallSnap = await getDocs(
          query(collection(db, 'gallery'), where('restaurantId', '==', restData.id), where('active', '==', true))
        );
        const list: string[] = [];
        gallSnap.forEach((d) => {
          const url = d.data().imageUrl;
          if (url) list.push(url);
        });

        // Also merge with restaurant galleryImageUrls if defined
        if (restData.galleryImageUrls && restData.galleryImageUrls.length > 0) {
          for (const u of restData.galleryImageUrls) {
            if (!list.includes(u)) list.push(u);
          }
        }

        setImages(list);
      } catch (e) {
        console.error('Error loading gallery:', e);
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, [restaurantSlug]);

  return (
    <CustomerShell currentSlug={restaurantSlug} restaurant={restaurant}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8622A]">
            VISUAL STORYTELLING
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1917] mt-2 mb-3">
            Photo Gallery
          </h1>
          <p className="text-sm text-[#78716C]">
            A glimpse into the dining halls, artisanal plating, and vibrant moments at {restaurant?.name}.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="rounded-3xl border border-[#E8E0D5] bg-white h-56 animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E8E0D5] bg-white p-12 text-center max-w-md mx-auto">
            <Camera className="w-12 h-12 text-[#C8622A] mx-auto mb-3 opacity-40" />
            <h3 className="font-serif text-xl font-bold text-[#1C1917]">No Gallery Photos Yet</h3>
            <p className="text-sm text-[#78716C] mt-2 mb-6">
              Photographs will appear here once uploaded via the restaurant management system.
            </p>
            <Link href={`/r/${restaurantSlug}/menu`}>
              <Button>Explore Menu Instead</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {images.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setActiveImage(url)}
                className="relative h-64 rounded-3xl overflow-hidden border border-[#E8E0D5] bg-[#F3ECE2] cursor-pointer group shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <Image
                  src={url}
                  alt={`The Copper Leaf Gallery ${idx + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="p-3 rounded-full bg-white/90 text-[#1C1917] shadow-lg">
                    <ImageIcon className="w-5 h-5 text-[#C8622A]" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Lightbox */}
        {activeImage && (
          <div
            onClick={() => setActiveImage(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="relative max-w-4xl max-h-[85vh] w-full h-full rounded-2xl overflow-hidden">
              <Image src={activeImage} alt="Preview" fill className="object-contain" unoptimized />
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
