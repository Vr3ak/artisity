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
      "id, username, display_name, avatar_url, cover_url, bio, location, social_links, role, portfolio, services(category, currency, price_min, price_max)",
    )
    .eq(isUuid(key) ? "id" : "username", decodeURIComponent(key).toLowerCase())
    .eq("role", "artist")
    .maybeSingle();
  if (error) throw error;
  if (!artist) notFound();
  const { data: claims } = await supabase.auth.getClaims();

  return (
    <ProfileView
      profile={artist as ProfileData}
      tab={tab}
      viewerId={claims?.claims.sub}
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
      <Suspense>
        <Artist params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
