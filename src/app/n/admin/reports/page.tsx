'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { useRestaurant } from '@/lib/context/restaurant-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Order } from '@/types/order';
import { Expense } from '@/types/expense';
import { FileText, Download, Filter, Table, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminReportsPage() {
  const { currentRestaurant, restaurants } = useRestaurant();
  const activeRestaurantId = currentRestaurant?.id || (restaurants.length > 0 ? restaurants[0].id : null);

  const [reportType, setReportType] = useState<'sales' | 'expenses'>('sales');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeRestaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (reportType === 'sales') {
          const ordRef = collection(db, 'orders');
          const ordQ = query(
            ordRef,
            where('restaurantId', '==', activeRestaurantId),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(ordQ);
          const list: Order[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Order);
          });
          setOrders(list);
        } else {
          const expRef = collection(db, 'expenses');
          const expQ = query(
            expRef,
            where('restaurantId', '==', activeRestaurantId),
            orderBy('expenseDate', 'desc')
          );
          const snap = await getDocs(expQ);
          const list: Expense[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Expense);
          });
          setExpenses(list);
        }
      } catch (err) {
        console.error('Reports load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeRestaurantId, reportType]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (reportType === 'sales') {
      const data = orders.map((o) => ({
        'Order #': o.orderNumber,
        Type: o.orderType,
        Table: o.tableId || 'N/A',
        Subtotal: o.subtotal,
        Discount: (o.membershipDiscount || 0) + (o.couponDiscount || 0),
        Tax: o.taxes || 0,
        Total: o.finalPayable,
        Payment: o.paymentStatus,
        Status: o.orderStatus,
        Date: o.createdAt?.seconds
          ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('en-IN')
          : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
      XLSX.writeFile(wb, `Sales_Report_${currentRestaurant?.slug || 'copperleaf'}.xlsx`);
    } else {
      const data = expenses.map((e) => ({
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        'Logged By': e.createdBy,
        Date: e.expenseDate?.seconds
          ? new Date(e.expenseDate.seconds * 1000).toLocaleDateString('en-IN')
          : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses Report');
      XLSX.writeFile(wb, `Expenses_Report_${currentRestaurant?.slug || 'copperleaf'}.xlsx`);
    }

    toast.success('Excel report downloaded');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const restName = currentRestaurant?.name || 'The Copper Leaf';

    doc.setFontSize(16);
    doc.text(`${restName} - ${reportType === 'sales' ? 'Sales Ledger' : 'Expenses Ledger'}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

    if (reportType === 'sales') {
      const rows: string[][] = orders.map((o) => [
        `#${o.orderNumber || ''}`,
        String(o.orderType || ''),
        String(o.tableId || 'N/A'),
        `₹${o.subtotal || 0}`,
        `₹${o.finalPayable || 0}`,
        String(o.paymentStatus || ''),
        String(o.orderStatus || ''),
      ]);

      autoTable(doc, {
        startY: 34,
        head: [['Order #', 'Type', 'Table', 'Subtotal', 'Net Paid', 'Payment', 'Status']],
        body: rows,
      });
    } else {
      const rows: string[][] = expenses.map((e) => [
        String(e.category || ''),
        String(e.description || ''),
        `₹${e.amount || 0}`,
        String(e.createdBy || ''),
        e.expenseDate?.seconds
          ? new Date(e.expenseDate.seconds * 1000).toLocaleDateString('en-IN')
          : '',
      ]);

      autoTable(doc, {
        startY: 34,
        head: [['Category', 'Description', 'Amount', 'Logged By', 'Date']],
        body: rows,
      });
    }

    doc.save(`${reportType}_report_${currentRestaurant?.slug || 'copperleaf'}.pdf`);
    toast.success('PDF report downloaded');
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Data Reports & Export Center
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Download clean Excel spreadsheets and formatted PDF statements from real Firestore business data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={loading || (reportType === 'sales' ? orders.length === 0 : expenses.length === 0)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Download Excel (.xlsx)
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={loading || (reportType === 'sales' ? orders.length === 0 : expenses.length === 0)}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E8E0D5] dark:border-[#2A2A33] pb-2">
          <button
            onClick={() => setReportType('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              reportType === 'sales'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Sales & Orders Ledger
          </button>
          <button
            onClick={() => setReportType('expenses')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              reportType === 'expenses'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Operational Expenses Ledger
          </button>
        </div>

        {/* Data Preview Card */}
        <Card className="p-6 rounded-2xl border border-[#E8E0D5] dark:border-[#2A2A33] bg-white dark:bg-[#18181D]">
          <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white mb-4">
            Report Data Preview (
            {reportType === 'sales' ? `${orders.length} orders` : `${expenses.length} expenses`})
          </h2>

          {loading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : reportType === 'sales' && orders.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Sales Data on File"
              description="No orders exist for this restaurant to generate an export."
            />
          ) : reportType === 'expenses' && expenses.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Expenses on File"
              description="No expense records logged for this restaurant."
            />
          ) : reportType === 'sales' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Order #</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Table</th>
                    <th className="pb-3">Subtotal</th>
                    <th className="pb-3">Taxes</th>
                    <th className="pb-3">Net Total</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.slice(0, 10).map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-[#22222A]/50">
                      <td className="py-2.5 font-mono font-bold text-gray-900 dark:text-white">
                        #{o.orderNumber}
                      </td>
                      <td className="py-2.5 capitalize">{o.orderType.toLowerCase()}</td>
                      <td className="py-2.5">{o.tableId || 'N/A'}</td>
                      <td className="py-2.5 font-mono">₹{o.subtotal}</td>
                      <td className="py-2.5 font-mono">₹{o.taxes || 0}</td>
                      <td className="py-2.5 font-mono font-bold text-emerald-600">
                        ₹{o.finalPayable}
                      </td>
                      <td className="py-2.5 text-right capitalize">{o.orderStatus.toLowerCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length > 10 && (
                <p className="text-[11px] text-gray-400 italic pt-3 text-center">
                  Showing first 10 rows. Download Excel or PDF for full ledger ({orders.length} rows).
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {expenses.slice(0, 10).map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-[#22222A]/50">
                      <td className="py-2.5 font-semibold text-gray-900 dark:text-white">
                        {e.category}
                      </td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-300">{e.description}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-rose-600">
                        ₹{e.amount}
                      </td>
                      <td className="py-2.5 text-gray-400">{e.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
