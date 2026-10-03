'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
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
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { UserProfile } from '@/types/user';
import { Order } from '@/types/order';
import { TableReservation } from '@/types/table';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Crown,
  Sparkles,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected customer details modal
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerBookings, setCustomerBookings] = useState<TableReservation[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('role', '==', 'CUSTOMER'),
        limit(50)
      );
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as UserProfile);
      });
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleViewCustomer = async (cust: UserProfile) => {
    setSelectedCustomer(cust);
    setIsModalOpen(true);
    setLoadingDetails(true);

    try {
      // 1. Fetch customer's orders
      const ordersRef = collection(db, 'orders');
      const ordersQ = query(
        ordersRef,
        where('customerUid', '==', cust.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const ordSnap = await getDocs(ordersQ);
      const ordList: Order[] = [];
      ordSnap.forEach((d) => {
        ordList.push({ id: d.id, ...d.data() } as Order);
      });
      setCustomerOrders(ordList);

      // 2. Fetch customer's bookings
      const bookRef = collection(db, 'tableReservations');
      const bookQ = query(
        bookRef,
        where('customerUid', '==', cust.uid),
        orderBy('startAt', 'desc'),
        limit(10)
      );
      const bookSnap = await getDocs(bookQ);
      const bookList: TableReservation[] = [];
      bookSnap.forEach((d) => {
        bookList.push({ id: d.id, ...d.data() } as TableReservation);
      });
      setCustomerBookings(bookList);
    } catch (err) {
      console.error('Error fetching customer history:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.displayName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Customer Directory ({customers.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time diner profiles, dining spend, VIP status, and lifetime visit history.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Customers Found"
            description="When diners register, place orders, or link anonymous guest accounts, their profiles are stored securely here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((c) => (
              <Card
                key={c.uid}
                className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                      {c.displayName ? c.displayName.slice(0, 2).toUpperCase() : 'G'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base font-bold text-gray-900 dark:text-white truncate">
                        {c.displayName || 'Guest Gourmet'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {c.email || 'Anonymous Guest'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    {c.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {c.phone}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      Joined:{' '}
                      {c.createdAt?.seconds
                        ? new Date(c.createdAt.seconds * 1000).toLocaleDateString('en-IN')
                        : typeof c.createdAt === 'number'
                        ? new Date(c.createdAt).toLocaleDateString('en-IN')
                        : 'Recent'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600">
                    Active Diner
                  </span>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleViewCustomer(c)}
                    className="text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Profile History
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Customer Profile & Order History Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedCustomer?.displayName || 'Customer Details'}
        >
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#22222A] text-xs space-y-1.5">
                <p><strong>Email:</strong> {selectedCustomer.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {selectedCustomer.phone || 'N/A'}</p>
                <p><strong>Account Type:</strong> {selectedCustomer.accountType || 'AUTHENTICATED'}</p>
                {selectedCustomer.preferences && (
                  <p>
                    <strong>Dietary Preference:</strong>{' '}
                    {selectedCustomer.preferences.dietaryType || 'All'} (Spice:{' '}
                    {selectedCustomer.preferences.spiceLevel || 'Medium'})
                  </p>
                )}
              </div>

              {/* Recent Orders */}
              <div>
                <h4 className="font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Recent Orders ({customerOrders.length})
                </h4>

                {loadingDetails ? (
                  <Skeleton className="h-20 rounded-xl" />
                ) : customerOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No orders on record.</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.slice(0, 5).map((o) => (
                      <div
                        key={o.id}
                        className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-gray-900 dark:text-white">
                            #{o.orderNumber}
                          </span>
                          <span className="text-gray-400 ml-2">• ₹{o.finalPayable}</span>
                        </div>
                        <StatusBadge status={o.orderStatus} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Bookings */}
              <div>
                <h4 className="font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Table Reservations ({customerBookings.length})
                </h4>

                {loadingDetails ? (
                  <Skeleton className="h-20 rounded-xl" />
                ) : customerBookings.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No table reservations.</p>
                ) : (
                  <div className="space-y-2">
                    {customerBookings.slice(0, 5).map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            Table {b.tableId}
                          </span>
                          <span className="text-gray-400 ml-2">({b.partySize} guests)</span>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
