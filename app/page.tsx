import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/options";
import { formatPrice, profileHref, profileImageUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CategoryChips } from "@/components/category-chips";
import { SiteFooter } from "@/components/site-footer";

type Service = { category: string; price_min: number; currency: string };
type Artist = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  services: Service[];
};

const ARTIST_COLUMNS = "id, username, display_name, avatar_url, services(category, price_min, currency)";

// The feed mixes real posts (title, own page) with onboarding portfolio images (no title,
// dated by the artist's sign-up, linking to the profile), newest first.
// ponytail: newest 48 posts + 24 artists, no paging; add "load more" when the feed outgrows it
async function Posts() {
  const supabase = await createClient();
  const [{ data: artists, error }, { data: posts, error: postsError }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`${ARTIST_COLUMNS}, portfolio, created_at`)
      .eq("role", "artist")
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("posts")
      .select(`id, title, category, image_path, created_at, artist:profiles!posts_artist_id_fkey(${ARTIST_COLUMNS})`)
      .order("created_at", { ascending: false })
      .limit(48),
  ]);
  if (error) throw error;
  if (postsError) throw postsError;

  const feed = [
    // A post whose author is no longer an artist comes back without one (RLS)
    ...posts.flatMap((p) => {
      const artist = p.artist as unknown as Artist | null;
      if (!artist) return [];
      return {
        key: p.id,
        href: `/posts/${p.id}`,
        image: profileImageUrl(p.image_path),
        title: p.title as string,
        artist,
        service: artist.services.find((s) => s.category === p.category) ?? artist.services[0],
        at: p.created_at as string,
      };
    }),
    ...artists.flatMap((a) => {
      const services = a.services as Service[];
      return (a.portfolio as string[]).map((image) => ({
        key: image,
        href: profileHref(a),
        image,
        title: services[0] ? categoryLabel(services[0].category) : null,
        artist: a as Artist,
        service: services[0],
        at: a.created_at as string,
      }));
    }),
  ].sort((x, y) => y.at.localeCompare(x.at));

  if (feed.length === 0)
    return <p className="text-muted-foreground">No posts yet.</p>;

  // Card follows vgen.co (wide image, bold title, artist + price row); hover follows
  // pinterest.com (dimmed image, pill top-right) with the pill naming the artist.
  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {feed.map(({ key, href, image, title, artist, service }) => (
        <li key={key}>
          <Link
            href={href}
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
              {title && <p className="truncate font-semibold">{title}</p>}
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
    <>
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
      <SiteFooter />
    </>
  );
}
