// app/api/public/booking/create/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    // Verify authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const supabase = createServerClient();

    // Get client ID from the authenticated user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (
      !body.team_member_id ||
      !body.shop_id ||
      !body.service_id ||
      !body.booking_date ||
      !body.start_time ||
      !body.duration ||
      !body.price
    ) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Create booking using the Supabase function
    const { data, error } = await supabase.rpc('create_booking_from_local', {
      p_client_id: client.id, // Use the authenticated user's client ID
      p_team_member_id: body.team_member_id,
      p_shop_id: body.shop_id,
      p_service_id: body.service_id,
      p_booking_date: body.booking_date,
      p_start_time: body.start_time,
      p_duration: body.duration,
      p_price: body.price,
      p_variant_id: body.variant_id || null,
      p_booking_note: body.booking_note || null, // Optional special requests
    });

    if (error) {
      console.error('Booking creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get the created booking details
    const { data: booking } = await supabase
      .from('bookings_with_local_times')
      .select('*')
      .eq('id', data)
      .single();

    // TODO: Send confirmation email to the client
    // You can use a service like SendGrid, Resend, or Supabase Edge Functions

    return NextResponse.json({
      data: booking,
      message: 'Booking confirmed successfully',
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
