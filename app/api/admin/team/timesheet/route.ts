/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/team/timesheet/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DayType } from '@/types/database';

// Helper functions
function calculateHours(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return (endTime - startTime) / (1000 * 60 * 60);
}

async function getDayType(date: string): Promise<DayType> {
  const { data: holiday } = await supabaseAdmin
    .from('public_holidays')
    .select('id')
    .eq('date', date)
    .eq('is_active', true)
    .single();

  if (holiday) return 'public_holiday';

  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0) return 'sunday';
  if (dayOfWeek === 6) return 'saturday';
  return 'weekday';
}

async function getHourlyRate(dayType: DayType): Promise<number> {
  const { data } = await supabaseAdmin
    .from('hourly_rates')
    .select('rate')
    .eq('day_type', dayType)
    .eq('is_active', true)
    .single();

  return data?.rate || 0;
}

async function calculateShiftTotals(shift: any) {
  const totalBreakMinutes = shift.total_break_minutes || 0;
  const paidBreakMinutes = Math.min(totalBreakMinutes, 20);
  const unpaidBreakMinutes = Math.max(totalBreakMinutes - 20, 0);

  if (!shift.shift_end) {
    return null; // Skip incomplete shifts in timesheet
  }

  const grossHours = calculateHours(shift.shift_start, shift.shift_end);
  const unpaidBreakHours = unpaidBreakMinutes / 60;
  const netHours = grossHours - unpaidBreakHours;

  const dayType = await getDayType(shift.date);
  const hourlyRate = await getHourlyRate(dayType);

  return {
    gross_hours: grossHours,
    total_break_minutes: totalBreakMinutes,
    paid_break_minutes: paidBreakMinutes,
    unpaid_break_minutes: unpaidBreakMinutes,
    net_hours: netHours,
    day_type: dayType,
    hourly_rate: hourlyRate,
    total_pay: netHours * hourlyRate,
  };
}

// GET timesheet data
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const teamMemberId = searchParams.get('team_member_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('shift_records')
      .select(
        `
        *,
        team_member:team_members (
          id,
          first_name,
          last_name,
          email,
          photo
        )
      `
      )
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'active'); // Exclude active shifts

    if (teamMemberId) {
      query = query.eq('team_member_id', teamMemberId);
    }

    const { data: shifts, error } = await query.order('date', {
      ascending: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate totals for each shift
    const timesheetData = await Promise.all(
      shifts.map(async (shift) => {
        const calculations = await calculateShiftTotals(shift);
        return calculations ? { ...shift, ...calculations } : null;
      })
    );

    // Filter out null values (incomplete shifts)
    const validShifts = timesheetData.filter((shift) => shift !== null);

    // Calculate summary
    const summary = validShifts.reduce(
      (acc, shift) => ({
        total_hours: acc.total_hours + (shift?.net_hours || 0),
        total_pay: acc.total_pay + (shift?.total_pay || 0),
        days_worked: acc.days_worked + 1,
        total_breaks: acc.total_breaks + (shift?.total_break_minutes || 0),
      }),
      {
        total_hours: 0,
        total_pay: 0,
        days_worked: 0,
        total_breaks: 0,
      }
    );

    // Group by team member if no specific member requested
    let response;
    if (!teamMemberId) {
      // Group shifts by team member
      const groupedShifts = validShifts.reduce((acc: any, shift: any) => {
        const memberId = shift.team_member_id;
        if (!acc[memberId]) {
          acc[memberId] = {
            team_member: shift.team_member,
            shifts: [],
            summary: {
              total_hours: 0,
              total_pay: 0,
              days_worked: 0,
              total_breaks: 0,
            },
          };
        }
        acc[memberId].shifts.push(shift);
        acc[memberId].summary.total_hours += shift.net_hours;
        acc[memberId].summary.total_pay += shift.total_pay;
        acc[memberId].summary.days_worked += 1;
        acc[memberId].summary.total_breaks += shift.total_break_minutes;
        return acc;
      }, {});

      response = {
        data: Object.values(groupedShifts),
        overall_summary: summary,
        period: { start_date: startDate, end_date: endDate },
      };
    } else {
      response = {
        shifts: validShifts,
        summary,
        period: { start_date: startDate, end_date: endDate },
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
