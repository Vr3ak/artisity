import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding-form";
import { Loading } from "@/components/loading";

async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url, cover_url, role")
    .eq("id", user.sub)
    .maybeSingle();
  if (error) throw error;
  // No row: the account is gone (deleted elsewhere) but this browser's token hasn't expired
  if (!profile) redirect("/auth/login");
  // Role is set by the final onboarding write, so a set role means onboarding is done
  if (profile.role) redirect("/");

  const { role } = await searchParams;
  return (
    <OnboardingForm
      userId={user.sub}
      initial={profile}
      initialRole={role === "artist" ? "artist" : "client"}
    />
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  return (
    // Centered like the auth cards, between the top bar and (below md) the tab bar
    <main className="flex min-h-[calc(100svh-8rem)] w-full items-center justify-center p-4 sm:p-6 md:min-h-[calc(100svh-4rem)] md:p-10">
      <div className="w-full max-w-md">
        <Suspense fallback={<Loading />}>
          <Onboarding searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
