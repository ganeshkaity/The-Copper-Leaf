import React from 'react';
import { cn } from '@/lib/utils';
import { TableStatus, OrderStatus, PaymentStatus } from '@/types';

interface StatusBadgeProps {
  status: TableStatus | OrderStatus | PaymentStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  let colorStyles = 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';

  const s = status.toUpperCase();

  switch (s) {
    // Table Statuses
    case 'AVAILABLE':
      colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'RESERVED':
      colorStyles = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800';
      break;
    case 'OCCUPIED':
      colorStyles = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      break;
    case 'PLACING_ORDER':
      colorStyles = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      break;
    case 'CLEANING':
      colorStyles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      break;
    case 'BLOCKED':
    case 'DISABLE':
      colorStyles = 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
      break;

    // Order Statuses
    case 'PENDING':
      colorStyles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      break;
    case 'CONFIRMED':
      colorStyles = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
      break;
    case 'PREPARING':
      colorStyles = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800';
      break;
    case 'READY':
      colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
      break;
    case 'SERVED':
      colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'COMPLETED':
      colorStyles = 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
      break;
    case 'CANCELLED':
    case 'FAILED':
      colorStyles = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
      break;

    // Payment Statuses
    case 'PAID':
      colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'UNPAID':
      colorStyles = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      break;
    case 'REFUNDED':
      colorStyles = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
      break;
  }

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full select-none capitalize transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs md:text-sm',
        colorStyles,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {formatText(status)}
    </span>
  );
}
