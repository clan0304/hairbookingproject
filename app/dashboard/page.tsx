// app/dashboard/page.tsx
// ============================================
'use client';

import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/hooks/useRole';
import type { User, Client } from '@/types/database';
import Image from 'next/image';

export default function Dashboard() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const { isAdmin } = useRole();
  const [userData, setUserData] = useState<User | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/auth');
    }
  }, [isLoaded, userId, router]);

  useEffect(() => {
    if (isLoaded && isAdmin) {
      router.push('/admin');
    }
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;

      const supabase = createClient();

      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single();

      // Get client data
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('clerk_id', userId)
        .single();

      setUserData(user);
      setClientData(client);
      setLoading(false);
    }

    if (userId) {
      fetchData();
    }
  }, [userId]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Prioritize users table data for authenticated users
  const displayData = {
    first_name: userData?.first_name || clientData?.first_name || '',
    last_name: userData?.last_name || clientData?.last_name || '',
    email: userData?.email || clientData?.email || '',
    phone: userData?.phone || clientData?.phone || '',
    photo: userData?.photo || clientData?.photo || null,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Client Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {displayData.email}
              </span>
              <UserButton afterSignOutUrl="/auth" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Welcome to your Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You have successfully signed in with Google OAuth.
              </p>

              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Your Profile Information
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {displayData.first_name} {displayData.last_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Email
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {displayData.email}
                    </dd>
                  </div>
                  {displayData.phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Phone
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {displayData.phone}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </dt>
                    <dd className="mt-1 text-sm">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200">
                        Authenticated
                      </span>
                    </dd>
                  </div>
                  {displayData.photo && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Photo
                      </dt>
                      <dd className="mt-1">
                        <Image
                          src={displayData.photo}
                          alt="Profile"
                          className="h-10 w-10 rounded-full"
                        />
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
