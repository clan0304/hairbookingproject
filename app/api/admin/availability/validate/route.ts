/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { team_member_id, shop_id, date, start_time, end_time, exclude_id } =
      body;

    // Check 1: Team member is assigned to shop
    const { data: assignment } = await supabaseAdmin
      .from('shop_team_members')
      .select('*')
      .eq('team_member_id', team_member_id)
      .eq('shop_id', shop_id)
      .eq('is_active', true)
      .single();

    if (!assignment) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Team member is not assigned to this shop',
          error_code: 'NOT_ASSIGNED',
        },
        { status: 400 }
      );
    }

    // Check 2: Time validation
    if (start_time >= end_time) {
      return NextResponse.json(
        {
          valid: false,
          error: 'End time must be after start time',
          error_code: 'INVALID_TIME',
        },
        { status: 400 }
      );
    }

    // Check 3: Conflicts with other shops using database function
    const { data: conflicts } = await supabaseAdmin.rpc(
      'check_availability_conflict',
      {
        p_team_member_id: team_member_id,
        p_date: date,
        p_start_time: start_time,
        p_end_time: end_time,
        p_shop_id: shop_id,
        p_exclude_id: exclude_id || null,
      }
    );

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        {
          valid: false,
          error: `Conflict: Team member already scheduled at ${conflicts[0].conflicting_shop_name}`,
          error_code: 'CONFLICT',
          conflicts: conflicts.map((c: any) => ({
            shop_name: c.conflicting_shop_name,
            time: `${c.conflicting_start} - ${c.conflicting_end}`,
          })),
        },
        { status: 400 }
      );
    }

    // Check 4: Existing bookings (if updating/deleting)
    if (exclude_id) {
      const { data: slot } = await supabaseAdmin
        .from('availability_slots')
        .select('*')
        .eq('id', exclude_id)
        .single();

      if (slot) {
        const { data: bookings } = await supabaseAdmin
          .from('bookings')
          .select('id, booking_number, client_id')
          .eq('team_member_id', team_member_id)
          .eq('shop_id', shop_id)
          .gte('starts_at', `${date}T${slot.start_time}`)
          .lt('starts_at', `${date}T${slot.end_time}`)
          .in('status', ['confirmed']);

        if (bookings && bookings.length > 0) {
          return NextResponse.json(
            {
              valid: false,
              error: `Cannot modify: ${bookings.length} booking(s) exist in this time slot`,
              error_code: 'HAS_BOOKINGS',
              bookings_count: bookings.length,
            },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({
      valid: true,
      message: 'Availability is valid',
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
