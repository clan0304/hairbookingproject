// components/AdminRoute.tsx
// ============================================
'use client';

import { useRole } from '@/hooks/useRole';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

export function AdminRoute({
  children,
  fallbackUrl = '/dashboard',
}: AdminRouteProps) {
  const { isAdmin, isLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push(fallbackUrl);
    }
  }, [isAdmin, isLoading, fallbackUrl, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Checking permissions...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
