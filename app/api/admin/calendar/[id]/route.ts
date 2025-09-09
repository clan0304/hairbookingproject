// app/api/admin/calendar/[id]/route.ts
// ============================================
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Get the timezone offset (in ms) for a given instant and IANA time zone,
 * using built-in Intl APIs (no date-fns-tz).
 */
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const { type, value } of parts) map[type] = value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  // "UTC-like timestamp from parts" minus the real timestamp = offset
  return asUTC - instant.getTime();
}

/**
 * Convert a shop-local wall time (date + "HH:mm" or "HH:mm:ss")
 * in IANA time zone -> UTC Date (instant).
 * Two-pass correction handles DST transitions.
 */
function zonedLocalToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date {
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const [hh, mm = '0', ss = '0'] = timeStr.split(':');
  const h = Number(hh ?? '0');
  const mi = Number(mm ?? '0');
  const s = Number(ss ?? '0');

  // Treat wall time as if it were UTC to get a baseline timestamp.
  const t0 = Date.UTC(y, (m || 1) - 1, d || 1, h || 0, mi || 0, s || 0);

  // First pass: subtract offset at this instant
  const offset = getTimeZoneOffsetMs(new Date(t0), timeZone);
  let t1 = t0 - offset;

  // Second pass: in case DST causes different offset after the first adjustment
  const offset2 = getTimeZoneOffsetMs(new Date(t1), timeZone);
  if (offset2 !== offset) {
    t1 = t0 - offset2;
  }
  return new Date(t1);
}

// PATCH endpoint to update booking time and/or team member (drag & drop)
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
    const { team_member_id, date, start_time, end_time, duration } = body;

    // Validate required fields
    if (!date || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Date, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Get the existing booking (we need shop_id at least)
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error('Error fetching booking:', fetchError);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Resolve shop timezone to interpret local wall times
    const { data: shop, error: shopErr } = await supabaseAdmin
      .from('shops')
      .select('timezone')
      .eq('id', existingBooking.shop_id)
      .single();

    if (shopErr || !shop?.timezone) {
      console.error('Shop timezone fetch error:', shopErr);
      return NextResponse.json(
        { error: 'Shop timezone not found' },
        { status: 400 }
      );
    }

    const tz = shop.timezone as string; // e.g., 'Australia/Melbourne'

    // Convert provided local times in shop TZ -> UTC instants (ISO strings)
    const startsAtUtc = zonedLocalToUtc(date, start_time, tz);
    const endsAtUtc = zonedLocalToUtc(date, end_time, tz);
    const startsAtUtcStr = startsAtUtc.toISOString();
    const endsAtUtcStr = endsAtUtc.toISOString();

    // Check for conflicts against other bookings (compare in UTC)
    const checkTeamMemberId = team_member_id || existingBooking.team_member_id;

    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_number')
      .eq('status', 'confirmed')
      .eq('team_member_id', checkTeamMemberId)
      .neq('id', bookingId)
      // overlap window as in your original logic
      .gte('ends_at', startsAtUtcStr)
      .lte('starts_at', endsAtUtcStr);

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
          conflicts: conflicts.map((c) => c.booking_number),
        },
        { status: 409 }
      );
    }

    // Prepare update payload (store UTC in timestamptz columns)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      starts_at: startsAtUtcStr,
      ends_at: endsAtUtcStr,
      updated_at: new Date().toISOString(),
    };

    // Only update team member if provided and different
    if (team_member_id && team_member_id !== existingBooking.team_member_id) {
      updateData.team_member_id = team_member_id;

      // If new team member has a custom price for this service, apply it
      const { data: teamMemberService } = await supabaseAdmin
        .from('team_member_services')
        .select('price')
        .eq('team_member_id', team_member_id)
        .eq('service_id', existingBooking.service_id)
        .single();

      if (teamMemberService?.price) {
        updateData.price = teamMemberService.price;
      }
    }

    // Update duration only if different
    if (duration && duration !== existingBooking.duration) {
      updateData.duration = duration;
    }

    // Persist update
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
      message: 'Booking updated successfully',
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
      updated_at: new Date().toISOString(),
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
      message: 'Booking updated successfully',
    });
  } catch (error) {
    console.error('Error in booking update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to cancel/delete a booking
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

    // Soft delete - update status to cancelled
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Cancelled by admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Error cancelling booking:', error);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('Error in booking cancellation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
