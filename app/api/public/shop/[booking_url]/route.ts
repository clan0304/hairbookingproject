// app/api/public/shop/[booking_url]/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ booking_url: string }> }
) {
  try {
    // Await params first
    const { booking_url } = await params;
    const supabase = createServerClient();

    // Get shop info by booking URL
    const { data, error } = await supabase
      .from('shops')
      .select('id, name, address, phone')
      .eq('booking_url', booking_url)
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
