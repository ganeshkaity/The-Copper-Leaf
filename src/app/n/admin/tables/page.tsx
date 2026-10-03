'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Table, TableStatus, TableShape } from '@/types/table';
import { QRCodeSVG } from 'qrcode.react';
import {
  LayoutGrid,
  Plus,
  QrCode,
  Download,
  Edit2,
  Users,
  Layers,
  MapPin,
  CheckCircle2,
  Trash2,
  Move,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTablesPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'layout'>('status');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Single Table Form
  const [tableNumber, setTableNumber] = useState('');
  const [floor, setFloor] = useState('Main Floor');
  const [section, setSection] = useState('Indoor');
  const [shape, setShape] = useState<TableShape>('RECTANGLE');
  const [capacity, setCapacity] = useState('4');
  const [landmark, setLandmark] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk Generator Form
  const [bulkPrefix, setBulkPrefix] = useState('T');
  const [bulkStartNum, setBulkStartNum] = useState('1');
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkCapacity, setBulkCapacity] = useState('4');
  const [bulkShape, setBulkShape] = useState<TableShape>('RECTANGLE');
  const [bulkFloor, setBulkFloor] = useState('Main Floor');

  // Realtime tables sync
  useEffect(() => {
    if (!activeRestaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const tablesRef = collection(db, 'tables');
    const q = query(tablesRef, where('restaurantId', '==', activeRestaurantId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Table[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Table);
        });
        setTables(list.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })));
        setLoading(false);
      },
      (err) => {
        console.error('Tables streaming error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeRestaurantId]);

  // Counters
  const countAvailable = tables.filter((t) => t.status === 'AVAILABLE').length;
  const countOccupied = tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'PLACING_ORDER').length;
  const countReserved = tables.filter((t) => t.status === 'RESERVED').length;
  const countBlocked = tables.filter((t) => t.status === 'BLOCKED').length;

  const handleOpenAddModal = (t?: Table) => {
    if (t) {
      setEditingTable(t);
      setTableNumber(t.tableNumber);
      setFloor(t.floor || 'Main Floor');
      setSection(t.section || 'Indoor');
      setShape(t.shape || 'RECTANGLE');
      setCapacity(t.capacity.toString());
      setLandmark(t.landmark || '');
    } else {
      setEditingTable(null);
      setTableNumber(`T${(tables.length + 1).toString().padStart(2, '0')}`);
      setFloor('Main Floor');
      setSection('Indoor');
      setShape('RECTANGLE');
      setCapacity('4');
      setLandmark('');
    }
    setIsAddModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId || !tableNumber.trim()) {
      toast.error('Table number is required');
      return;
    }

    setSaving(true);
    try {
      const parsedCapacity = parseInt(capacity) || 4;
      const computedSize: Table['size'] = parsedCapacity <= 2 ? 'Small' : parsedCapacity <= 5 ? 'Medium' : 'Large';

      const payload: Partial<Table> = {
        restaurantId: activeRestaurantId,
        tableNumber: tableNumber.trim().toUpperCase(),
        floor: floor.trim(),
        section: section.trim(),
        shape,
        capacity: parsedCapacity,
        size: computedSize,
        landmark: landmark.trim(),
        updatedAt: serverTimestamp() as any,
      };

      if (editingTable) {
        await updateDoc(doc(db, 'tables', editingTable.id), payload);
        toast.success(`Table ${payload.tableNumber} updated`);
      } else {
        payload.status = 'AVAILABLE';
        payload.active = true;
        payload.positionX = 50 + (tables.length % 5) * 120;
        payload.positionY = 50 + Math.floor(tables.length / 5) * 120;
        payload.width = shape === 'ROUND' ? 80 : shape === 'SQUARE' ? 80 : 100;
        payload.height = 80;
        payload.createdAt = serverTimestamp() as any;

        await addDoc(collection(db, 'tables'), payload);
        toast.success(`Table ${payload.tableNumber} created`);
      }

      setIsAddModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to save table: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId) return;

    setSaving(true);
    try {
      const count = parseInt(bulkCount) || 0;
      const start = parseInt(bulkStartNum) || 1;
      const cap = parseInt(bulkCapacity) || 4;
      const ref = collection(db, 'tables');

      for (let i = 0; i < count; i++) {
        const num = `${bulkPrefix}${(start + i).toString().padStart(2, '0')}`;
        await addDoc(ref, {
          restaurantId: activeRestaurantId,
          tableNumber: num,
          floor: bulkFloor.trim(),
          section: 'Indoor',
          shape: bulkShape,
          capacity: cap,
          positionX: 40 + (i % 6) * 120,
          positionY: 40 + Math.floor(i / 6) * 120,
          width: bulkShape === 'ROUND' ? 80 : bulkShape === 'SQUARE' ? 80 : 100,
          height: 80,
          status: 'AVAILABLE',
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(`Generated ${count} tables successfully!`);
      setIsBulkModalOpen(false);
    } catch (err: any) {
      toast.error('Bulk creation error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (t: Table, nextStatus: TableStatus) => {
    try {
      await updateDoc(doc(db, 'tables', t.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Table ${t.tableNumber} status set to ${nextStatus}`);
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  // QR Code URL: origin + /r/[restaurantSlug]/order?tableId=[tableId]
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://thecopperleaf.vercel.app';
  const qrUrl = selectedTableForQr
    ? `${currentOrigin}/r/${currentRestaurant?.slug || 'restaurant'}/order?tableId=${selectedTableForQr.id}`
    : '';

  const downloadQrCode = () => {
    const svg = document.getElementById('table-qr-svg');
    if (!svg || !selectedTableForQr) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${currentRestaurant?.slug || 'copperleaf'}-${selectedTableForQr.tableNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Table Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Live dining table statuses, floor capacity, QR generation, and layout configuration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBulkModalOpen(true)}>
              <Layers className="w-4 h-4 mr-1.5" />
              Bulk Generate
            </Button>
            <Button size="sm" onClick={() => handleOpenAddModal()}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Table
            </Button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Tables</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{tables.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-emerald-600 font-semibold uppercase">Available</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{countAvailable}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-amber-600 font-semibold uppercase">Occupied / Active</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{countOccupied}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181D] border border-[#E8E0D5] dark:border-[#2A2A33]">
            <p className="text-xs text-blue-600 font-semibold uppercase">Reserved</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{countReserved}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E8E0D5] dark:border-[#2A2A33] pb-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'status'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Real-time Status Cards
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'layout'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Floor Plan Canvas
          </button>
        </div>

        {/* TAB 1: Real-time Status Cards */}
        {activeTab === 'status' && (
          <div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
              </div>
            ) : tables.length === 0 ? (
              <EmptyState
                icon={LayoutGrid}
                title="No Tables Configured"
                description="Add your first dining table or click 'Bulk Generate' to create a complete set of tables."
                actionLabel="Bulk Generate Tables"
                onAction={() => setIsBulkModalOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map((t) => (
                  <Card
                    key={t.id}
                    className="p-5 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-serif text-xl font-bold text-gray-900 dark:text-white">
                          {t.tableNumber}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>

                      <div className="space-y-1 text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span>{t.capacity} Guests Max</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{t.floor} • {t.section}</span>
                        </div>
                        {t.landmark && (
                          <p className="text-[11px] text-gray-400 italic">Near: {t.landmark}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTableForQr(t);
                          setIsQrModalOpen(true);
                        }}
                        className="p-1.5 text-gray-500 hover:text-primary transition-colors"
                        title="View Table QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        <select
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t, e.target.value as TableStatus)}
                          className="text-[11px] font-medium py-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#22222A] dark:text-white"
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="RESERVED">Reserved</option>
                          <option value="CLEANING">Cleaning</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenAddModal(t)}
                          className="h-7 w-7 text-gray-500"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Floor Plan Canvas */}
        {activeTab === 'layout' && (
          <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Visual Floor Map ({tables.length} Tables)
                </h3>
                <p className="text-xs text-gray-500">
                  Floor arrangement representation. Tables are color-coded by their real-time state.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" /> Occupied
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500" /> Reserved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" /> Cleaning
                </span>
              </div>
            </div>

            {/* Canvas grid container */}
            <div className="w-full min-h-[500px] border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-6 relative overflow-auto bg-gray-50/50 dark:bg-[#0F0F12]/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
                {tables.map((t) => {
                  const statusBg =
                    t.status === 'AVAILABLE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-300'
                      : t.status === 'OCCUPIED' || t.status === 'PLACING_ORDER'
                      ? 'bg-orange-50 dark:bg-orange-950/40 border-primary text-primary'
                      : t.status === 'RESERVED'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-900 dark:text-blue-300'
                      : 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 text-yellow-900 dark:text-yellow-300';

                  const shapeClass =
                    t.shape === 'ROUND'
                      ? 'rounded-full aspect-square'
                      : t.shape === 'SQUARE'
                      ? 'rounded-2xl aspect-square'
                      : 'rounded-2xl aspect-[4/3]';

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleOpenAddModal(t)}
                      className={`p-4 border-2 shadow-sm flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 select-none ${shapeClass} ${statusBg}`}
                    >
                      <span className="font-serif font-bold text-base">{t.tableNumber}</span>
                      <span className="text-[11px] opacity-80">{t.capacity} Seats</span>
                      <span className="text-[10px] font-semibold mt-1 uppercase tracking-wider">
                        {t.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Modal: Add or Edit Table */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={editingTable ? `Edit Table ${editingTable.tableNumber}` : 'Add Dining Table'}
        >
          <form onSubmit={handleSaveTable} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Table Number *
                </label>
                <Input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. T01"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Capacity (Guests)
                </label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min="1"
                  max="30"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Floor
                </label>
                <Input
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="Main Floor"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Section
                </label>
                <Input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Indoor / Patio"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Shape
                </label>
                <select
                  value={shape}
                  onChange={(e) => setShape(e.target.value as TableShape)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
                >
                  <option value="RECTANGLE">Rectangle (Standard)</option>
                  <option value="SQUARE">Square</option>
                  <option value="ROUND">Round</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Landmark / Note
                </label>
                <Input
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. By the window"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingTable ? 'Save Changes' : 'Create Table'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Bulk Generate Tables */}
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="Bulk Generate Dining Tables"
        >
          <form onSubmit={handleBulkGenerate} className="space-y-4">
            <p className="text-xs text-gray-500">
              Quickly create sequential table numbers (e.g. T01 to T20) with shared floor and capacity settings.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Prefix
                </label>
                <Input
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  placeholder="T"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Start Number
                </label>
                <Input
                  type="number"
                  value={bulkStartNum}
                  onChange={(e) => setBulkStartNum(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Count
                </label>
                <Input
                  type="number"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Capacity (Seats)
                </label>
                <Input
                  type="number"
                  value={bulkCapacity}
                  onChange={(e) => setBulkCapacity(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Shape
                </label>
                <select
                  value={bulkShape}
                  onChange={(e) => setBulkShape(e.target.value as TableShape)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs dark:bg-[#22222A] dark:text-white"
                >
                  <option value="RECTANGLE">Rectangle</option>
                  <option value="SQUARE">Square</option>
                  <option value="ROUND">Round</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Floor / Area
              </label>
              <Input
                value={bulkFloor}
                onChange={(e) => setBulkFloor(e.target.value)}
                placeholder="Main Floor"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBulkModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Generating Tables...' : 'Generate Tables'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: View & Download QR Code */}
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title={`Table ${selectedTableForQr?.tableNumber || ''} QR Code`}
        >
          {selectedTableForQr && (
            <div className="space-y-6 text-center">
              <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-gray-200 inline-block shadow-sm">
                <QRCodeSVG
                  id="table-qr-svg"
                  value={qrUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {currentRestaurant?.name || 'The Copper Leaf'} • {selectedTableForQr.tableNumber}
                </p>
                <p className="font-mono text-[11px] text-primary truncate max-w-xs mx-auto">
                  {qrUrl}
                </p>
                <p>
                  Customers scanning this code initiate a 10-minute temporary table hold and place dine-in orders directly from their smartphone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button variant="outline" onClick={() => setIsQrModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={downloadQrCode}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
