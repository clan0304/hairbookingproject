import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { addDays, format } from 'date-fns';

// Batch create availability for multiple team members
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { shop_id, team_member_ids, date_range, time_slots, days_of_week } =
      body;

    // Validate all team members are assigned to shop
    const { data: assignments } = await supabaseAdmin
      .from('shop_team_members')
      .select('team_member_id')
      .eq('shop_id', shop_id)
      .in('team_member_id', team_member_ids)
      .eq('is_active', true);

    const assignedIds = assignments?.map((a) => a.team_member_id) || [];
    const unassigned = team_member_ids.filter(
      (id: string) => !assignedIds.includes(id)
    );

    if (unassigned.length > 0) {
      return NextResponse.json(
        {
          error: 'Some team members are not assigned to this shop',
          unassigned_ids: unassigned,
        },
        { status: 400 }
      );
    }

    // Generate slots
    const slotsToCreate = [];
    const startDate = new Date(date_range.start);
    const endDate = new Date(date_range.end);
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      if (days_of_week.includes(dayOfWeek)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        for (const memberId of team_member_ids) {
          for (const slot of time_slots) {
            // Check for conflicts
            const { data: conflicts } = await supabaseAdmin.rpc(
              'check_availability_conflict',
              {
                p_team_member_id: memberId,
                p_date: dateStr,
                p_start_time: slot.start_time,
                p_end_time: slot.end_time,
                p_shop_id: shop_id,
                p_exclude_id: null,
              }
            );

            if (!conflicts || conflicts.length === 0) {
              slotsToCreate.push({
                team_member_id: memberId,
                shop_id,
                date: dateStr,
                start_time: slot.start_time + ':00',
                end_time: slot.end_time + ':00',
                is_available: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    if (slotsToCreate.length === 0) {
      return NextResponse.json({
        message: 'No slots created - all would conflict',
        created_count: 0,
      });
    }

    // Batch insert
    const { data, error } = await supabaseAdmin
      .from('availability_slots')
      .insert(slotsToCreate)
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: `Successfully created ${data.length} availability slots`,
      created_count: data.length,
      team_members_count: team_member_ids.length,
      date_range: { start: date_range.start, end: date_range.end },
    });
  } catch (error) {
    console.error('Batch create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
