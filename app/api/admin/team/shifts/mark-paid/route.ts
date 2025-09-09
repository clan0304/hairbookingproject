// app/api/admin/team/shifts/mark-paid/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST mark shifts as paid
export async function POST(req: Request) {
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

    const body = await req.json();
    const { shift_ids } = body;

    if (!shift_ids || !Array.isArray(shift_ids) || shift_ids.length === 0) {
      return NextResponse.json(
        { error: 'shift_ids array is required' },
        { status: 400 }
      );
    }

    // Update shifts to paid status
    const { data: updatedShifts, error } = await supabaseAdmin
      .from('shift_records')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .in('id', shift_ids)
      .eq('status', 'completed') // Only update completed shifts
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!updatedShifts || updatedShifts.length === 0) {
      return NextResponse.json(
        { error: 'No completed shifts found to mark as paid' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: updatedShifts,
      message: `${updatedShifts.length} shift(s) marked as paid`,
    });
  } catch (error) {
    console.error('Error marking shifts as paid:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
