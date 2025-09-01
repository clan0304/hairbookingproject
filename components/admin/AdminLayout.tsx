// components/admin/AdminLayout.tsx
// ============================================
'use client';

import { Sidebar } from './Sidebar';
import { AdminRoute } from '@/components/AdminRoute';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminRoute fallbackUrl="/dashboard">
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </AdminRoute>
  );
}
