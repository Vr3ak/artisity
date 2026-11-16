import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RequestForm, type PricedService } from "@/components/request-form";
import { Loading } from "@/components/loading";
import Link from "next/link";
import { profileHref } from "@/lib/utils";

export const metadata: Metadata = { title: "Request a commission" };

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
    .select("display_name, username, commissions_open, categories, services(category, price_min, price_max, currency)")
    .eq("id", artistId)
    .eq("role", "artist")
    .maybeSingle();
  // 22P02: id isn't a uuid
  if (error && error.code !== "22P02") throw error;
  if (!artist) notFound();

  // Closed: say so up front (the requests insert policy would reject the send anyway)
  if (!artist.commissions_open)
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-8 text-center sm:p-10">
        <h1 className="text-2xl font-bold tracking-tight">
          {artist.display_name ?? "This artist"} isn&apos;t taking commissions right now
        </h1>
        <p className="text-muted-foreground">You can still message them from their profile, or check back later.</p>
        <Link
          href={profileHref({ id: artistId, username: artist.username })}
          className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          Go to their profile
        </Link>
      </div>
    );

  // Every service the artist offers: priced ones (services rows) plus any picked without a price yet
  const services = artist.services as PricedService[];
  const categories = [...new Set([...services.map((s) => s.category), ...(artist.categories as string[])])];

  return (
    <RequestForm
      userId={user.sub}
      artistId={artistId}
      artistName={artist.display_name ?? "The artist"}
      categories={categories}
      services={services}
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-10">
      <Suspense fallback={<Loading />}>
        <NewRequest searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
