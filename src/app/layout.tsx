import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import AuthProviders from '@/components/provider-auth';
import { ThemeProvider } from '@/components/provider-theme';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Dextra',
    default: 'Dextra - The Intelligent Copilot for BSC',
  },
  description: 'The Intelligent Copilot elevating your BSC experience.',

  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          `${geistSans.variable} ${geistMono.variable}`,
          'overflow-x-hidden antialiased',
        )}
      >
        <AuthProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main
              className="sticky bottom-0 overflow-hidden md:overflow-visible"
              style={{
                borderRadius: '40px 0 40px 40px',
                backgroundImage: 'linear-gradient(-45deg, #02081d, #000)',
              }}
            >
              {children}
              <Toaster />
            </main>
          </ThemeProvider>
        </AuthProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
