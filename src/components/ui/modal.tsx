'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  open,
  onClose,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const isControlledOpen = isOpen !== undefined ? isOpen : open;
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && onClose) {
      onClose();
    }
    if (onOpenChange) {
      onOpenChange(nextOpen);
    }
  };

  return (
    <DialogPrimitive.Root open={isControlledOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#E8E0D5] bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl dark:border-[#2A2A33] dark:bg-[#18181D]',
            className
          )}
        >
          {(title || description) && (
            <div className="flex flex-col space-y-1.5 text-left">
              {title && (
                <DialogPrimitive.Title className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-white">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="text-sm text-[#78716C] dark:text-[#A1A1AA]">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xl p-2 opacity-70 transition-opacity hover:opacity-100 hover:bg-[#F3ECE2] dark:hover:bg-[#2A2A33] focus:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const ModalTrigger = DialogPrimitive.Trigger;

export function ModalContent({
  className,
  children,
  title,
  description,
  ...props
}: DialogPrimitive.DialogContentProps & { title?: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#E8E0D5] bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl dark:border-[#2A2A33] dark:bg-[#18181D]',
          className
        )}
        {...props}
      >
        <div className="flex flex-col space-y-1.5 text-left">
          {title && (
            <DialogPrimitive.Title className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-white">
              {title}
            </DialogPrimitive.Title>
          )}
          {description && (
            <DialogPrimitive.Description className="text-sm text-[#78716C] dark:text-[#A1A1AA]">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xl p-2 opacity-70 transition-opacity hover:opacity-100 hover:bg-[#F3ECE2] dark:hover:bg-[#2A2A33] focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
