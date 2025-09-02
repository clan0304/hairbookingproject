// app/api/public/booking/reserve/route.ts
// ============================================
// Create or update a temporary reservation for a time slot
// ============================================
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { addMinutes } from 'date-fns';

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
    const {
      team_member_id,
      shop_id,
      service_id,
      date,
      start_time,
      duration,
      session_id,
    } = body;

    if (
      !team_member_id ||
      !shop_id ||
      !service_id ||
      !date ||
      !start_time ||
      !duration ||
      !session_id
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Calculate end time
    const [hours, minutes] = start_time.split(':');
    const startDate = new Date();
    startDate.setHours(parseInt(hours), parseInt(minutes), 0);
    const endDate = addMinutes(startDate, duration);
    const end_time = `${endDate
      .getHours()
      .toString()
      .padStart(2, '0')}:${endDate
      .getMinutes()
      .toString()
      .padStart(2, '0')}:00`;

    // Set reservation to expire in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // First, delete any existing reservations for this session
    await supabase
      .from('booking_reservations')
      .delete()
      .eq('session_id', session_id);

    // Create new reservation
    const { data, error } = await supabase
      .from('booking_reservations')
      .insert({
        team_member_id,
        shop_id,
        service_id,
        date,
        start_time: `${start_time}:00`,
        end_time,
        session_id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      return NextResponse.json(
        { error: 'Failed to reserve time slot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        reservation_id: data.id,
        expires_at: data.expires_at,
        message: 'Time slot reserved for 10 minutes',
      },
    });
  } catch (error) {
    console.error('Error in reservation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Release a reservation
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('booking_reservations')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error releasing reservation:', error);
      return NextResponse.json(
        { error: 'Failed to release reservation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Reservation released successfully',
    });
  } catch (error) {
    console.error('Error releasing reservation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
