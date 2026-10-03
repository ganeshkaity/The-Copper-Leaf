import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, rightElement, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        {icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border border-[#E8E0D5] bg-white px-3.5 py-2 text-sm text-[#1C1917] placeholder:text-[#A1A1AA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8622A] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#18181D] dark:border-[#2A2A33] dark:text-white',
            icon && 'pl-10',
            rightElement && 'pr-11',
            className
          )}
          ref={ref}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
