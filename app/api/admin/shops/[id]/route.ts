// app/api/admin/shops/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface UpdateShopData {
  name: string;
  address: string;
  phone: string | null;
  is_active: boolean;
  updated_at: string;
  image?: string;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params first
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
    const updateData: UpdateShopData = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      phone: (formData.get('phone') as string) || null,
      is_active: formData.get('is_active') === 'true',
      updated_at: new Date().toISOString(),
    };

    // Handle image upload if present
    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile instanceof File) {
      // Delete old image if exists
      const { data: oldShop } = await supabaseAdmin
        .from('shops')
        .select('image')
        .eq('id', id)
        .single();

      if (oldShop?.image) {
        // Extract filename from URL
        const urlParts = oldShop.image.split('/');
        const oldFileName = urlParts[urlParts.length - 1];

        if (oldFileName) {
          await supabaseAdmin.storage.from('shop-images').remove([oldFileName]);
        }
      }

      // Upload new image
      const fileName = `${Date.now()}-${imageFile.name.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      )}`;
      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from('shop-images')
          .upload(fileName, imageFile);

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload image' },
          { status: 400 }
        );
      }

      if (uploadData) {
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from('shop-images').getPublicUrl(fileName);
        updateData.image = publicUrl;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('shops')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
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
    const { id } = await params; // Await params first
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

    // Get shop to delete image
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('image')
      .eq('id', id)
      .single();

    if (shop?.image) {
      // Extract filename from URL
      const urlParts = shop.image.split('/');
      const imagePath = urlParts[urlParts.length - 1];

      if (imagePath) {
        const { error: deleteError } = await supabaseAdmin.storage
          .from('shop-images')
          .remove([imagePath]);

        if (deleteError) {
          console.error('Image deletion error:', deleteError);
        }
      }
    }

    const { error } = await supabaseAdmin.from('shops').delete().eq('id', id);

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
