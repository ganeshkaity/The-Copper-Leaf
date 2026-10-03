import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const renderedIcon = icon
    ? React.isValidElement(icon)
      ? icon
      : React.createElement(icon as React.ComponentType<{ className?: string }>, { className: 'w-8 h-8' })
    : null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl border border-dashed border-[#E8E0D5] bg-white/50 dark:bg-[#18181D]/50 dark:border-[#2A2A33] my-4',
        className
      )}
    >
      {renderedIcon && (
        <div className="w-16 h-16 rounded-2xl bg-[#FDF4ED] dark:bg-[#2A1C14] text-[#C8622A] dark:text-[#E2773F] flex items-center justify-center mb-4 text-2xl shadow-sm">
          {renderedIcon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#1C1917] dark:text-white mb-1.5">{title}</h3>
      <p className="text-sm text-[#78716C] dark:text-[#A1A1AA] max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
