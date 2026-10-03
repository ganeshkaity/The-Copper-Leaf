import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/context/auth-context';
import { RestaurantProvider } from '@/lib/context/restaurant-context';
import { ThemeProvider } from '@/lib/context/theme-context';
import { PwaOfflineListener } from '@/components/pwa-offline-listener';
import { Toaster } from 'sonner';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serifFont = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | The Copper Leaf',
    default: 'The Copper Leaf | Fine Dining, Restaurant Discovery & Management',
  },
  description:
    'Experience refined dining, seamless table reservations, instant table-side QR ordering, and intelligent multi-branch restaurant operations.',
  manifest: '/manifest.json',
  icons: {
    icon: '/brand/favicon.png',
    apple: '/brand/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#C8622A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sansFont.variable} ${serifFont.variable}`}>
      <head>
        <link rel="icon" href="/brand/favicon.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-[#C8622A]/20 selection:text-[#C8622A]">
        <ThemeProvider defaultTheme="light">
          <AuthProvider>
            <RestaurantProvider>
              <PwaOfflineListener />
              {children}
              <Toaster
                position="top-right"
                richColors
                closeButton
                theme="light"
                toastOptions={{
                  style: {
                    borderRadius: '12px',
                    fontFamily: 'var(--font-sans)',
                  },
                }}
              />
            </RestaurantProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
