// lib/storage/upload-photo.ts
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function uploadPhotoFromUrl(
  imageUrl: string,
  userId: string,
  type: 'user' | 'client'
): Promise<string | null> {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = blob.type.split('/')[1] || 'jpg';
    const fileName = `${type}/${userId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { error } = await supabaseAdmin.storage
      .from('user-photos')
      .upload(fileName, buffer, {
        contentType: blob.type,
        upsert: true,
      });

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('user-photos').getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error processing photo:', error);
    return null;
  }
}

export async function deletePhoto(photoPath: string): Promise<boolean> {
  try {
    // Extract the path from the full URL
    const url = new URL(photoPath);
    const pathParts = url.pathname.split(
      '/storage/v1/object/public/user-photos/'
    );
    if (pathParts.length < 2) return false;

    const filePath = pathParts[1];

    const { error } = await supabaseAdmin.storage
      .from('user-photos')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting photo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    return false;
  }
}
