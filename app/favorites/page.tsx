import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Loading } from "@/components/loading";
import { Masonry } from "@/components/masonry";
import { CARD_POST_COLUMNS, PostCard, postCard } from "@/components/post-card";

export const metadata: Metadata = { title: "Favorites · Artisity" };

// Posts the viewer liked, most recently liked first. Unliking here leaves the card in place
// (heart cleared) until the next visit, so a slip of the finger is easy to undo.
// ponytail: newest 100 likes, no paging; add "load more" when someone outgrows it
async function Favorites() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/auth/login");

  const { data: likes, error } = await supabase
    .from("post_likes")
    .select(`created_at, post:posts(${CARD_POST_COLUMNS})`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  // A liked post can vanish (deleted) or lose its author (no longer an artist)
  const cards = likes.flatMap((l) => (l.post ? (postCard(l.post as never) ?? []) : []));

  if (cards.length === 0)
    return (
      <div className="flex flex-col items-start gap-4 py-8">
        <p className="text-muted-foreground">
          Nothing here yet. Tap the heart on a post to keep it here.
        </p>
        <Link
          href="/"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse posts
        </Link>
      </div>
    );

  return (
    <Masonry>
      {cards.map((card) => (
        <PostCard key={card.key} card={card} liked viewerId={claims.claims.sub} />
      ))}
    </Masonry>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4">
      <h1 className="pt-6 text-3xl font-bold tracking-tight sm:text-4xl">Favorites</h1>
      <Suspense fallback={<Loading />}>
        <Favorites />
      </Suspense>
    </main>
  );
}
