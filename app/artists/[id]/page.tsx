import { Loading } from "@/components/loading";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import {
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
      "id, username, display_name, avatar_url, cover_url, bio, location, social_links, role, portfolio, services(category, currency, price_min, price_max), posts(id, title, image_path, image_count)",
    )
    .eq(isUuid(key) ? "id" : "username", decodeURIComponent(key).toLowerCase())
    .eq("role", "artist")
    .order("created_at", { referencedTable: "posts", ascending: false })
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
      profile={artist as ProfileData}
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
      <Suspense fallback={<Loading />}>
        <Artist params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
