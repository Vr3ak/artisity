import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Loading } from "@/components/loading";
import { Section } from "@/components/section";
import { BlockedUsers, type BlockedUser } from "@/components/blocked-users";

async function Blocked() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login");

  // RLS returns only the viewer's own blocks
  const { data: rows, error } = await supabase
    .from("blocks")
    .select("blocked_id, blocked:profiles!blocks_blocked_id_fkey(display_name, username, avatar_url, role)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const users: BlockedUser[] = rows.map((r) => ({
    id: r.blocked_id,
    profile: r.blocked as unknown as BlockedUser["profile"],
  }));
  return <BlockedUsers initial={users} />;
}

// Safety controls (after Behance's Blocked users). Reports are made from a person's profile or chat.
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-tight">Privacy &amp; safety</h2>
      <Section
        title="Blocked people"
        description="They can't message you or send you requests, and they aren't told they're blocked."
      >
        <Suspense fallback={<Loading />}>
          <Blocked />
        </Suspense>
      </Section>
    </div>
  );
}
