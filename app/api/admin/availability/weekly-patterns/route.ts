// app/api/admin/availability/weekly-patterns/route.ts
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
    const teamMemberId = searchParams.get('team_member_id');
    const shopId = searchParams.get('shop_id');

    if (!teamMemberId || !shopId) {
      return NextResponse.json(
        { error: 'team_member_id and shop_id are required' },
        { status: 400 }
      );
    }

    // Get weekly patterns for the team member and shop
    const { data: patterns, error } = await supabaseAdmin
      .from('weekly_availability_patterns')
      .select('*')
      .eq('team_member_id', teamMemberId)
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time');

    if (error) {
      console.error('Error fetching weekly patterns:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Also get the most recent availability slots to infer schedule type
    const { data: recentSlots } = await supabaseAdmin
      .from('availability_slots')
      .select('date')
      .eq('team_member_id', teamMemberId)
      .eq('shop_id', shopId)
      .order('date', { ascending: false })
      .limit(20);

    // Try to detect the schedule pattern (weekly, bi-weekly, monthly)
    let scheduleType = 'everyWeek';
    if (recentSlots && recentSlots.length > 1) {
      // Simple heuristic: check if slots appear weekly or bi-weekly
      // This is a simplification - you might want more sophisticated logic
      const dates = recentSlots.map((s) => new Date(s.date).getTime());
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24));
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

      if (avgGap > 10 && avgGap < 17) {
        scheduleType = 'everyTwoWeeks';
      } else if (avgGap > 25) {
        scheduleType = 'everyMonth';
      }
    }

    return NextResponse.json({
      patterns,
      scheduleType,
      message:
        patterns.length > 0
          ? 'Weekly patterns found'
          : 'No weekly patterns found',
    });
  } catch (error) {
    console.error('Error in weekly patterns API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to clear patterns
export async function DELETE(req: Request) {
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
    const teamMemberId = searchParams.get('team_member_id');
    const shopId = searchParams.get('shop_id');

    if (!teamMemberId || !shopId) {
      return NextResponse.json(
        { error: 'team_member_id and shop_id are required' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const { error } = await supabaseAdmin
      .from('weekly_availability_patterns')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('team_member_id', teamMemberId)
      .eq('shop_id', shopId);

    if (error) {
      console.error('Error deleting weekly patterns:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly patterns cleared successfully',
    });
  } catch (error) {
    console.error('Error in delete weekly patterns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
