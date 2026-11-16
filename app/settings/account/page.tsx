import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Loading } from "@/components/loading";
import { DeleteAccount } from "@/components/delete-account";
import { Section } from "@/components/section";
import { EmailSettings, PasswordSettings, SessionSettings } from "@/components/account-settings";

async function Account() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  return (
    <>
      <EmailSettings email={user.email ?? ""} />
      <PasswordSettings />
      <SessionSettings />
      <Section
        title="Delete account"
        description="Permanently removes your profile, posts, messages and requests. This can't be undone."
      >
        <DeleteAccount />
      </Section>
    </>
  );
}

// Sign-in details and the account itself (after Fiverr's Account security and Behance's Account)
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-tight">Account</h2>
      <Suspense fallback={<Loading />}>
        <Account />
      </Suspense>
    </div>
  );
}
