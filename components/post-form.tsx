"use client";

import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/options";
import { cn } from "@/lib/utils";
import { FormError } from "@/components/auth-parts";
import { Field, SelectField, fieldClass, pillClass } from "@/components/flow";
import { IMAGE_TYPES, useObjectUrl } from "@/components/profile-fields";
import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // profile-images bucket file_size_limit

// New post: one image, a title, an optional category and caption. The image goes to
// <uid>/posts/<post id> in profile-images, the path the posts table requires.
export function PostForm({ userId, categories }: { userId: string; categories: string[] }) {
  const [file, setFile] = useState<File | null>(null);
  const preview = useObjectUrl(file);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!IMAGE_TYPES.split(",").includes(f.type)) return setError("Use a PNG, JPEG, WebP or GIF image.");
    if (f.size > MAX_IMAGE_BYTES) return setError("Images can be up to 5 MB.");
    setError(null);
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Add an image of your work.");
    if (!title.trim()) return setError("Give your post a title.");
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const bucket = supabase.storage.from("profile-images");
    const id = crypto.randomUUID();
    const path = `${userId}/posts/${id}`;
    try {
      const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("posts").insert({
        id,
        image_path: path,
        title: title.trim(),
        caption: caption.trim(),
        category: category || null,
      });
      if (error) {
        await bucket.remove([path]);
        throw error;
      }
      router.push(`/posts/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your post wasn't published. Try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 rounded-3xl bg-nav p-6 sm:p-8">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
        className="relative flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-secondary text-center transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring"
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview of your post" className="absolute inset-0 size-full object-cover" />
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-md">
              Change image
            </span>
          </>
        ) : (
          <>
            <ImagePlus className="size-8" />
            <span className="font-semibold">Add an image of your work</span>
            <span className="text-sm text-muted-foreground">PNG, JPEG, WebP or GIF, up to 5 MB</span>
          </>
        )}
        <input
          type="file"
          accept={IMAGE_TYPES}
          className="sr-only"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

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

      <Field label="Caption (optional)">
        {(id) => (
          <textarea
            id={id}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Tell clients about this piece: the brief, your process, tools, turnaround."
            className={cn(fieldClass, "h-auto resize-none py-3")}
          />
        )}
      </Field>

      <FormError message={error} />
      <button type="submit" disabled={busy} className={pillClass.final}>
        {busy ? "Posting…" : "Post"}
      </button>
    </form>
  );
}
