import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/post-form";
import { Loading } from "@/components/loading";

export const metadata: Metadata = { title: "New post · Artisity" };

async function NewPost() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, categories")
    .eq("id", user.sub)
    .maybeSingle();
  if (error) throw error;
  // No row: the account is gone (deleted elsewhere) but this browser's token hasn't expired
  if (!profile) redirect("/auth/login");
  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "artist") notFound();

  // Every picked service, priced or not
  return <PostForm userId={user.sub} services={profile.categories as string[]} />;
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-10">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">New post</h1>
      <Suspense fallback={<Loading />}>
        <NewPost />
      </Suspense>
    </main>
  );
}
