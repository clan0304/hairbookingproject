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
      !body.starts_at ||
      !body.ends_at ||
      !body.duration ||
      body.price === undefined ||
      body.price === null
    ) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Generate booking number (format: BK-YYYYMMDD-XXXX)
    const dateStr = body.starts_at.split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${dateStr}-${randomNum}`;

    // Insert directly into bookings table with starts_at and ends_at
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_number: bookingNumber,
        client_id: client.id,
        team_member_id: body.team_member_id,
        shop_id: body.shop_id,
        service_id: body.service_id,
        variant_id: body.variant_id || null,
        starts_at: body.starts_at, // Using starts_at timestamp
        ends_at: body.ends_at, // Using ends_at timestamp
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
