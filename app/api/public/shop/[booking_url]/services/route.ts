// app/api/public/shop/[booking_url]/services/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// ... your type definitions ...

export async function GET(
  req: Request,
  { params }: { params: Promise<{ booking_url: string }> }
) {
  try {
    // Await params first
    const { booking_url } = await params;
    const supabase = createServerClient();

    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('booking_url', booking_url)
      .eq('is_active', true)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // ... rest of your code
  } catch (error) {
    console.error('Error fetching shop services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
