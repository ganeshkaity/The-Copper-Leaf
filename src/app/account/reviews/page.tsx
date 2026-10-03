'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { CustomerShell } from '@/components/customer/customer-shell';
import { AccountNav } from '@/components/customer/account-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Review } from '@/types/review';
import { Order } from '@/types/order';
import { Star, MessageSquare, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewsPage() {
  const { user, profile } = useAuth();
  const { currentRestaurant, restaurants } = useRestaurant();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch customer's past reviews
        const reviewsRef = collection(db, 'reviews');
        const q = query(
          reviewsRef,
          where('customerUid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const revList: Review[] = [];
        snap.forEach((d) => {
          revList.push({ id: d.id, ...d.data() } as Review);
        });
        setReviews(revList);

        // 2. Fetch completed orders by this customer to check which can be reviewed
        const ordersRef = collection(db, 'orders');
        const orderQ = query(
          ordersRef,
          where('customerUid', '==', user.uid),
          where('orderStatus', '==', 'COMPLETED'),
          orderBy('createdAt', 'desc')
        );
        const orderSnap = await getDocs(orderQ);
        const ordList: Order[] = [];
        orderSnap.forEach((d) => {
          ordList.push({ id: d.id, ...d.data() } as Order);
        });
        setCompletedOrders(ordList);
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // List of completed orders that have not been reviewed yet
  const reviewedOrderIds = new Set(reviews.map((r) => r.orderId));
  const unreviewedOrders = completedOrders.filter((o) => !reviewedOrderIds.has(o.id));

  const handleOpenReviewModal = (order: Order) => {
    setSelectedOrder(order);
    setRating(5);
    setReviewText('');
    setIsModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!user || !selectedOrder) return;
    if (!reviewText.trim()) {
      toast.error('Please share a few words about your dining experience');
      return;
    }

    setSubmitting(true);
    try {
      const reviewDoc: Omit<Review, 'id'> = {
        restaurantId: selectedOrder.restaurantId,
        customerUid: user.uid,
        customerName: profile?.displayName || user.displayName || 'Guest Gourmet',
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        rating,
        reviewText: reviewText.trim(),
        status: 'PUBLISHED', // or PENDING moderation if admin prefers
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      const docRef = await addDoc(collection(db, 'reviews'), reviewDoc);

      toast.success('Thank you! Your verified review has been published.');
      setIsModalOpen(false);

      // Add to local state
      setReviews((prev) => [
        { id: docRef.id, ...reviewDoc, createdAt: { seconds: Math.floor(Date.now() / 1000) } } as Review,
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error('Failed to submit review: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            My Reviews & Ratings
          </h1>
          <p className="text-gray-600 mt-2">
            Share authentic feedback on your completed meals to help fellow diners and guide our chefs.
          </p>
        </div>

        <AccountNav />

        {/* Unreviewed Orders Section */}
        {unreviewedOrders.length > 0 && (
          <div className="mb-10 p-6 rounded-2xl bg-orange-50 border border-orange-200">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-2">
              Ready to Review ({unreviewedOrders.length})
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              You enjoyed these meals recently. Share your thoughts with our culinary team!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unreviewedOrders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-white rounded-xl border border-orange-200/80 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Completed
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {order.createdAt?.seconds
                        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'Recent'}
                      {' • '}₹{order.finalPayable}
                    </p>
                    <p className="text-xs text-gray-700 line-clamp-1">
                      {order.items.map((i) => i.nameSnapshot).join(', ')}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleOpenReviewModal(order)}
                    size="sm"
                    className="mt-4 w-full text-xs font-medium rounded-lg"
                  >
                    <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    Write a Review
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Past Reviews */}
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">
            Past Reviews ({reviews.length})
          </h2>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No Reviews Yet"
              description="You haven't written any reviews yet. Complete an order to share your thoughts on our recipes!"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <Card key={rev.id} className="p-6 rounded-2xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rev.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                      <span className="text-sm font-bold text-gray-900 ml-1.5">{rev.rating}.0</span>
                    </div>

                    <span className="text-xs text-gray-400">
                      {rev.createdAt?.seconds
                        ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recent'}
                    </span>
                  </div>

                  {rev.orderNumber && (
                    <p className="text-xs font-mono text-gray-400 mb-2">
                      Order #{rev.orderNumber}
                    </p>
                  )}

                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    "{rev.reviewText}"
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Dining Review
                    </span>
                    <StatusBadge status={rev.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Write Review Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Review Order #${selectedOrder?.orderNumber || ''}`}
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Overall Experience Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-lg font-bold text-gray-900">{rating} / 5</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                placeholder="How was the food, flavor, ambience, and table service? Mention any standout dishes!"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Publish Review'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </CustomerShell>
  );
}
