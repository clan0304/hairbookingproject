// app/api/admin/team/[id]/services/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params first
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('team_member_services')
      .select(
        `
        *,
        service:services(
          *,
          category:service_categories(*),
          variants:service_variants(*)
        )
      `
      )
      .eq('team_member_id', id);

    if (error) {
      console.error('API: Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching team member services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params first
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
    const { service_id, is_available, price, duration } = body;

    // Check if record exists
    const { data: existing } = await supabaseAdmin
      .from('team_member_services')
      .select('id')
      .eq('team_member_id', id)
      .eq('service_id', service_id)
      .single();

    let result;

    if (existing) {
      // Update existing record
      const { data, error } = await supabaseAdmin
        .from('team_member_services')
        .update({
          is_available,
          price,
          duration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      result = data;
    } else {
      // Create new record
      const { data, error } = await supabaseAdmin
        .from('team_member_services')
        .insert({
          team_member_id: id,
          service_id,
          is_available,
          price,
          duration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      result = data;
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error updating team member service:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
