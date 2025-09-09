/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/team/shifts/[id]/break/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function calculateMinutes(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.round((endTime - startTime) / (1000 * 60)); // Convert ms to minutes
}

// POST start or end break
export async function POST(
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
    const { action } = body;

    if (!action || !['start', 'end'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "end"' },
        { status: 400 }
      );
    }

    // Get current shift
    const { data: shift, error: fetchError } = await supabaseAdmin
      .from('shift_records')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (shift.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only modify breaks for active shifts' },
        { status: 400 }
      );
    }

    const breaks = shift.breaks || [];
    const now = new Date().toISOString();

    if (action === 'start') {
      // Check if there's already an active break
      const activeBreak = breaks.find((b: any) => !b.end);
      if (activeBreak) {
        return NextResponse.json(
          { error: 'There is already an active break' },
          { status: 400 }
        );
      }

      // Add new break
      breaks.push({
        start: now,
        end: null,
        duration: 0,
      });
    } else if (action === 'end') {
      // Find active break
      const activeBreakIndex = breaks.findIndex((b: any) => !b.end);
      if (activeBreakIndex === -1) {
        return NextResponse.json(
          { error: 'No active break to end' },
          { status: 400 }
        );
      }

      // End the break and calculate duration
      breaks[activeBreakIndex].end = now;
      breaks[activeBreakIndex].duration = calculateMinutes(
        breaks[activeBreakIndex].start,
        now
      );
    }

    // Calculate total break minutes
    const totalBreakMinutes = breaks.reduce(
      (sum: number, b: any) => sum + (b.duration || 0),
      0
    );

    // Update shift
    const { data: updatedShift, error: updateError } = await supabaseAdmin
      .from('shift_records')
      .update({
        breaks,
        total_break_minutes: totalBreakMinutes,
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

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      data: updatedShift,
      message: action === 'start' ? 'Break started' : 'Break ended',
    });
  } catch (error) {
    console.error('Error managing break:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
