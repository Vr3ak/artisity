import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/options";
import { formatPrice, profileHref } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CategoryChips } from "@/components/category-chips";

type Service = { category: string; price_min: number; currency: string };

// ponytail: a "post" is one portfolio image; add a posts table when artists need titles/captions per piece
async function Posts() {
  const supabase = await createClient();
  const { data: artists, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, portfolio, services(category, price_min, currency)",
    )
    .eq("role", "artist")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw error;

  const posts = artists.flatMap((a) =>
    (a.portfolio as string[]).map((image) => ({
      image,
      artist: a,
      service: (a.services as Service[])[0],
    })),
  );
  if (posts.length === 0)
    return <p className="text-muted-foreground">No posts yet.</p>;

  // Card follows vgen.co (wide image, bold title, artist + price row); hover follows
  // pinterest.com (dimmed image, pill top-right) with the pill naming the artist.
  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {posts.map(({ image, artist, service }) => (
        <li key={image}>
          <Link
            href={profileHref(artist)}
            className="group flex flex-col gap-2 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
              {/* Decorative repeat of the artist below, so it stays out of the link's accessible name */}
              <div
                aria-hidden
                className="absolute inset-0 flex items-start justify-end bg-nav/60 p-3 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
              >
                <span className="flex h-9 max-w-full items-center gap-2 rounded-full bg-primary pl-1 pr-3.5 text-sm font-semibold text-primary-foreground shadow-md">
                  <Avatar url={artist.avatar_url} className="size-7" />
                  <span className="truncate">{artist.display_name}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 px-1">
              {service && (
                <p className="truncate font-semibold">
                  {categoryLabel(service.category)}
                </p>
              )}
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <Avatar url={artist.avatar_url} className="size-5" />
                  <span className="truncate">{artist.display_name}</span>
                </span>
                {service && (
                  <span className="shrink-0 font-semibold tabular-nums">
                    From{" "}
                    {formatPrice(
                      service.price_min,
                      service.price_min,
                      service.currency,
                    )}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Avatar({ url, className }: { url: string | null; className: string }) {
  return (
    <span
      className={`${className} shrink-0 overflow-hidden rounded-full bg-secondary`}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      )}
    </span>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4">
      <section className="flex flex-col gap-6 pt-6">
        <h1 className="text-left text-3xl font-bold tracking-tight sm:text-5xl">
          Embrace HUMAN Creativity
        </h1>
        <form action="/artists" role="search" className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            placeholder="Search for artist or tag"
            aria-label="Search for artist or tag"
            className="h-12 rounded-full pl-12 text-base"
          />
        </form>
        <div className="flex flex-col gap-3 pt-2">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            Commission services
          </h2>
          <CategoryChips />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Suspense>
          <Posts />
        </Suspense>
      </section>
    </main>
  );
}
