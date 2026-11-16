import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";
import { Loading } from "@/components/loading";

async function Profile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const [{ data: profile, error }, { data: contact }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, username, bio, avatar_url, cover_url, location, role, business_name, business_type, categories, commissions_open, services(category, currency, price_min, price_max)",
      )
      .eq("id", user.sub)
      .maybeSingle(),
    supabase
      .from("contact_methods")
      .select("telegram, facebook, instagram")
      .eq("user_id", user.sub)
      .maybeSingle(),
  ]);
  if (error) throw error;
  // No row: the account is gone (deleted elsewhere) but this browser's token hasn't expired
  if (!profile) redirect("/auth/login");
  if (!profile.role) redirect("/onboarding");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <Link
          href="/profile"
          className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-semibold hover:bg-accent"
        >
          View profile
        </Link>
      </div>
      <ProfileForm
        profile={profile}
        contacts={{
          telegram: contact?.telegram ?? "",
          facebook: contact?.facebook ?? "",
          instagram: contact?.instagram ?? "",
        }}
        services={profile.services ?? []}
        userId={user.sub}
      />
    </>
  );
}

// What others see: the editor that used to live at /profile/edit (which now redirects here)
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<Loading />}>
        <Profile />
      </Suspense>
    </div>
  );
}
