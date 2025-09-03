// app/api/admin/calendar/bookings/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const shopId = searchParams.get('shop_id');
    const teamMemberIds = searchParams.get('team_member_ids');

    // Build query for the bookings_with_local_times view
    let query = supabaseAdmin
      .from('bookings_with_local_times')
      .select('*')
      .in('status', ['confirmed', 'completed']);

    // Add date range filter
    if (startDate && endDate) {
      query = query
        .gte('booking_date_local', startDate)
        .lte('booking_date_local', endDate);
    }

    // Add shop filter
    if (shopId && shopId !== 'all') {
      query = query.eq('shop_id', shopId);
    }

    // Add team member filter
    if (teamMemberIds) {
      const ids = teamMemberIds.split(',');
      query = query.in('team_member_id', ids);
    }

    // Order by start time
    query = query.order('starts_at_local');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
