'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Review, ReviewStatus } from '@/types/review';
import {
  Star,
  MessageSquare,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReviewsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = collection(db, 'reviews');
      const q = query(
        ref,
        where('restaurantId', '==', activeRestaurantId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: Review[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Review);
      });
      setReviews(list);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [activeRestaurantId]);

  const handleToggleStatus = async (review: Review) => {
    const nextStatus: ReviewStatus = review.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    try {
      await updateDoc(doc(db, 'reviews', review.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Review is now ${nextStatus === 'PUBLISHED' ? 'Visible to Public' : 'Hidden'}`);
      await fetchReviews();
    } catch (err: any) {
      toast.error('Failed to update review status');
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Customer Reviews & Feedback ({reviews.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Verified dining testimonials from completed orders. Moderate visibility for the public website.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{avgRating}</span>
              <span className="text-xs text-gray-500 ml-1">/ 5.0 Average</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No Reviews Received Yet"
            description="When diners complete meals and leave authentic reviews via their customer account, they will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <Card
                key={rev.id}
                className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rev.rating ? 'fill-amber-400' : 'text-gray-200 dark:text-gray-700'
                          }`}
                        />
                      ))}
                      <span className="font-bold text-xs text-gray-900 dark:text-white ml-1.5">
                        {rev.rating}.0
                      </span>
                    </div>

                    <StatusBadge status={rev.status} />
                  </div>

                  <p className="text-xs text-gray-700 dark:text-gray-300 italic mb-3">
                    "{rev.reviewText}"
                  </p>

                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {rev.customerName || 'Verified Diner'}
                    </p>
                    {rev.orderNumber && <p className="font-mono text-[11px]">Order #{rev.orderNumber}</p>}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    {rev.createdAt?.seconds
                      ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recent'}
                  </span>

                  <Button
                    size="sm"
                    variant={rev.status === 'PUBLISHED' ? 'outline' : 'default'}
                    onClick={() => handleToggleStatus(rev)}
                    className="text-xs"
                  >
                    {rev.status === 'PUBLISHED' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide Review
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Publish to Public
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
