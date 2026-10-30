import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, categoryLabel } from "@/lib/options";
import { formatPrice, profileHref } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CategoryChips } from "@/components/category-chips";
import { Loading } from "@/components/loading";

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
    .select("id, username, display_name, avatar_url, location, categories, services(price_min, currency)")
    .eq("role", "artist")
    .order("created_at", { ascending: false });
  // ponytail: no pagination; add .range() once there are more than a few hundred artists
  if (CATEGORIES.some((c) => c.value === category)) {
    query = query.contains("categories", [category]);
  }
  // ponytail: name substring match; full-text search over bio/categories when this gets used
  if (q?.trim()) query = query.ilike("display_name", `%${q.trim()}%`);
  const { data: artists, error } = await query;
  if (error) throw error;

  return (
    <>
      <CategoryChips
        withAll
        active={CATEGORIES.some((c) => c.value === category) ? category : undefined}
        bleed="-mx-5 px-5"
      />
      {artists.length === 0 ? (
        <p className="text-muted-foreground">
          {q
            ? `No artists match “${q}”.`
            : category && CATEGORIES.some((c) => c.value === category)
              ? `No artists offer ${categoryLabel(category)} yet.`
              : "No artists yet."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => {
            // ponytail: "from" price uses the first service; mixed USD/KHR isn't comparable without FX rates
            const from = (a.services as Service[])[0];
            return (
              <li key={a.id}>
                <Link href={profileHref(a)} className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted">
                  <div className="flex items-center gap-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      {a.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatar_url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{a.display_name}</p>
                      <p className="text-sm text-muted-foreground">{a.location}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(a.categories as string[]).map((c) => (
                      <Badge key={c} variant="secondary">
                        {categoryLabel(c)}
                      </Badge>
                    ))}
                  </div>
                  {from && (
                    <p className="text-sm">From {formatPrice(from.price_min, from.price_min, from.currency)}</p>
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-5">
      <h1 className="text-2xl font-semibold">Find an artist</h1>
      <Suspense fallback={<Loading />}>
        <ArtistGrid searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
