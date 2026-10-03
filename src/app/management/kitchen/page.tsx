'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
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
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order, OrderStatus } from '@/types/order';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  AlertTriangle,
  Flame,
  Maximize2,
  Minimize2,
  LogOut,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function KitchenDisplayPage() {
  const { profile, user, isKitchen, isAdmin, signOut } = useAuth();
  const { currentRestaurant, restaurants, setSelectedRestaurantId } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Manager Issue Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueOrder, setIssueOrder] = useState<Order | null>(null);
  const [issueReason, setIssueReason] = useState('Out of Ingredient Stock');
  const [issueNote, setIssueNote] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const prevOrdersCountRef = useRef(0);

  // Play Web Audio Chime on new orders
  const playNewOrderChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio chime autoplay restriction:', e);
    }
  };

  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const ordQ = query(
      collection(db, 'orders'),
      where('restaurantId', '==', activeRestaurantId),
      where('orderStatus', 'in', ['CONFIRMED', 'PREPARING', 'READY']),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      ordQ,
      (snap) => {
        const list: Order[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));

        // If new incoming order arrived, trigger audio chime
        if (list.length > prevOrdersCountRef.current && prevOrdersCountRef.current > 0) {
          playNewOrderChime();
        }
        prevOrdersCountRef.current = list.length;

        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error('KDS streaming error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activeRestaurantId, soundEnabled]);

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'PREPARING';
    if (currentStatus === 'CONFIRMED') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'READY';

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Ticket moved to ${nextStatus}`);
    } catch (err: any) {
      toast.error('Failed to update kitchen ticket');
    }
  };

  const handleOpenIssueModal = (order: Order) => {
    setIssueOrder(order);
    setIssueReason('Out of Ingredient Stock');
    setIssueNote('');
    setIsIssueModalOpen(true);
  };

  const handleSubmitManagerIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueOrder || !activeRestaurantId) return;

    setSubmittingIssue(true);
    try {
      // Create Manager Permission Request / Issue record
      await addDoc(collection(db, 'serviceRequests'), {
        restaurantId: activeRestaurantId,
        tableId: issueOrder.tableId || 'Kitchen',
        customerUid: user?.uid,
        reason: `Kitchen Issue: ${issueReason}`,
        note: `Ticket #${issueOrder.orderNumber}: ${issueNote.trim()}`,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });

      toast.success('Manager alerted to kitchen issue!');
      setIsIssueModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to report issue: ' + err.message);
    } finally {
      setSubmittingIssue(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const confirmedOrders = orders.filter((o) => o.orderStatus === 'CONFIRMED');
  const preparingOrders = orders.filter((o) => o.orderStatus === 'PREPARING');
  const readyOrders = orders.filter((o) => o.orderStatus === 'READY');

  return (
    <div className="min-h-screen bg-[#0F0F12] text-white flex flex-col">
      {/* Top KDS Header */}
      <header className="h-16 px-6 bg-[#18181D] border-b border-[#2A2A33] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8622A] text-white flex items-center justify-center font-bold">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-wide">
              KITCHEN DISPLAY SYSTEM (KDS)
            </h1>
            <p className="text-xs text-gray-400">
              Branch: <span className="text-white font-medium">{currentRestaurant?.name || 'Kitchen Line'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {restaurants.length > 1 && (
            <select
              value={currentRestaurant?.id || ''}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="bg-[#22222A] border border-[#2A2A33] text-xs px-3 py-1.5 rounded-lg text-white font-medium"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-[#22222A] hover:bg-[#2C2C36] text-gray-300 transition-colors"
            title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-gray-500" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-[#22222A] hover:bg-[#2C2C36] text-gray-300 transition-colors"
            title="Toggle Fullscreen Monitor Mode"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <Link href="/management/manage/dashboard">
            <Button size="sm" variant="outline" className="text-xs border-[#2A2A33] text-gray-300">
              Waiter Ops
            </Button>
          </Link>
        </div>
      </header>

      {/* 3-Column Kitchen Lanes */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-[600px] rounded-2xl bg-[#18181D]" />
            <Skeleton className="h-[600px] rounded-2xl bg-[#18181D]" />
            <Skeleton className="h-[600px] rounded-2xl bg-[#18181D]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="h-full flex items-center justify-center p-12">
            <EmptyState
              icon={ChefHat}
              title="Kitchen Queue is Completely Clear"
              description="No dishes are currently awaiting preparation. New table orders will chime and display here automatically."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
            {/* Column 1: Incoming / Confirmed Tickets */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#18181D] border-l-4 border-amber-500 flex items-center justify-between">
                <span className="font-serif font-bold text-sm uppercase tracking-wider text-amber-400">
                  New Incoming ({confirmedOrders.length})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  Queue
                </span>
              </div>

              {confirmedOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-600 border border-dashed border-[#2A2A33] rounded-2xl">
                  Queue is clear
                </div>
              ) : (
                confirmedOrders.map((o) => (
                  <KdsOrderTicket
                    key={o.id}
                    order={o}
                    onAdvance={() => handleAdvanceStatus(o.id, 'CONFIRMED')}
                    onIssue={() => handleOpenIssueModal(o)}
                    actionLabel="Start Cooking"
                  />
                ))
              )}
            </div>

            {/* Column 2: On Stove / Preparing */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#18181D] border-l-4 border-[#C8622A] flex items-center justify-between">
                <span className="font-serif font-bold text-sm uppercase tracking-wider text-[#E2773F] flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  Preparing Now ({preparingOrders.length})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold">
                  Stove
                </span>
              </div>

              {preparingOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-600 border border-dashed border-[#2A2A33] rounded-2xl">
                  No active cooking tickets
                </div>
              ) : (
                preparingOrders.map((o) => (
                  <KdsOrderTicket
                    key={o.id}
                    order={o}
                    onAdvance={() => handleAdvanceStatus(o.id, 'PREPARING')}
                    onIssue={() => handleOpenIssueModal(o)}
                    actionLabel="Mark Ready for Pass"
                  />
                ))
              )}
            </div>

            {/* Column 3: Ready at Pass */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#18181D] border-l-4 border-emerald-500 flex items-center justify-between">
                <span className="font-serif font-bold text-sm uppercase tracking-wider text-emerald-400">
                  Ready at Pass ({readyOrders.length})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  Pass
                </span>
              </div>

              {readyOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-600 border border-dashed border-[#2A2A33] rounded-2xl">
                  Pass counter is empty
                </div>
              ) : (
                readyOrders.map((o) => (
                  <KdsOrderTicket
                    key={o.id}
                    order={o}
                    onAdvance={() => {}}
                    onIssue={() => handleOpenIssueModal(o)}
                    actionLabel="Waiting for Waiter Pickup"
                    isReady={true}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Request Manager Permission / Issue */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title={`Report Kitchen Issue: Order #${issueOrder?.orderNumber || ''}`}
      >
        <form onSubmit={handleSubmitManagerIssue} className="space-y-4">
          <p className="text-xs text-gray-500">
            Per restaurant policy, kitchen tickets cannot be directly cancelled. Submitting this form flags the ticket immediately on the manager's terminal.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Issue Type *
            </label>
            <select
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
            >
              <option value="Out of Ingredient Stock">Out of Ingredient Stock</option>
              <option value="Special Dietary Conflict">Special Dietary Conflict / Allergy Alert</option>
              <option value="Kitchen Equipment Malfunction">Clay Tandoor / Equipment Malfunction</option>
              <option value="Duplicate Ticket">Duplicate / Invalid Ticket</option>
              <option value="Other">Other Operational Issue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Chef Note / Clarification
            </label>
            <textarea
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              rows={3}
              placeholder="e.g. Fresh Atlantic salmon out of stock; recommend substituting with King Prawns or notify customer."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsIssueModalOpen(false)}
              disabled={submittingIssue}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submittingIssue} variant="destructive">
              {submittingIssue ? 'Alerting...' : 'Alert Manager'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function KdsOrderTicket({
  order,
  onAdvance,
  onIssue,
  actionLabel,
  isReady,
}: {
  order: Order;
  onAdvance: () => void;
  onIssue: () => void;
  actionLabel: string;
  isReady?: boolean;
}) {
  const elapsedMinutes = order.createdAt?.seconds
    ? Math.max(0, Math.floor((Date.now() / 1000 - order.createdAt.seconds) / 60))
    : 0;

  // Visual urgency threshold
  const isUrgent = elapsedMinutes > 20;
  const isWarning = elapsedMinutes > 12;

  const timerColor = isUrgent
    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
    : isWarning
    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    : 'bg-[#22222A] text-gray-300 border border-[#2A2A33]';

  return (
    <Card className="p-4 rounded-2xl bg-[#18181D] border border-[#2A2A33] shadow-md flex flex-col justify-between text-white">
      <div>
        {/* Ticket Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2A2A33]">
          <div>
            <span className="font-serif text-xl font-bold text-white">
              {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
            </span>
            <span className="font-mono text-xs text-gray-400 ml-2">#{order.orderNumber}</span>
          </div>

          <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${timerColor}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{elapsedMinutes}m</span>
          </div>
        </div>

        {/* Item List */}
        <div className="py-3 space-y-3">
          {order.items?.map((item, idx) => (
            <div key={idx} className="text-sm">
              <div className="flex items-baseline justify-between font-bold text-white">
                <span className="text-base text-[#FDF4ED]">
                  {item.quantity}x {item.nameSnapshot}
                </span>
              </div>

              {item.variantSnapshot && (
                <p className="text-xs text-amber-400 font-semibold mt-0.5">
                  Variant: {item.variantSnapshot.name}
                </p>
              )}

              {item.modifierSnapshot && item.modifierSnapshot.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  + {item.modifierSnapshot.map((m) => m.name).join(', ')}
                </p>
              )}

              {item.removedIngredients && item.removedIngredients.length > 0 && (
                <p className="text-xs text-rose-400 font-bold uppercase tracking-wider mt-0.5">
                  NO: {item.removedIngredients.join(', ')}
                </p>
              )}

              {item.specialInstructions && (
                <p className="text-xs text-amber-300 italic mt-0.5 bg-[#22222A] p-1.5 rounded-lg">
                  "{item.specialInstructions}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Footer Action */}
      <div className="pt-3 border-t border-[#2A2A33] flex items-center gap-2">
        <Button
          onClick={onAdvance}
          disabled={isReady}
          className={`flex-1 text-xs font-bold py-2.5 rounded-xl ${
            isReady
              ? 'bg-emerald-600/30 text-emerald-400 cursor-not-allowed'
              : 'bg-[#C8622A] hover:bg-[#B3531E] text-white'
          }`}
        >
          {isReady ? (
            <span className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Ready for Table Service
            </span>
          ) : (
            actionLabel
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onIssue}
          className="border-[#2A2A33] text-gray-400 hover:text-rose-400 text-xs px-2.5"
          title="Report kitchen issue to manager"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}
