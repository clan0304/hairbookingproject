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

    // Extract date and time from the starts_at string
    // Body contains starts_at like "2025-09-05T14:00:00"
    const [dateStr, timeWithSeconds] = body.starts_at.split('T');
    const timeStr = timeWithSeconds.substring(0, 8); // Get HH:mm:ss

    // Use the database function that handles timezone conversion
    const { data: bookingId, error: bookingError } = await supabase.rpc(
      'create_booking_from_local',
      {
        p_client_id: client.id,
        p_team_member_id: body.team_member_id,
        p_shop_id: body.shop_id,
        p_service_id: body.service_id,
        p_booking_date: dateStr, // YYYY-MM-DD
        p_start_time: timeStr, // HH:mm:ss
        p_duration: body.duration,
        p_price: body.price,
        p_variant_id: body.variant_id || null,
        p_booking_note: body.booking_note || null,
      }
    );

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { error: bookingError.message },
        { status: 400 }
      );
    }

    // Get the full booking details for the response
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        clients!inner (
          first_name,
          last_name,
          email,
          phone
        ),
        team_members!inner (
          first_name,
          last_name
        ),
        services!inner (
          name
        ),
        shops!inner (
          name,
          address
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('Error fetching booking details:', fetchError);
      // Still return success but with minimal data
      return NextResponse.json({
        data: {
          id: bookingId,
          booking_number: 'BK-' + Date.now(), // Fallback booking number
        },
        message: 'Booking confirmed successfully',
      });
    }

    // Release any temporary reservations for this session
    if (body.session_id) {
      await supabase
        .from('booking_reservations')
        .delete()
        .eq('session_id', body.session_id);
    }

    // TODO: Send confirmation email to the client
    // You can use a service like SendGrid, Resend, or Supabase Edge Functions

    return NextResponse.json({
      data: {
        ...booking,
        booking_number: booking.booking_number,
        // Include additional details if needed
        client_name: booking.clients?.first_name,
        team_member_name: booking.team_members?.first_name,
        service_name: booking.services?.name,
      },
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
