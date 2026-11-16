import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CategoryChips } from "@/components/category-chips";
import { SiteFooter } from "@/components/site-footer";
import { Loading } from "@/components/loading";
import { BannerCarousel, type BannerSlide } from "@/components/banner-carousel";
import { CARD_POST_COLUMNS, postCard } from "@/components/post-card";
import { HomeFeed } from "@/components/home-feed";
import { isCategory } from "@/lib/options";

type Search = Promise<{ category?: string }>;

// Clicking a service filters the feed to posts tagged with it (`?category=`)
async function Posts({ searchParams }: { searchParams: Search }) {
  const { category: raw } = await searchParams;
  const category = isCategory(raw) ? raw : undefined;
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(CARD_POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(48);
  if (category) query = query.eq("category", category);
  const [{ data: posts, error }, { data: claims }] = await Promise.all([query, supabase.auth.getClaims()]);
  if (error) throw error;
  const feed = posts.flatMap((p) => postCard(p) ?? []);

  const viewerId = claims?.claims?.sub;
  const { data: likes, error: likesError } = viewerId
    ? await supabase
        .from("post_likes")
        .select("post_id")
        .in(
          "post_id",
          posts.map((p) => p.id)
        )
    : { data: [], error: null };
  if (likesError) throw likesError;

  return <HomeFeed cards={feed} liked={likes.map((l) => l.post_id)} viewerId={viewerId} category={category} />;
}

async function Services({ searchParams }: { searchParams: Search }) {
  const { category } = await searchParams;
  return <CategoryChips large feed withAll active={isCategory(category) ? category : undefined} />;
}

const BANNERS: BannerSlide[] = [
  {
    image: "sea-differently.jpeg",
    alt: "Sea Differently: an Asian lens on artistic freedom. Safe Havens Meeting, 2–4 December 2026, Siem Reap, Cambodia. Living Arts International and SHIFT.",
  },
  {
    image: "phsar-art.jpeg",
    alt: "Phsar Art ’26, 7th edition: Moving with friends! 14–15 November at Stable TK, Saturday and Sunday 10:00–6:00, free entry. Supported by NagaWorld, curated by Nowhere Art Studio.",
  },
  {
    image: "art-and-artists.jpeg",
    alt: "Art & Artists Collective Exhibition, hosted by Kramuon Gallery. 7–8 November 2026, 4–8 PM at Domlei House, #91, St. 110. Free entry. Sponsored by Co & Bloom Coffee and Domlei.",
  },
  {
    image: "tonle-to-treeline.jpeg",
    alt: "Tonlé to Treeline exhibition: Anya Minko, Ouk Chimvichet and Hom Rith. 19 March – 31 May 2026 at Rosewood Gallery, Floor 35, Rosewood Phnom Penh. Curated by Anya Minko.",
  },
];

export default function Home({ searchParams }: { searchParams: Search }) {
  return (
    <>
      <BannerCarousel slides={BANNERS} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4">
        <section className="flex flex-col gap-6 pt-6">
          <h1 className="text-left text-3xl font-bold tracking-tight sm:text-5xl">
            Embrace HUMAN Creativity
          </h1>
          {/* NavSearch (components/nav-search.tsx) docks a compact copy into the nav once this scrolls away */}
          <form
            id="home-search"
            action="/artists"
            role="search"
            className="relative w-full"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search artists by name"
              aria-label="Search artists by name"
              className="h-12 rounded-full pl-12 text-base"
            />
          </form>
          {/* HomeFeed docks a one-row copy of these into its sticky bar once this scrolls away */}
          <div id="home-services" className="flex flex-col gap-4 pt-4">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Commission services
            </h2>
            <Suspense fallback={<CategoryChips large feed withAll />}>
              <Services searchParams={searchParams} />
            </Suspense>
          </div>
        </section>

        {/* No gap: HomeFeed's sticky bar is the first child and brings its own height */}
        <section className="flex flex-col">
          <Suspense fallback={<Loading />}>
            <Posts searchParams={searchParams} />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
