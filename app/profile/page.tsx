import { Loading } from "@/components/loading";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  ProfileView,
  parseTab,
  type ProfileData,
} from "@/components/profile-view";

type Search = Promise<{ tab?: string }>;

async function Profile({ searchParams }: { searchParams: Search }) {
  const tab = parseTab((await searchParams).tab);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, cover_url, bio, location, role, business_name, business_type, services(category, currency, price_min, price_max), posts!posts_artist_id_fkey(id, title, image_path, image_count), contact_methods(telegram, facebook, instagram)",
    )
    .eq("id", user.sub)
    .order("created_at", { referencedTable: "posts", ascending: false })
    .maybeSingle();
  if (error) throw error;
  if (!profile) redirect("/auth/login");
  if (!profile.role) redirect("/onboarding");

  return (
    <ProfileView
      profile={profile as unknown as ProfileData}
      tab={tab}
      viewerId={user.sub}
    />
  );
}

export default function Page({ searchParams }: { searchParams: Search }) {
  return (
    <main className="w-full">
      <Suspense fallback={<Loading />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
