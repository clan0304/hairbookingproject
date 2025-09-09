// app/api/admin/hourly-rates/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET all hourly rates
export async function GET() {
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

    const { data, error } = await supabaseAdmin
      .from('hourly_rates')
      .select('*')
      .eq('is_active', true)
      .order('day_type');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching hourly rates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update hourly rates
export async function PUT(req: Request) {
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

    const { rates } = await req.json();

    if (!rates || !Array.isArray(rates)) {
      return NextResponse.json(
        { error: 'Invalid rates data' },
        { status: 400 }
      );
    }

    // Update each rate
    const updates = await Promise.all(
      rates.map(async (rate) => {
        const { data, error } = await supabaseAdmin
          .from('hourly_rates')
          .update({
            rate: rate.rate,
            updated_at: new Date().toISOString(),
          })
          .eq('day_type', rate.day_type)
          .select()
          .single();

        if (error) throw error;
        return data;
      })
    );

    return NextResponse.json({
      data: updates,
      message: 'Hourly rates updated successfully',
    });
  } catch (error) {
    console.error('Error updating hourly rates:', error);
    return NextResponse.json(
      { error: 'Failed to update hourly rates' },
      { status: 500 }
    );
  }
}
