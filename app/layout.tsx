import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthContext';
import { ThemeProvider } from '@/components/ThemeContext';
import { Suspense } from 'react';
import ToastNotify from '@/components/ToastNotify';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import SetZoom from '@/components/SetZoom';

export const metadata: Metadata = {
  title: 'Next.JS Payment App',
  description: 'Payment platform built with Next.js',
};

function RootLayoutFallback() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Loading page...</p>
    </div>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 从 cookie 获取 NEXT_LOCALE，没有则默认 'en'
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <body
        className="antialiased bg-gray-100 dark:bg-gray-900"
        style={{
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        <AuthProvider>
          <ThemeProvider>
            <Suspense fallback={<RootLayoutFallback />}>
              <NextIntlClientProvider locale={locale} messages={messages}>
                <SetZoom />
                {children}
              </NextIntlClientProvider>
            </Suspense>
            <ToastNotify.container />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
