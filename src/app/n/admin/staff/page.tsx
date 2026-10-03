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
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { UserProfile, UserRole } from '@/types/user';
import {
  ShieldCheck,
  UserCheck,
  ChefHat,
  Search,
  LogOut,
  Building2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminStaffPage() {
  const { restaurants } = useRestaurant();
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('WAITER');
  const [assignedBranches, setAssignedBranches] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Fetch users with staff roles: ADMIN, WAITER, KITCHEN
      const q = query(
        usersRef,
        where('role', 'in', ['ADMIN', 'WAITER', 'KITCHEN'])
      );
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as UserProfile);
      });
      setStaffList(list);
    } catch (err) {
      console.error('Failed to load staff members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenEdit = (staff: UserProfile) => {
    setEditingStaff(staff);
    setSelectedRole(staff.role);
    setAssignedBranches(staff.assignedRestaurantIds || []);
    setIsModalOpen(true);
  };

  const handleToggleBranch = (id: string) => {
    setAssignedBranches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editingStaff.uid), {
        role: selectedRole,
        assignedRestaurantIds: assignedBranches,
        updatedAt: serverTimestamp(),
      });

      toast.success(`Updated role and branches for ${editingStaff.displayName || editingStaff.email}`);
      setIsModalOpen(false);
      await fetchStaff();
    } catch (err: any) {
      toast.error('Failed to update staff: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleForceLogout = async (staff: UserProfile) => {
    if (!confirm(`Are you sure you want to force logout ${staff.displayName || staff.email}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/auth/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid: staff.uid }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Force logout failed');
      }

      toast.success(`Force logout triggered for ${staff.displayName || staff.email}`);
      await fetchStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to force logout');
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.displayName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Staff & Team Management ({staffList.length})
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Assign roles, delegate restaurant branch access, and manage security session termination.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name or email..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 border-b border-[#E8E0D5] dark:border-[#2A2A33] pb-2">
          {['ALL', 'ADMIN', 'WAITER', 'KITCHEN'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                roleFilter === role
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No Staff Members Found"
            description="All new registrations initially receive role CUSTOMER. As an Administrator, edit any registered user in Firestore or change their role here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((staff) => {
              const roleIcon =
                staff.role === 'ADMIN' ? (
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                ) : staff.role === 'KITCHEN' ? (
                  <ChefHat className="w-4 h-4 text-orange-500" />
                ) : (
                  <UserCheck className="w-4 h-4 text-blue-500" />
                );

              return (
                <Card
                  key={staff.uid}
                  className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {roleIcon}
                        <span className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                          {staff.role}
                        </span>
                      </div>
                      <StatusBadge status={staff.status || 'ACTIVE'} />
                    </div>

                    <h3 className="font-serif text-base font-bold text-gray-900 dark:text-white truncate">
                      {staff.displayName || 'Staff Member'}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{staff.email}</p>

                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p className="flex items-center gap-1 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {staff.assignedRestaurantIds && staff.assignedRestaurantIds.length > 0
                            ? `${staff.assignedRestaurantIds.length} Assigned Branch(es)`
                            : 'All Branches (Unrestricted)'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleForceLogout(staff)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title="Invalidate active user session"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" />
                      Force Logout
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenEdit(staff)}
                      className="text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit Role
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Edit Staff Role & Branch Assignment */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Edit Staff: ${editingStaff?.displayName || editingStaff?.email || ''}`}
        >
          <form onSubmit={handleSaveStaff} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Assign System Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
              >
                <option value="WAITER">WAITER (POS, Tables, Orders, Billing, Calls)</option>
                <option value="KITCHEN">KITCHEN (KDS Line Display & Preparation)</option>
                <option value="ADMIN">ADMIN (Full Operations, Settings & Financials)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Assigned Restaurant Locations
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select specific branches this staff member is authorized to access. If none are selected, access is unrestricted.
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {restaurants.map((r) => {
                  const isChecked = assignedBranches.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleBranch(r.id)}
                        className="rounded text-primary"
                      />
                      <span>{r.name}</span>
                    </label>
                  );
                })}
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
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
