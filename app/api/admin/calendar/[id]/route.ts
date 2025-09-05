// app/api/admin/calendar/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { format } from 'date-fns';

// PATCH endpoint to update booking time and/or team member
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const params = await context.params;
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      team_member_id,
      date,
      start_time,
      end_time,
      duration
    } = body;

    // Validate required fields
    if (!date || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Date, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Get the existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error('Error fetching booking:', fetchError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Parse the date and times
    const bookingDate = new Date(date + 'T00:00:00');
    
    // Create datetime strings in local time
    const [startHours, startMinutes] = start_time.split(':');
    const [endHours, endMinutes] = end_time.split(':');
    
    // Create local datetime strings
    const startsAtLocal = new Date(bookingDate);
    startsAtLocal.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
    
    const endsAtLocal = new Date(bookingDate);
    endsAtLocal.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

    // Format for database
    const startsAtLocalStr = format(startsAtLocal, "yyyy-MM-dd'T'HH:mm:ss");
    const endsAtLocalStr = format(endsAtLocal, "yyyy-MM-dd'T'HH:mm:ss");

    // Check for conflicts with other bookings
    const checkTeamMemberId = team_member_id || existingBooking.team_member_id;
    
    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_number')
      .eq('status', 'confirmed')
      .eq('team_member_id', checkTeamMemberId)
      .neq('id', bookingId)
      .gte('ends_at', startsAtLocalStr)
      .lte('starts_at', endsAtLocalStr);

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Time slot is not available',
          conflicts: conflicts.map(c => c.booking_number)
        },
        { status: 409 }
      );
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      starts_at: startsAtLocalStr,
      ends_at: endsAtLocalStr,
      updated_at: new Date().toISOString()
    };

    // Only update team member if provided and different
    if (team_member_id && team_member_id !== existingBooking.team_member_id) {
      updateData.team_member_id = team_member_id;
      
      // Check if new team member has this service with custom price
      const { data: teamMemberService } = await supabaseAdmin
        .from('team_member_services')
        .select('custom_price')
        .eq('team_member_id', team_member_id)
        .eq('service_id', existingBooking.service_id)
        .single();

      // Update price if team member has custom price
      if (teamMemberService?.custom_price) {
        updateData.price = teamMemberService.custom_price;
      }
    }

    // Only update duration if it's different
    if (duration && duration !== existingBooking.duration) {
      updateData.duration = duration;
    }

    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: updatedBooking,
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error('Error in booking update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT endpoint for full booking update (including status changes)
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const params = await context.params;
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Full update including status changes
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };

    // Handle status-specific timestamps
    if (body.status === 'cancelled' && !body.cancelled_at) {
      updateData.cancelled_at = new Date().toISOString();
    }
    if (body.status === 'completed' && !body.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    if (body.status === 'no_show' && !body.no_show_at) {
      updateData.no_show_at = new Date().toISOString();
    }

    const { data: updatedBooking, error } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: updatedBooking,
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error('Error in booking update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to cancel a booking
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const params = await context.params;
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by updating status to cancelled
    const { data: cancelledBooking, error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Cancelled by admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling booking:', error);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: cancelledBooking,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Error in booking cancellation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}