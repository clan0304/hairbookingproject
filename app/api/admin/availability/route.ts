// app/api/admin/availability/route.ts
// ============================================
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const shopId = searchParams.get('shop_id');
    const teamMemberId = searchParams.get('team_member_id');

    let query = supabaseAdmin
      .from('availability_slots')
      .select('*')
      .eq('is_available', true);

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    if (shopId && shopId !== 'all') {
      query = query.eq('shop_id', shopId);
    }

    if (teamMemberId && teamMemberId !== 'all') {
      query = query.eq('team_member_id', teamMemberId);
    }

    const { data, error } = await query.order('date').order('start_time');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: `${error} Internal server error` },
      { status: 500 }
    );
  }
}

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
    const {
      team_member_id,
      shop_id,
      is_recurring,
      start_date,
      end_date,
      single_date,
      days_of_week,
      start_time,
      end_time,
    } = body;

    if (is_recurring) {
      // Generate recurring slots
      const { error } = await supabaseAdmin.rpc(
        'generate_recurring_availability',
        {
          p_team_member_id: team_member_id,
          p_shop_id: shop_id,
          p_start_date: start_date,
          p_end_date: end_date,
          p_days_of_week: days_of_week,
          p_start_time: start_time,
          p_end_time: end_time,
        }
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      // Create single slot
      const { error } = await supabaseAdmin.from('availability_slots').insert({
        team_member_id,
        shop_id,
        date: single_date,
        start_time,
        end_time,
        is_available: true,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `${error} Internal server error` },
      { status: 500 }
    );
  }
}
