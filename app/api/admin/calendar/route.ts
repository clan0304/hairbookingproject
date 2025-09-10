// app/api/admin/calendar/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { format, addMinutes } from 'date-fns';

// GET - Fetch bookings for calendar view
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shop_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');
    const teamMemberIds = searchParams.get('team_member_ids');

    if (!shopId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Use the VIEW instead of complex joins
    let query = supabaseAdmin
      .from('bookings_with_local_times')
      .select('*')
      .eq('shop_id', shopId)
      .gte('booking_date_local', startDate)
      .lte('booking_date_local', endDate)
      .order('starts_at_local', { ascending: true });

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Add team member filter if provided
    if (teamMemberIds) {
      const memberIds = teamMemberIds.split(',');
      query = query.in('team_member_id', memberIds);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Transform the VIEW data for compatibility
    const transformedBookings =
      bookings?.map((booking) => ({
        // Core booking data
        id: booking.id,
        booking_number: booking.booking_number,
        client_id: booking.client_id,
        team_member_id: booking.team_member_id,
        shop_id: booking.shop_id,
        service_id: booking.service_id,
        variant_id: booking.variant_id,

        // Timestamps (both UTC and local)
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        starts_at_local: booking.starts_at_local,
        ends_at_local: booking.ends_at_local,

        // Date and time components for display
        booking_date: booking.booking_date_local,
        start_time: booking.start_time_local,
        end_time: booking.end_time_local,

        // Booking details
        duration: booking.duration,
        price: booking.price,
        status: booking.status,
        booking_note: booking.booking_note,

        // Timestamps for status changes
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        cancelled_at: booking.cancelled_at,
        cancelled_reason: booking.cancelled_reason,
        completed_at: booking.completed_at,
        no_show_at: booking.no_show_at,

        // Client info (from VIEW)
        client_first_name: booking.client_first_name,
        client_last_name: booking.client_last_name,
        client_email: booking.client_email,
        client_phone: booking.client_phone,

        // Team member info (from VIEW)
        team_member_first_name: booking.team_member_first_name,
        team_member_last_name: booking.team_member_last_name,
        team_member_photo: booking.team_member_photo,

        // Shop info (from VIEW)
        shop_name: booking.shop_name,
        shop_timezone: booking.shop_timezone,

        // Service info (from VIEW)
        service_name: booking.service_name,
        category_name: booking.category_name,
        category_color: booking.category_color,
        variant_name: booking.variant_name,
      })) || [];

    return NextResponse.json({
      data: transformedBookings,
      count: transformedBookings.length,
    });
  } catch (error) {
    console.error('Error in calendar API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new booking
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    console.log('Creating booking with data:', body);

    const {
      shop_id,
      team_member_id,
      booking_date,
      start_time,
      duration,
      price,
      notes,
      serviceId,
      clientId,
      clientName,
      clientEmail,
      clientPhone,
    } = body;

    // Validate required fields
    if (
      !shop_id ||
      !team_member_id ||
      !booking_date ||
      !start_time ||
      !serviceId
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle client - either use existing or create new
    let finalClientId = clientId;

    if (!clientId && clientName) {
      // Create a new client if no ID provided but name is given
      const nameParts = clientName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName || null,
          email: clientEmail || null,
          phone: clientPhone || null,
          is_authenticated: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        return NextResponse.json(
          { error: 'Failed to create client' },
          { status: 400 }
        );
      }

      finalClientId = newClient.id;
    }

    if (!finalClientId) {
      return NextResponse.json(
        { error: 'Client information is required' },
        { status: 400 }
      );
    }

    // Calculate end time
    const [hours, minutes] = start_time.split(':').map(Number);
    const startDateTime = new Date();
    startDateTime.setHours(hours, minutes, 0, 0);
    const endDateTime = addMinutes(startDateTime, duration || 60);
    const end_time = format(endDateTime, 'HH:mm');

    // Generate booking number
    const bookingNumber = `BK${Date.now().toString(36).toUpperCase()}`;

    // Create timestamps for the booking
    const bookingDateObj = new Date(booking_date);
    const starts_at = new Date(
      bookingDateObj.getFullYear(),
      bookingDateObj.getMonth(),
      bookingDateObj.getDate(),
      hours,
      minutes
    ).toISOString();

    const ends_at = new Date(
      bookingDateObj.getFullYear(),
      bookingDateObj.getMonth(),
      bookingDateObj.getDate(),
      endDateTime.getHours(),
      endDateTime.getMinutes()
    ).toISOString();

    // Check for conflicts
    const { data: conflicts } = await supabaseAdmin
      .from('bookings')
      .select('booking_number')
      .eq('team_member_id', team_member_id)
      .eq('booking_date', booking_date)
      .neq('status', 'cancelled')
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Time slot conflict',
          conflicts: conflicts.map((c) => c.booking_number),
        },
        { status: 400 }
      );
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        booking_number: bookingNumber,
        client_id: finalClientId,
        team_member_id,
        shop_id,
        service_id: serviceId,
        variant_id: null, // Can be added later if needed
        booking_date,
        start_time,
        end_time,
        starts_at,
        ends_at,
        duration: duration || 60,
        price: price || 0,
        status: 'confirmed',
        booking_note: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { error: bookingError.message },
        { status: 400 }
      );
    }

    console.log('Booking created successfully:', booking);

    return NextResponse.json({
      data: booking,
      message: 'Booking created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
