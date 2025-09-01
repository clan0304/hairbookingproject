// hooks/useRole.ts
// ============================================
'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRole() {
  const { isLoaded, userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      if (!isLoaded) return;

      if (!userId) {
        console.log('No userId found');
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_id', userId)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setIsAdmin(false);
        } else {
          console.log('User role data:', data);
          setIsAdmin(data?.role === 'admin');
        }
      } catch (err) {
        console.error('Unexpected error in checkRole:', err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkRole();
  }, [isLoaded, userId]);

  return { isAdmin, isLoading };
}
