// app/api/admin/team/route.ts
// ============================================
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const photoFile = formData.get('photo') as File | null;

    let photoUrl = null;
    if (photoFile && photoFile instanceof File) {
      const fileName = `${Date.now()}-${photoFile.name.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      )}`;
      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from('team-photos')
          .upload(fileName, photoFile);

      if (!uploadError && uploadData) {
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from('team-photos').getPublicUrl(fileName);
        photoUrl = publicUrl;
      }
    }

    // Create team member
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .insert({
        first_name: formData.get('first_name') as string,
        last_name: formData.get('last_name') as string,
        email: formData.get('email') as string,
        phone: (formData.get('phone') as string) || null,
        role: formData.get('role') as string,
        photo: photoUrl,
        is_visible: formData.get('is_visible') === 'true',
        display_order: parseInt(formData.get('display_order') as string) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
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
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all team members (admin view - shows all)
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: `${error} Internal server error` },
      { status: 500 }
    );
  }
}
