import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    const variants = {
      default:
        'bg-[#C8622A] hover:bg-[#B3531E] text-white shadow-sm hover:shadow active:bg-[#9E4516]',
      primary:
        'bg-[#C8622A] hover:bg-[#B3531E] text-white shadow-sm hover:shadow active:bg-[#9E4516]',
      secondary:
        'bg-[#F3ECE2] hover:bg-[#EAE0D3] text-[#1C1917] dark:bg-[#22222A] dark:hover:bg-[#2C2C36] dark:text-white',
      outline:
        'border border-[#E8E0D5] bg-transparent hover:bg-[#FDF4ED] text-[#1C1917] dark:border-[#2A2A33] dark:hover:bg-[#22222A] dark:text-white',
      ghost:
        'bg-transparent hover:bg-[#F3ECE2]/60 text-[#1C1917] dark:text-white dark:hover:bg-[#22222A]',
      destructive:
        'bg-red-600 hover:bg-red-700 text-white shadow-sm',
      subtle:
        'bg-[#FDF4ED] hover:bg-[#F9E8DA] text-[#C8622A] dark:bg-[#2A1C14] dark:hover:bg-[#382317] dark:text-[#E2773F]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-10 px-4 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-xl gap-2.5 font-semibold',
      icon: 'h-10 w-10 rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
