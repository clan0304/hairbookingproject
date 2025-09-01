import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { Webhook } from 'svix';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { uploadPhotoFromUrl, deletePhoto } from '@/lib/storage/upload-photo';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const {
      id,
      email_addresses,
      first_name,
      last_name,
      image_url,
      phone_numbers,
    } = evt.data;

    const email = email_addresses[0]?.email_address;
    const phone = phone_numbers?.[0]?.phone_number || null;

    if (!email || !first_name || !last_name) {
      return new Response('Missing required user data', { status: 400 });
    }

    try {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('photo')
        .eq('clerk_id', id)
        .single();

      // Upload photo to Supabase storage if image_url exists
      let userPhotoUrl: string | null = null;
      if (image_url) {
        // Delete old photo if it exists
        if (existingUser?.photo) {
          await deletePhoto(existingUser.photo);
        }
        userPhotoUrl = await uploadPhotoFromUrl(image_url, id, 'user');
      }

      // Insert or update user in users table
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            clerk_id: id,
            email,
            first_name,
            last_name,
            phone,
            photo: userPhotoUrl,
            role: 'client', // Default role
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'clerk_id',
          }
        )
        .select()
        .single();

      if (userError) {
        console.error('Error upserting user:', userError);
        return new Response('Error creating user', { status: 500 });
      }

      // Check if a client record already exists with this email (created by admin)
      const { data: existingClient } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('email', email)
        .is('clerk_id', null) // Only match non-authenticated clients
        .single();

      if (existingClient) {
        // Update existing client record to link with authenticated user
        const { error: updateError } = await supabaseAdmin
          .from('clients')
          .update({
            user_id: userData.id,
            clerk_id: id,
            is_authenticated: true,
            // Only update fields if they don't have values
            last_name: existingClient.last_name || last_name,
            phone: existingClient.phone || phone,
            photo: existingClient.photo || userPhotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingClient.id);

        if (updateError) {
          console.error('Error updating existing client:', updateError);
        }
      } else {
        // Check if authenticated client already exists (for updates)
        const { data: authenticatedClient } = await supabaseAdmin
          .from('clients')
          .select('*')
          .eq('clerk_id', id)
          .single();

        if (authenticatedClient) {
          // Update existing authenticated client
          let clientPhotoUrl = authenticatedClient.photo;
          if (image_url && clientPhotoUrl !== userPhotoUrl) {
            if (clientPhotoUrl) {
              await deletePhoto(clientPhotoUrl);
            }
            clientPhotoUrl = await uploadPhotoFromUrl(image_url, id, 'client');
          }

          await supabaseAdmin
            .from('clients')
            .update({
              first_name,
              last_name,
              email,
              phone,
              photo: clientPhotoUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('clerk_id', id);
        } else {
          // Create new client record for new sign-up
          let clientPhotoUrl: string | null = null;
          if (image_url) {
            clientPhotoUrl = await uploadPhotoFromUrl(image_url, id, 'client');
          }

          const { error: clientError } = await supabaseAdmin
            .from('clients')
            .insert({
              user_id: userData.id,
              clerk_id: id,
              first_name,
              last_name,
              email,
              phone,
              photo: clientPhotoUrl,
              is_authenticated: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (clientError) {
            console.error('Error creating client:', clientError);
          }
        }
      }

      return new Response('User and client processed successfully', {
        status: 200,
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Error processing webhook', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      // Get user and client data to find photo URLs
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('photo')
        .eq('clerk_id', id)
        .single();

      const { data: clientData } = await supabaseAdmin
        .from('clients')
        .select('photo')
        .eq('clerk_id', id)
        .single();

      // Delete photos from storage
      if (userData?.photo) {
        await deletePhoto(userData.photo);
      }
      if (clientData?.photo) {
        await deletePhoto(clientData.photo);
      }

      // Delete from users table
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('clerk_id', id);

      if (error) {
        console.error('Error deleting user:', error);
      }

      // Update client record to remove authentication (don't delete, keep as non-authenticated)
      await supabaseAdmin
        .from('clients')
        .update({
          user_id: null,
          clerk_id: null,
          is_authenticated: false,
          photo: null, // Remove photo since it was tied to auth
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_id', id);

      return new Response('User deleted successfully', { status: 200 });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Error processing webhook', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}
