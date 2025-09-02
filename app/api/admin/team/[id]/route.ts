// app/api/admin/team/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface UpdateTeamMemberData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_visible: boolean;
  display_order: number;
  updated_at: string;
  photo?: string;
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

    const formData = await req.formData();

    // Build update data with proper types
    const updateData: UpdateTeamMemberData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: (formData.get('phone') as string) || null,
      role: formData.get('role') as string,
      is_visible: formData.get('is_visible') === 'true',
      display_order: parseInt(formData.get('display_order') as string) || 0,
      updated_at: new Date().toISOString(),
    };

    // Handle photo upload if present
    const photoFile = formData.get('photo') as File | null;
    if (photoFile && photoFile instanceof File) {
      // Delete old photo if exists
      const { data: oldMember } = await supabaseAdmin
        .from('team_members')
        .select('photo')
        .eq('id', id)
        .single();

      if (oldMember?.photo) {
        const urlParts = oldMember.photo.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        if (oldFileName) {
          const { error: deleteError } = await supabaseAdmin.storage
            .from('team-photos')
            .remove([oldFileName]);

          if (deleteError) {
            console.error('Error deleting old photo:', deleteError);
          }
        }
      }

      // Upload new photo
      const fileName = `${Date.now()}-${photoFile.name.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      )}`;
      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from('team-photos')
          .upload(fileName, photoFile);

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload photo' },
          { status: 400 }
        );
      }

      if (uploadData) {
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from('team-photos').getPublicUrl(fileName);
        updateData.photo = publicUrl;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      if (error.message.includes('duplicate')) {
        return NextResponse.json(
          { error: 'A team member with this email already exists' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get team member to delete photo
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('photo')
      .eq('id', id)
      .single();

    if (member?.photo) {
      const urlParts = member.photo.split('/');
      const imagePath = urlParts[urlParts.length - 1];
      if (imagePath) {
        const { error: deleteError } = await supabaseAdmin.storage
          .from('team-photos')
          .remove([imagePath]);

        if (deleteError) {
          console.error('Error deleting photo:', deleteError);
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
