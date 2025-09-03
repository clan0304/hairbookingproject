// app/api/public/booking/create/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { addMinutes, format } from 'date-fns';

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
      body.price === undefined ||
      body.price === null
    ) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Ensure start_time is in proper format (HH:mm:ss)
    let formattedStartTime = body.start_time;
    if (!formattedStartTime.includes(':')) {
      formattedStartTime = `${formattedStartTime}:00`;
    }
    if (formattedStartTime.split(':').length === 2) {
      formattedStartTime = `${formattedStartTime}:00`;
    }

    // Calculate end time based on start time and duration
    const [hours, minutes] = formattedStartTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, body.duration);
    const endTime = format(endDate, 'HH:mm:ss');

    // Generate booking number (format: BK-YYYYMMDD-XXXX)
    const dateStr = body.booking_date.replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${dateStr}-${randomNum}`;

    // Insert directly into bookings table
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_number: bookingNumber,
        client_id: client.id,
        team_member_id: body.team_member_id,
        shop_id: body.shop_id,
        service_id: body.service_id,
        variant_id: body.variant_id || null,
        booking_date: body.booking_date,
        start_time: formattedStartTime,
        end_time: endTime,
        duration: body.duration,
        price: body.price,
        status: 'confirmed',
        booking_note: body.booking_note || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { error: bookingError.message },
        { status: 400 }
      );
    }

    // Release any temporary reservations for this session
    if (body.session_id) {
      await supabase
        .from('booking_reservations')
        .delete()
        .eq('session_id', body.session_id);
    }

    // Get the created booking details with additional info
    const { data: bookingDetails } = await supabase
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
      .eq('id', booking.id)
      .single();

    // TODO: Send confirmation email to the client
    // You can use a service like SendGrid, Resend, or Supabase Edge Functions

    return NextResponse.json({
      data: {
        ...booking,
        booking_number: bookingNumber,
        // Include additional details if needed
        client_name: bookingDetails?.clients?.first_name,
        team_member_name: bookingDetails?.team_members?.first_name,
        service_name: bookingDetails?.services?.name,
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
