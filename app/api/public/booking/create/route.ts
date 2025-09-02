// app/api/public/booking/create/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createServerClient();

    // Create booking using the Supabase function
    const { data, error } = await supabase.rpc('create_booking_from_local', {
      p_client_id: body.client_id,
      p_team_member_id: body.team_member_id,
      p_shop_id: body.shop_id,
      p_service_id: body.service_id,
      p_booking_date: body.booking_date,
      p_start_time: body.start_time,
      p_duration: body.duration,
      p_price: body.price,
      p_variant_id: body.variant_id || null,
      p_booking_note: body.client_note || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get the created booking details
    const { data: booking } = await supabase
      .from('bookings_with_local_times')
      .select('*')
      .eq('id', data)
      .single();

    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
