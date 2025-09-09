// app/api/admin/public-holidays/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// PUT update public holiday
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.recurring !== undefined) updateData.recurring = body.recurring;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabaseAdmin
      .from('public_holidays')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data,
      message: 'Public holiday updated successfully',
    });
  } catch (error) {
    console.error('Error updating public holiday:', error);
    return NextResponse.json(
      { error: 'Failed to update public holiday' },
      { status: 500 }
    );
  }
}

// DELETE public holiday
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

    // Soft delete by setting is_active to false
    const { error } = await supabaseAdmin
      .from('public_holidays')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Public holiday deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting public holiday:', error);
    return NextResponse.json(
      { error: 'Failed to delete public holiday' },
      { status: 500 }
    );
  }
}
