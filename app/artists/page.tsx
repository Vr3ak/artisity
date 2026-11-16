import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, categoryLabel } from "@/lib/options";
import { formatPrice, profileHref } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { CategoryChips } from "@/components/category-chips";
import { ArtistGridSkeleton } from "@/components/skeletons";
import { RatingSummary } from "@/components/stars";

export const metadata: Metadata = { title: "Find an artist" };

type Service = { price_min: number; currency: string };

async function ArtistGrid({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    // !inner: only artists with at least one post are listed (their profile link still works)
    .select("id, username, display_name, avatar_url, location, categories, services(price_min, currency), reviews!reviews_artist_id_fkey(rating), posts!posts_artist_id_fkey!inner(id), commissions_open")
    .eq("role", "artist")
    .limit(1, { referencedTable: "posts" })
    // Open for commissions first, then newest
    .order("commissions_open", { ascending: false })
    .order("created_at", { ascending: false });
  // ponytail: no pagination; add .range() once there are more than a few hundred artists
  if (CATEGORIES.some((c) => c.value === category)) {
    query = query.contains("categories", [category]);
  }

  const term = q?.trim().replace(/^@/, "").replace(/[,()]/g, " ").trim();
  if (term) query = query.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);
  const { data: artists, error } = await query;
  if (error) throw error;

  return (
    <>
      <CategoryChips
        withAll
        active={CATEGORIES.some((c) => c.value === category) ? category : undefined}
        bleed="-mx-4 px-4"
      />
      {artists.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-card p-6">
          <p className="text-muted-foreground">
            {q
              ? `No artists match “${q}”. Try part of their name or @username.`
              : category && CATEGORIES.some((c) => c.value === category)
                ? `No artists offer ${categoryLabel(category)} yet.`
                : "No artists yet."}
          </p>
          {(q || category) && (
            <Link
              // Clearing the search keeps the category, and vice versa
              href={q && category ? `/artists?category=${category}` : "/artists"}
              className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              {q ? "Clear search" : "See all artists"}
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => {
            // ponytail: "from" price uses the first service; mixed USD/KHR isn't comparable without FX rates
            const from = (a.services as Service[])[0];
            return (
              <li key={a.id}>
                <Link
                  href={profileHref(a)}
                  className="flex h-full flex-col gap-4 rounded-3xl bg-card p-5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-14 shrink-0 overflow-hidden rounded-full bg-secondary">
                      {a.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatar_url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate text-lg font-semibold leading-tight">{a.display_name ?? "Unnamed"}</p>
                      {a.location && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{a.location}</span>
                        </p>
                      )}
                      {/* ponytail: averages every review in JS; move to a stored or SQL aggregate at a few thousand reviews */}
                      {(a.reviews as unknown[]).length > 0 && (
                        <RatingSummary reviews={a.reviews as { rating: number }[]} className="text-sm" />
                      )}
                    </div>
                  </div>
                  {(a.categories as string[]).length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {(a.categories as string[]).map((c) => (
                        <li key={c} className="inline-flex h-7 items-center rounded-full bg-secondary px-3 text-xs font-semibold">
                          {categoryLabel(c)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!a.commissions_open ? (
                    <p className="mt-auto text-sm font-semibold text-muted-foreground">Commissions closed</p>
                  ) : (
                    from && (
                      <p className="mt-auto text-sm text-muted-foreground">
                        From{" "}
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatPrice(from.price_min, from.price_min, from.currency)}
                        </span>
                      </p>
                    )
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:py-10">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find an artist</h1>
      <Suspense fallback={<ArtistGridSkeleton />}>
        <ArtistGrid searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
