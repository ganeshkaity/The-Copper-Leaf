import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  progressPercent?: number; // 0 to 100
  progressBarColor?: 'copper' | 'green' | 'gray' | 'blue';
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  progressPercent,
  progressBarColor = 'copper',
  icon,
  trend,
  className,
}: StatCardProps) {
  const barColors = {
    copper: 'bg-[#C8622A]',
    green: 'bg-emerald-500',
    gray: 'bg-neutral-300 dark:bg-neutral-700',
    blue: 'bg-sky-500',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-[#E8E0D5] bg-white p-5 shadow-sm dark:bg-[#18181D] dark:border-[#2A2A33] transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#78716C] dark:text-[#A1A1AA] flex items-center gap-2">
          {icon && (React.isValidElement(icon) ? icon : React.createElement(icon as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' }))}
          {title}
        </span>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              trend.positive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div className="mt-2 text-3xl font-bold tracking-tight text-[#1C1917] dark:text-white">
        {value}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-[#78716C] dark:text-[#A1A1AA]">{subtitle}</p>
      )}

      {typeof progressPercent === 'number' && (
        <div className="mt-3 w-full bg-[#F3ECE2] dark:bg-[#2A2A33] h-2.5 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColors[progressBarColor])}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
