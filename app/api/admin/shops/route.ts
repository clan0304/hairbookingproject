// app/api/admin/shops/route.ts
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
    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;
    const imageFile = formData.get('image') as File | null;

    // Generate booking URL using SQL function
    const { data: urlData } = await supabaseAdmin.rpc('generate_booking_url', {
      shop_name: name,
      shop_address: address,
    });

    let imageUrl = null;
    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from('shop-images')
          .upload(fileName, imageFile);

      if (!uploadError && uploadData) {
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from('shop-images').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('shops')
      .insert({
        name,
        address,
        phone: phone || null,
        image: imageUrl,
        booking_url: urlData,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `${error} Internal server error` },
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

    const { data, error } = await supabaseAdmin
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `${error}Internal server error` },
      { status: 500 }
    );
  }
}
