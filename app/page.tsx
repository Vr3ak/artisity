import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { profileImageUrl, timeAgo } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CategoryChips } from "@/components/category-chips";
import { SiteFooter } from "@/components/site-footer";
import { Loading } from "@/components/loading";
import { Masonry } from "@/components/masonry";
import { CARD_POST_COLUMNS, PostCard, postCard } from "@/components/post-card";
import { PostHero } from "@/components/post-hero";

async function Posts() {
  const supabase = await createClient();
  const [{ data: posts, error }, { data: claims }] = await Promise.all([
    supabase.from("posts").select(CARD_POST_COLUMNS).order("created_at", { ascending: false }).limit(48),
    supabase.auth.getClaims(),
  ]);
  if (error) throw error;
  const feed = posts.flatMap((p) => postCard(p) ?? []);

  if (feed.length === 0)
    return <p className="text-muted-foreground">No posts yet.</p>;

  const viewerId = claims?.claims?.sub;
  const { data: likes, error: likesError } = viewerId
    ? await supabase.from("post_likes").select("post_id").in("post_id", posts.map((p) => p.id))
    : { data: [], error: null };
  if (likesError) throw likesError;
  const liked = new Set(likes.map((l) => l.post_id));

  return (
    <Masonry>
      {feed.map((card) => (
        <PostCard key={card.postId} card={card} liked={liked.has(card.postId)} viewerId={viewerId} />
      ))}
    </Masonry>
  );
}

async function Hero() {
  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, image_path, created_at, artist:profiles!posts_artist_id_fkey(display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;

  const slides = posts.flatMap((p) => {
    const artist = p.artist as unknown as { display_name: string | null; avatar_url: string | null } | null;
    if (!artist) return [];
    return {
      id: p.id as string,
      image: profileImageUrl(p.image_path),
      title: p.title as string,
      artist: artist.display_name,
      avatar: artist.avatar_url,
      ago: timeAgo(p.created_at),
    };
  });
  return slides.length > 0 && <PostHero slides={slides} />;
}

function HeroSkeleton() {
  return (
    <div className="pt-2 [container-type:inline-size]">
      <div className="mx-auto aspect-[16/10] w-[min(88cqw,78rem)] animate-pulse rounded-3xl bg-muted motion-reduce:animate-none sm:aspect-[21/9] lg:aspect-[3/1]" />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <Hero />
      </Suspense>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4">
        <section className="flex flex-col gap-6 pt-6">
          <h1 className="text-left text-3xl font-bold tracking-tight sm:text-5xl">
            Embrace HUMAN Creativity
          </h1>
          {/* NavSearch (components/nav-search.tsx) docks a compact copy into the nav once this scrolls away */}
          <form id="home-search" action="/artists" role="search" className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search for artist or tag"
              aria-label="Search for artist or tag"
              className="h-12 rounded-full pl-12 text-base"
            />
          </form>
          <div className="flex flex-col gap-4 pt-4">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Commission services
            </h2>
            <CategoryChips large />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Suspense fallback={<Loading />}>
            <Posts />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
