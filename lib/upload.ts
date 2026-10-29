import { type SupabaseClient } from "@supabase/supabase-js";

// Uploads to the public profile-images bucket under <uid>/... (storage policies enforce the prefix).
// Fixed paths overwrite on re-upload; ?v= busts the CDN/browser cache.
export async function uploadImage(
  supabase: SupabaseClient,
  path: string,
  file: File,
) {
  const bucket = supabase.storage.from("profile-images");
  const { error } = await bucket.upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
