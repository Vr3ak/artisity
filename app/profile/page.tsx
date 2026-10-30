import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  ProfileView,
  parseTab,
  type ProfileData,
} from "@/components/profile-view";

type Search = Promise<{ tab?: string }>;

// Your own profile, shown the way visitors see it (vgen.co style) with an "Edit profile" button.
// Clients get the same page; theirs is only visible to them and the artists they contact.
async function Profile({ searchParams }: { searchParams: Search }) {
  const tab = parseTab((await searchParams).tab);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, cover_url, bio, location, social_links, role, business_name, business_type, portfolio, services(category, currency, price_min, price_max), posts(id, title, image_path)",
    )
    .eq("id", user.sub)
    .order("created_at", { referencedTable: "posts", ascending: false })
    .single();
  if (error) throw error;
  if (!profile.role) redirect("/onboarding");

  return (
    <ProfileView
      profile={profile as ProfileData}
      tab={tab}
      viewerId={user.sub}
    />
  );
}

export default function Page({ searchParams }: { searchParams: Search }) {
  return (
    <main className="w-full">
      <Suspense>
        <Profile searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
