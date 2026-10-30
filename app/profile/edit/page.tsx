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
        "display_name, username, bio, avatar_url, cover_url, location, role, business_name, business_type",
      )
      .eq("id", user.sub)
      .maybeSingle(),
    supabase
      .from("contact_methods")
      .select("telegram, facebook, instagram, facebook_name")
      .eq("user_id", user.sub)
      .maybeSingle(),
  ]);
  if (error) throw error;
  // No row: the account is gone (deleted elsewhere) but this browser's token hasn't expired
  if (!profile) redirect("/auth/login");
  if (!profile.role) redirect("/onboarding");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Edit profile
        </h1>
        <Link
          href="/profile"
          className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-semibold hover:bg-accent"
        >
          Back to profile
        </Link>
      </div>
      <ProfileForm
        profile={profile}
        contacts={{
          telegram: contact?.telegram ?? "",
          facebook: contact?.facebook ?? "",
          instagram: contact?.instagram ?? "",
          facebook_name: contact?.facebook_name ?? "",
        }}
        userId={user.sub}
      />
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-10">
      <Suspense fallback={<Loading />}>
        <Profile />
      </Suspense>
    </main>
  );
}
