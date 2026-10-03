'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function PwaOfflineListener() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Register Service Worker
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('PWA service worker registration failed:', err);
        });
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-xs md:text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
      <span>
        You are currently offline. Critical transactions (ordering, payments, table holds) are disabled until you reconnect.
      </span>
    </div>
  );
}
