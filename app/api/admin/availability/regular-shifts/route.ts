// app/api/admin/availability/regular-shifts/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { addDays, addWeeks, format, parseISO } from 'date-fns';

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
      schedule_type,
      start_date,
      end_date,
      schedules,
    } = body;

    // Calculate all dates based on schedule type
    const startDate = parseISO(start_date);
    const endDate = end_date ? parseISO(end_date) : addWeeks(startDate, 12); // Default 12 weeks

    const slotsToCreate = [];
    const dayMap: Record<string, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0,
    };

    // Generate slots for each scheduled day
    for (const schedule of schedules) {
      const dayOfWeek = dayMap[schedule.day_of_week];
      let currentDate = new Date(startDate);

      // Find the first occurrence of this day of week
      while (currentDate.getDay() !== dayOfWeek) {
        currentDate = addDays(currentDate, 1);
      }

      // Generate slots based on schedule type
      while (currentDate <= endDate) {
        for (const slot of schedule.slots) {
          slotsToCreate.push({
            team_member_id,
            shop_id,
            date: format(currentDate, 'yyyy-MM-dd'),
            start_time: slot.start + ':00',
            end_time: slot.end + ':00',
            is_available: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        // Move to next occurrence based on schedule type
        if (schedule_type === 'everyWeek') {
          currentDate = addWeeks(currentDate, 1);
        } else if (schedule_type === 'everyTwoWeeks') {
          currentDate = addWeeks(currentDate, 2);
        } else if (schedule_type === 'everyMonth') {
          currentDate = addDays(currentDate, 28); // Approximate month
        }
      }
    }

    // Delete existing slots in the date range for this team member and shop
    await supabaseAdmin
      .from('availability_slots')
      .delete()
      .eq('team_member_id', team_member_id)
      .eq('shop_id', shop_id)
      .gte('date', start_date)
      .lte('date', format(endDate, 'yyyy-MM-dd'));

    // Insert new slots
    if (slotsToCreate.length > 0) {
      const { error } = await supabaseAdmin
        .from('availability_slots')
        .insert(slotsToCreate);

      if (error) {
        console.error('Error creating availability slots:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${slotsToCreate.length} availability slots`,
    });
  } catch (error) {
    console.error('Error creating regular shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
