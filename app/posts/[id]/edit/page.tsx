import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { postImagePaths, profileImageUrl } from "@/lib/utils";
import { PostForm } from "@/components/post-form";
import { Loading } from "@/components/loading";

export const metadata: Metadata = { title: "Edit post · Artisity" };

async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const [{ data: post, error }, { data: services }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, artist_id, title, caption, category, image_path, image_count")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("services").select("category").eq("artist_id", user.sub),
  ]);
  // 22P02: id isn't a uuid
  if (error && error.code !== "22P02") throw error;
  if (!post || post.artist_id !== user.sub) notFound();

  return (
    <PostForm
      userId={user.sub}
      services={(services ?? []).map((s) => s.category)}
      post={{
        id: post.id,
        title: post.title,
        caption: post.caption,
        category: post.category,
        imageUrls: postImagePaths(post.image_path, post.image_count).map(profileImageUrl),
      }}
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-10">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Edit post</h1>
      <Suspense fallback={<Loading />}>
        <EditPost params={params} />
      </Suspense>
    </main>
  );
}
