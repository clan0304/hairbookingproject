// app/api/admin/team/[id]/shops/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET all shops a team member is assigned to
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

    // Check admin role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all shop assignments for this team member
    const { data, error } = await supabaseAdmin
      .from('shop_team_members')
      .select(
        `
        *,
        shops!inner(
          id,
          name,
          address,
          phone,
          timezone,
          image,
          is_active
        )
      `
      )
      .eq('team_member_id', id)
      .eq('is_active', true)
      .order('shops(name)');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get availability summary for each shop
    const shopsWithAvailability = await Promise.all(
      data.map(async (assignment) => {
        // Get upcoming availability slots
        const { data: availability } = await supabaseAdmin
          .from('availability_slots')
          .select('date, start_time, end_time')
          .eq('team_member_id', id)
          .eq('shop_id', assignment.shop_id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date')
          .limit(10);

        // Get weekly patterns if they exist
        const { data: weeklyPatterns } = await supabaseAdmin
          .from('weekly_availability_patterns')
          .select('*')
          .eq('team_member_id', id)
          .eq('shop_id', assignment.shop_id)
          .eq('is_active', true)
          .order('day_of_week');

        // Calculate total hours for next 7 days
        const next7Days = new Date();
        next7Days.setDate(next7Days.getDate() + 7);

        const { data: weekHours } = await supabaseAdmin
          .from('availability_slots')
          .select('start_time, end_time')
          .eq('team_member_id', id)
          .eq('shop_id', assignment.shop_id)
          .gte('date', new Date().toISOString().split('T')[0])
          .lte('date', next7Days.toISOString().split('T')[0]);

        let totalWeekHours = 0;
        if (weekHours) {
          weekHours.forEach((slot) => {
            const start = new Date(`2000-01-01T${slot.start_time}`);
            const end = new Date(`2000-01-01T${slot.end_time}`);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            totalWeekHours += hours;
          });
        }

        return {
          shop_id: assignment.shop_id,
          shop_name: assignment.shops?.name,
          shop_address: assignment.shops?.address,
          shop_phone: assignment.shops?.phone,
          shop_timezone: assignment.shops?.timezone,
          shop_image: assignment.shops?.image,
          is_active: assignment.is_active,
          assigned_at: assignment.created_at,
          upcoming_availability: availability || [],
          weekly_patterns: weeklyPatterns || [],
          total_week_hours: totalWeekHours,
          availability_count: availability?.length || 0,
        };
      })
    );

    // Get team member details
    const { data: teamMember } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({
      data: {
        team_member: teamMember,
        shops: shopsWithAvailability,
        total_shops: data.length,
      },
    });
  } catch (error) {
    console.error('Error fetching team member shops:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update team member shop assignments
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
    const { shop_ids } = body;

    if (!Array.isArray(shop_ids)) {
      return NextResponse.json(
        { error: 'shop_ids must be an array' },
        { status: 400 }
      );
    }

    // Deactivate all existing shop assignments
    const { error: deactivateError } = await supabaseAdmin
      .from('shop_team_members')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('team_member_id', id);

    if (deactivateError) {
      return NextResponse.json(
        { error: deactivateError.message },
        { status: 400 }
      );
    }

    // Create new assignments
    if (shop_ids.length > 0) {
      const assignments = shop_ids.map((shop_id) => ({
        team_member_id: id,
        shop_id,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabaseAdmin
        .from('shop_team_members')
        .upsert(assignments, {
          onConflict: 'shop_id,team_member_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 400 }
        );
      }
    }

    // Return updated list
    const { data: updatedAssignments } = await supabaseAdmin
      .from('shop_team_members')
      .select(
        `
        *,
        shops!inner(name, address)
      `
      )
      .eq('team_member_id', id)
      .eq('is_active', true);

    return NextResponse.json({
      data: updatedAssignments,
      message: `Team member assigned to ${shop_ids.length} shop(s)`,
    });
  } catch (error) {
    console.error('Error updating team member shops:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST add team member to a specific shop
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
    const { shop_id } = body;

    if (!shop_id) {
      return NextResponse.json(
        { error: 'shop_id is required' },
        { status: 400 }
      );
    }

    // Create or update assignment
    const { data, error } = await supabaseAdmin
      .from('shop_team_members')
      .upsert(
        {
          team_member_id: id,
          shop_id,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'shop_id,team_member_id',
        }
      )
      .select(
        `
        *,
        shops!inner(name, address)
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data,
      message: 'Team member added to shop successfully',
    });
  } catch (error) {
    console.error('Error adding team member to shop:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE remove team member from a specific shop
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
    const shopId = searchParams.get('shop_id');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shop_id query parameter is required' },
        { status: 400 }
      );
    }

    // Check for future availability at this shop
    const today = new Date().toISOString().split('T')[0];
    const { data: futureSlots } = await supabaseAdmin
      .from('availability_slots')
      .select('id')
      .eq('team_member_id', id)
      .eq('shop_id', shopId)
      .gte('date', today)
      .limit(1);

    if (futureSlots && futureSlots.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot remove: Team member has future availability at this shop',
        },
        { status: 400 }
      );
    }

    // Check for future bookings at this shop
    const { data: futureBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('team_member_id', id)
      .eq('shop_id', shopId)
      .gte('starts_at', new Date().toISOString())
      .in('status', ['confirmed'])
      .limit(1);

    if (futureBookings && futureBookings.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot remove: Team member has future bookings at this shop',
        },
        { status: 400 }
      );
    }

    // Soft delete (set inactive)
    const { error } = await supabaseAdmin
      .from('shop_team_members')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('team_member_id', id)
      .eq('shop_id', shopId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed from shop',
    });
  } catch (error) {
    console.error('Error removing team member from shop:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
