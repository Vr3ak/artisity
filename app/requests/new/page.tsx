import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "@/components/request-form";

async function NewRequest({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string; category?: string }>;
}) {
  const { artist: artistId, category } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");
  if (!artistId || artistId === user.sub) notFound();

  const { data: artist, error } = await supabase
    .from("profiles")
    .select("display_name, categories, services(category)")
    .eq("id", artistId)
    .eq("role", "artist")
    .maybeSingle();
  // 22P02: id isn't a uuid
  if (error && error.code !== "22P02") throw error;
  if (!artist) notFound();

  // Priced services first; fall back to the categories the artist lists
  const services = (artist.services as { category: string }[]).map((s) => s.category);
  const categories = services.length ? services : (artist.categories as string[]);

  return (
    <RequestForm
      userId={user.sub}
      artistId={artistId}
      artistName={artist.display_name ?? "The artist"}
      categories={categories}
      initialCategory={category}
    />
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string; category?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-5">
      <Suspense>
        <NewRequest searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
