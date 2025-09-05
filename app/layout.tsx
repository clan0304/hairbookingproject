// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My Service',
  description: 'Authentication with Clerk and Supabase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: 'bg-white',
                title: 'text-sm font-semibold',
                description: 'text-sm',
                error: 'bg-red-50 text-red-900 border-red-200',
                success: 'bg-green-50 text-green-900 border-green-200',
                warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
                info: 'bg-blue-50 text-blue-900 border-blue-200',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
