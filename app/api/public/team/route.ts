// ============================================
// app/api/public/team/route.ts
// (Public API for booking page - single correct version)
// ============================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const supabase = createServerClient();

export async function GET() {
  try {
    // Since team members work at all locations, we always return all visible members
    // The shopBookingUrl param is kept for future use if needed
    const { data, error } = await supabase
      .from('team_members')
      .select('id, first_name, role, photo, display_order')
      .eq('is_visible', true)
      .order('display_order', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
