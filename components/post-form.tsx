"use client";

import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/options";
import { compressImage } from "@/lib/upload";
import { cn, postImagePaths } from "@/lib/utils";
import { FormError } from "@/components/auth-parts";
import { Field, SelectField, fieldClass, pillClass } from "@/components/flow";
import { IMAGE_TYPES, ImageTile } from "@/components/profile-fields";
import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_IMAGES = 10; // posts.image_count check
const MAX_GIF_BYTES = 7 * 1024 * 1024; // profile-images bucket file_size_limit; GIFs upload as-is
// Other images are resized before upload; this only stops huge files from choking the decoder
const MAX_INPUT_BYTES = 50 * 1024 * 1024;

// New post: 1-10 images (the first is the cover), a title, an optional category and caption.
// Images go to <uid>/posts/<post id>[-n] in profile-images, the paths the posts table requires.
export function PostForm({ userId, categories }: { userId: string; categories: string[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [caption, setCaption] = useState("");
  const [uploaded, setUploaded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const busy = uploaded !== null;

  const add = (picked: FileList | null | undefined) => {
    const all = Array.from(picked ?? []);
    const ok = all.filter(
      (f) =>
        IMAGE_TYPES.split(",").includes(f.type) &&
        f.size <= (f.type === "image/gif" ? MAX_GIF_BYTES : MAX_INPUT_BYTES),
    );
    const room = MAX_IMAGES - files.length;
    if (ok.length < all.length) setError("Skipped files that aren't PNG, JPEG, WebP or GIF, or are too big (GIFs up to 7 MB).");
    else if (ok.length > room) setError(`A post can have up to ${MAX_IMAGES} images.`);
    else setError(null);
    setFiles((fs) => [...fs, ...ok].slice(0, MAX_IMAGES));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) return setError("Add at least one image of your work.");
    if (!title.trim()) return setError("Give your post a title.");
    setUploaded(0);
    setError(null);

    const supabase = createClient();
    const bucket = supabase.storage.from("profile-images");
    const id = crypto.randomUUID();
    const paths = postImagePaths(`${userId}/posts/${id}`, files.length);
    try {
      const results = await Promise.all(
        files.map(async (file, i) => {
          const small = await compressImage(file);
          const res = await bucket.upload(paths[i], small, { contentType: small.type });
          setUploaded((n) => (n ?? 0) + 1);
          return res;
        }),
      );
      const uploadError = results.find((r) => r.error)?.error;
      const { error } = uploadError
        ? { error: uploadError }
        : await supabase.from("posts").insert({
            id,
            image_path: paths[0],
            image_count: files.length,
            title: title.trim(),
            caption: caption.trim(),
            category: category || null,
          });
      if (error) {
        await bucket.remove(paths);
        throw error;
      }
      router.push(`/posts/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your post wasn't published. Try again.");
      setUploaded(null);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 rounded-3xl bg-nav p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <ul
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) add(e.dataTransfer.files);
          }}
          className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {files.map((f, i) => (
            <ImageTile
              key={`${f.name}-${f.lastModified}-${i}`}
              file={f}
              onRemove={() => !busy && setFiles((fs) => fs.filter((_, j) => j !== i))}
            />
          ))}
          {files.length < MAX_IMAGES && (
            <li className={files.length ? "" : "col-span-full"}>
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-secondary p-2 text-center text-sm font-semibold hover:bg-accent focus-within:ring-2 focus-within:ring-ring",
                  files.length ? "aspect-square" : "aspect-video gap-2 rounded-2xl text-base",
                )}
              >
                <ImagePlus className={files.length ? "size-6" : "size-8"} />
                {files.length ? "Add" : "Add images of your work"}
                {!files.length && (
                  <span className="text-sm font-normal text-muted-foreground">
                    Up to {MAX_IMAGES} PNG, JPEG, WebP or GIF images. Large images are resized; GIFs up to 7 MB
                  </span>
                )}
                <input
                  type="file"
                  multiple
                  accept={IMAGE_TYPES}
                  disabled={busy}
                  className="sr-only"
                  onChange={(e) => {
                    add(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </li>
          )}
        </ul>
        {files.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {files.length}/{MAX_IMAGES} images. The first one is the cover in the feed.
          </p>
        )}
      </div>

      <Field label="Title">
        {(id) => (
          <input
            id={id}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className={fieldClass}
          />
        )}
      </Field>

      {categories.length > 0 && (
        <Field label="Category" >
          {(id) => (
            <SelectField id={id} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
              <option value="">No category</option>
            </SelectField>
          )}
        </Field>
      )}

      <Field label="Caption">
        {(id) => (
          <textarea
            id={id}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder=""
            className={cn(fieldClass, "h-auto resize-none py-3")}
          />
        )}
      </Field>

      <FormError message={error} />
      <button type="submit" disabled={busy} className={cn(pillClass.final, "gap-2")}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {!busy
          ? "Post"
          : uploaded! < files.length
            ? `Uploading ${uploaded}/${files.length}…`
            : "Posting…"}
      </button>
    </form>
  );
}
