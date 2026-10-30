import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Loading } from "@/components/loading";

type Person = { id: string; display_name: string | null; avatar_url: string | null };

async function Conversations() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  // RLS returns only the viewer's threads
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, last_message_at, client:profiles!conversations_client_id_fkey(id, display_name, avatar_url), artist:profiles!conversations_artist_id_fkey(id, display_name, avatar_url)",
    )
    .order("last_message_at", { ascending: false });
  if (error) throw error;

  if (conversations.length === 0)
    return (
      <p className="text-muted-foreground">
        No messages yet. Find an artist on <Link href="/artists" className="underline">Artists</Link> to start one.
      </p>
    );

  return (
    <ul className="divide-y rounded-lg border">
      {conversations.map((c) => {
        const client = c.client as unknown as Person;
        const other = client.id === user.sub ? (c.artist as unknown as Person) : client;
        return (
          <li key={c.id}>
            <Link href={`/messages/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-muted">
              <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                {other.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={other.avatar_url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                )}
              </div>
              <span className="flex-1 truncate font-medium">{other.display_name ?? "Unnamed"}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(c.last_message_at).toLocaleDateString()}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-5">
      <h1 className="text-2xl font-semibold">Messages</h1>
      <Suspense fallback={<Loading />}>
        <Conversations />
      </Suspense>
    </main>
  );
}
