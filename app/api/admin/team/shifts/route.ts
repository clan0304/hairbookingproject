// app/api/admin/team/shifts/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DayType } from '@/types/database';

// Helper function to calculate hours between timestamps
function calculateHours(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours
}

// Helper function to get day type
async function getDayType(date: string): Promise<DayType> {
  // Check if it's a public holiday
  const { data: holiday } = await supabaseAdmin
    .from('public_holidays')
    .select('id')
    .eq('date', date)
    .eq('is_active', true)
    .single();

  if (holiday) return 'public_holiday';

  // Check day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0) return 'sunday';
  if (dayOfWeek === 6) return 'saturday';
  return 'weekday';
}

// Helper function to get hourly rate
async function getHourlyRate(dayType: DayType): Promise<number> {
  const { data } = await supabaseAdmin
    .from('hourly_rates')
    .select('rate')
    .eq('day_type', dayType)
    .eq('is_active', true)
    .single();

  return data?.rate || 0;
}

// Helper function to calculate shift totals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function calculateShiftTotals(shift: any) {
  // Calculate break times
  const totalBreakMinutes = shift.total_break_minutes || 0;
  const paidBreakMinutes = Math.min(totalBreakMinutes, 20);
  const unpaidBreakMinutes = Math.max(totalBreakMinutes - 20, 0);

  // If shift not ended, return partial calculation
  if (!shift.shift_end) {
    const currentHours = calculateHours(
      shift.shift_start,
      new Date().toISOString()
    );
    const unpaidBreakHours = unpaidBreakMinutes / 60;
    const netHours = currentHours - unpaidBreakHours;

    const dayType = await getDayType(shift.date);
    const hourlyRate = await getHourlyRate(dayType);

    return {
      gross_hours: currentHours,
      total_break_minutes: totalBreakMinutes,
      paid_break_minutes: paidBreakMinutes,
      unpaid_break_minutes: unpaidBreakMinutes,
      net_hours: netHours,
      day_type: dayType,
      hourly_rate: hourlyRate,
      total_pay: netHours * hourlyRate,
    };
  }

  // Calculate completed shift
  const grossHours = calculateHours(shift.shift_start, shift.shift_end);
  const unpaidBreakHours = unpaidBreakMinutes / 60;
  const netHours = grossHours - unpaidBreakHours;

  // Get day type and rate
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

// GET all shifts with optional filters
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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const teamMemberId = searchParams.get('team_member_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabaseAdmin.from('shift_records').select(`
        *,
        team_member:team_members (
          id,
          first_name,
          last_name,
          email,
          photo
        )
      `);

    // Apply filters
    if (status) query = query.eq('status', status);
    if (date) query = query.eq('date', date);
    if (teamMemberId) query = query.eq('team_member_id', teamMemberId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    // Execute query
    const { data: shifts, error } = await query.order('date', {
      ascending: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate totals for each shift
    const enrichedShifts = await Promise.all(
      shifts.map(async (shift) => {
        const calculations = await calculateShiftTotals(shift);
        return {
          ...shift,
          ...calculations,
        };
      })
    );

    return NextResponse.json({ data: enrichedShifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new shift (clock in)
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
    const { team_member_id, shift_start, date } = body;

    if (!team_member_id) {
      return NextResponse.json(
        { error: 'Team member ID is required' },
        { status: 400 }
      );
    }

    // Check if there's already an active shift for this team member
    const { data: activeShift } = await supabaseAdmin
      .from('shift_records')
      .select('id')
      .eq('team_member_id', team_member_id)
      .eq('status', 'active')
      .single();

    if (activeShift) {
      return NextResponse.json(
        { error: 'Team member already has an active shift' },
        { status: 400 }
      );
    }

    // Create new shift
    const now = new Date();
    const shiftData = {
      team_member_id,
      date: date || now.toISOString().split('T')[0],
      shift_start: shift_start || now.toISOString(),
      status: 'active',
      breaks: [],
      total_break_minutes: 0,
    };

    const { data: newShift, error } = await supabaseAdmin
      .from('shift_records')
      .insert(shiftData)
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
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate initial totals
    const calculations = await calculateShiftTotals(newShift);

    return NextResponse.json({
      data: { ...newShift, ...calculations },
      message: 'Shift started successfully',
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
