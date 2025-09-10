// app/api/admin/clients/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET single client
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role using users table
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch client data from clients table
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get booking history for this client
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('client_id', params.id)
      .order('booking_date', { ascending: false })
      .limit(10);

    return NextResponse.json({
      data: {
        ...data,
        recent_bookings: bookings || [],
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/clients/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update client
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { userId } = await auth();

    console.log('PUT request - Client ID:', params.id);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role using users table
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { first_name, last_name, email, phone, photo } = body;

    console.log('Updating client with data:', body);

    // Validate required fields
    if (!first_name) {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      );
    }

    // Check if email already exists for another client
    if (email) {
      const { data: existingClient } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('email', email)
        .neq('id', params.id)
        .single();

      if (existingClient) {
        return NextResponse.json(
          { error: 'Another client with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Update client in clients table
    const { data, error } = await supabaseAdmin
      .from('clients')
      .update({
        first_name,
        last_name: last_name || null,
        email: email || null,
        phone: phone || null,
        photo: photo || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Client updated successfully:', data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in PUT /api/admin/clients/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete client
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role using users table
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if client has any bookings
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('client_id', params.id)
      .limit(1);

    if (bookings && bookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with existing bookings' },
        { status: 400 }
      );
    }

    // Delete from clients table
    const { error } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/clients/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
