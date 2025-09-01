// app/api/public/shop/[booking_url]/route.ts
// (New API route to get shop info by booking URL)
// ============================================
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: { booking_url: string } }
) {
  try {
    // Get shop info by booking URL
    const { data, error } = await supabase
      .from('shops')
      .select('id, name, address, phone')
      .eq('booking_url', params.booking_url)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
