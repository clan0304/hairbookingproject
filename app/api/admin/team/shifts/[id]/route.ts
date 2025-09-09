/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/team/shifts/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DayType } from '@/types/database';

// Helper functions (same as in parent route)
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

// GET single shift
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: shift, error } = await supabaseAdmin
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
      .eq('id', id)
      .single();

    if (error || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    const calculations = await calculateShiftTotals(shift);

    return NextResponse.json({
      data: { ...shift, ...calculations },
    });
  } catch (error) {
    console.error('Error fetching shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update shift (clock out, update breaks, etc.)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await req.json();
    const { action, ...updateData } = body;

    // Handle specific actions
    if (action === 'clock_out') {
      const now = new Date().toISOString();

      // End any active break first
      const { data: shift } = await supabaseAdmin
        .from('shift_records')
        .select('breaks')
        .eq('id', id)
        .single();

      if (shift?.breaks) {
        const breaks = shift.breaks as any[];
        const activeBreakIndex = breaks.findIndex((b: any) => !b.end);

        if (activeBreakIndex !== -1) {
          breaks[activeBreakIndex].end = now;
          const duration =
            calculateHours(
              breaks[activeBreakIndex].start,
              breaks[activeBreakIndex].end
            ) * 60; // Convert to minutes
          breaks[activeBreakIndex].duration = Math.round(duration);

          // Update total break minutes
          const totalBreakMinutes = breaks.reduce(
            (sum: number, b: any) => sum + (b.duration || 0),
            0
          );

          updateData.breaks = breaks;
          updateData.total_break_minutes = totalBreakMinutes;
        }
      }

      updateData.shift_end = now;
      updateData.status = 'completed';
    }

    // Update shift
    const { data: updatedShift, error } = await supabaseAdmin
      .from('shift_records')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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

    const calculations = await calculateShiftTotals(updatedShift);

    return NextResponse.json({
      data: { ...updatedShift, ...calculations },
      message:
        action === 'clock_out'
          ? 'Clocked out successfully'
          : 'Shift updated successfully',
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE shift
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { error } = await supabaseAdmin
      .from('shift_records')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
