// app/api/admin/services/route.ts
// ============================================
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .select(
        `
        *,
        category:service_categories(*),
        variants:service_variants(*)
      `
      )
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      category_id,
      name,
      description,
      base_duration,
      base_price,
      has_variants,
      is_active,
    } = body;

    // Create the service
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .insert({
        category_id,
        name,
        description: description || null,
        base_duration,
        base_price,
        has_variants,
        is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (serviceError) {
      return NextResponse.json(
        { error: serviceError.message },
        { status: 400 }
      );
    }

    // Auto-assign this service to all team members with base price
    const { data: teamMembers } = await supabaseAdmin
      .from('team_members')
      .select('id');

    if (teamMembers && teamMembers.length > 0) {
      const teamMemberServices = teamMembers.map((member) => ({
        team_member_id: member.id,
        service_id: service.id,
        is_available: false, // Start as not available
        price: base_price,
        duration: base_duration,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      await supabaseAdmin
        .from('team_member_services')
        .insert(teamMemberServices);
    }

    // Fetch the complete service with relations
    const { data: completeService, error: fetchError } = await supabaseAdmin
      .from('services')
      .select(
        `
        *,
        category:service_categories(*),
        variants:service_variants(*)
      `
      )
      .eq('id', service.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ data: service });
    }

    return NextResponse.json({ data: completeService });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
