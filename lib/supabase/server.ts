// lib/supabase/server.ts

'use server';

import { createClient } from '@supabase/supabase-js';

// This is a simplified server client since we're using client components
// For server-side operations (like in API routes), we can use this
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}
