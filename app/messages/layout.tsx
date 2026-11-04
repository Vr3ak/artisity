import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Loading } from "@/components/loading";
import { Inbox, InboxResizer, type InboxItem } from "@/components/inbox";

type Person = { id: string; display_name: string | null; avatar_url: string | null };
type Last = NonNullable<InboxItem["last"]> & { id: number };

async function InboxLoader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  // RLS returns only the viewer's threads. Each comes with its newest message and the viewer's own
  // read receipt, for the preview and the unread mark.
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, last_message_at, client:profiles!conversations_client_id_fkey(id, display_name, avatar_url), artist:profiles!conversations_artist_id_fkey(id, display_name, avatar_url), messages(id, sender_id, body, attachment_type, deleted_at), conversation_reads(last_read_id)",
    )
    .eq("conversation_reads.user_id", user.sub)
    .order("last_message_at", { ascending: false })
    .order("id", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });
  if (error) throw error;

  const items: InboxItem[] = conversations.map((c) => {
    const client = c.client as unknown as Person;
    const other = client.id === user.sub ? (c.artist as unknown as Person) : client;
    const last = (c.messages as Last[])[0] ?? null;
    const readId = (c.conversation_reads as { last_read_id: number }[])[0]?.last_read_id ?? 0;
    return {
      id: c.id,
      lastMessageAt: c.last_message_at,
      other: { id: other.id, name: other.display_name ?? "Unnamed", avatar: other.avatar_url },
      last,
      unread: !!last && last.sender_id !== user.sub && last.id > readId,
    };
  });
  return <Inbox userId={user.sub} items={items} />;
}

// Messaging after LinkedIn: conversation list on the left, the open chat on the right. Below md it's one
// pane at a time: the list on /messages, the chat once one is open (its page marks itself data-chat, and
// :has() hides the list; CSS because usePathname here would need its own Suspense under cacheComponents).
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    // Full height between the 4rem top bar and, below md, the 4rem tab bar
    <main className="mx-auto flex h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] w-full max-w-6xl md:h-[calc(100dvh-4rem)] md:px-4 md:pb-4">
      <div className="group/messages flex min-h-0 flex-1 overflow-hidden md:rounded-2xl md:border">
        <aside
          aria-label="Conversations"
          className="flex min-h-0 w-full flex-col max-md:group-has-[[data-chat]]/messages:hidden md:w-[var(--inbox-w,20rem)] md:shrink-0 lg:w-[var(--inbox-w,24rem)]"
        >
          <Suspense fallback={<Loading />}>
            <InboxLoader />
          </Suspense>
        </aside>
        <InboxResizer />
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</section>
      </div>
    </main>
  );
}
