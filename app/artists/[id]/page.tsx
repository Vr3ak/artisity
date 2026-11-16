import { ProfileSkeleton } from "@/components/skeletons";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { clip, isUuid } from "@/lib/utils";
import {
  PROFILE_REVIEW_COLUMNS,
  ProfileView,
  parseTab,
  type ProfileData,
} from "@/components/profile-view";

type Search = Promise<{ tab?: string }>;

async function Artist({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  // The segment is an id, or a username when reached through the /@username rewrite
  const { id: key } = await params;
  const tab = parseTab((await searchParams).tab);
  const supabase = await createClient();
  const { data: artist, error } = await supabase
    .from("profiles")
    .select(
      `id, username, display_name, avatar_url, cover_url, bio, location, role, categories, commissions_open, created_at, services(category, currency, price_min, price_max), posts!posts_artist_id_fkey(id, title, image_path, image_count), contact_methods(telegram, facebook, instagram), ${PROFILE_REVIEW_COLUMNS}`,
    )
    .eq(isUuid(key) ? "id" : "username", decodeURIComponent(key).toLowerCase())
    .eq("role", "artist")
    .order("created_at", { referencedTable: "posts", ascending: false })
    .order("created_at", { referencedTable: "reviews", ascending: false })
    .maybeSingle();
  if (error) throw error;
  if (!artist) notFound();
  const { data: claims } = await supabase.auth.getClaims();
  const viewerId = claims?.claims.sub;
  // RLS returns only the viewer's own blocks
  const { data: block } = viewerId
    ? await supabase.from("blocks").select("blocked_id").eq("blocked_id", artist.id).maybeSingle()
    : { data: null };

  return (
    <ProfileView
      profile={artist as unknown as ProfileData}
      tab={tab}
      viewerId={viewerId}
      blocked={!!block}
    />
  );
}

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  return (
    <main className="w-full">
      <Suspense fallback={<ProfileSkeleton />}>
        <Artist params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Link previews (Telegram, Facebook): name, bio and cover (or avatar)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: key } = await params;
  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("profiles")
    .select("display_name, username, bio, location, cover_url, avatar_url")
    .eq(isUuid(key) ? "id" : "username", decodeURIComponent(key).toLowerCase())
    .eq("role", "artist")
    .maybeSingle();
  if (!artist) return {};
  const title = artist.display_name ?? (artist.username ? `@${artist.username}` : "Artist");
  const description =
    clip(artist.bio) ?? `${title}${artist.location ? `, ${artist.location}` : ""}. Commission original, human-made work on Artisity.`;
  const image = artist.cover_url ?? artist.avatar_url;
  const images = image ? [image] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, images, type: "profile" },
    twitter: { card: image === artist.cover_url && image ? "summary_large_image" : "summary", title, description, images },
  };
}
