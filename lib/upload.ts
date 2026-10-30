import { type SupabaseClient } from "@supabase/supabase-js";

// Scales (w, h) down to fit a max x max box, keeping the aspect ratio; never scales up
export function fitWithin(w: number, h: number, max: number) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

// Resizes and re-encodes an image in the browser before upload: WebP where the browser can
// encode it, else the original format (Safari can't encode WebP, and JPEG would drop
// transparency). GIFs pass through so animation survives. Keeps the original when the result
// isn't smaller or anything fails.
export async function compressImage(file: File, maxSide = 2560): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file); // applies EXIF orientation
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    let blob = await encode("image/webp");
    if (blob?.type !== "image/webp") blob = await encode(file.type);
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

// Uploads to the public profile-images bucket under <uid>/... (storage policies enforce the prefix).
// Fixed paths overwrite on re-upload; ?v= busts the CDN/browser cache.
export async function uploadImage(
  supabase: SupabaseClient,
  path: string,
  original: File,
  maxSide?: number,
) {
  const file = await compressImage(original, maxSide);
  const bucket = supabase.storage.from("profile-images");
  const { error } = await bucket.upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
