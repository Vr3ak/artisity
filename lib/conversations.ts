import { type SupabaseClient } from "@supabase/supabase-js";

// The thread between two users in either direction, so two artists who message each other share one.
export async function findConversation(
  supabase: SupabaseClient,
  a: string,
  b: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(client_id.eq.${a},artist_id.eq.${b}),and(client_id.eq.${b},artist_id.eq.${a})`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// Returns the viewer's thread with this artist, creating it if needed.
export async function openConversation(
  supabase: SupabaseClient,
  userId: string,
  artistId: string,
): Promise<string> {
  const existing = await findConversation(supabase, userId, artistId);
  if (existing) return existing;

  const { data, error: insertError } = await supabase
    .from("conversations")
    .insert({ artist_id: artistId })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return data.id;
}

// A thread is unread when its newest message came from the other side after the viewer's read receipt.
// The inbox (app/messages/layout.tsx) and the nav badge share this rule.
export function isUnread(
  last: { id: number; sender_id: string } | null | undefined,
  lastReadId: number,
  userId: string,
) {
  return !!last && last.sender_id !== userId && last.id > lastReadId;
}

// Nav badges: unread threads, and requests waiting on the viewer (an artist's new requests to
// answer, a client's deliveries to confirm). RLS limits both queries to the viewer's own rows.
export async function navCounts(supabase: SupabaseClient, userId: string) {
  const [threads, requests] = await Promise.all([
    supabase
      .from("conversations")
      .select("messages(id, sender_id), conversation_reads(last_read_id)")
      .eq("conversation_reads.user_id", userId)
      .order("id", { referencedTable: "messages", ascending: false })
      .limit(1, { referencedTable: "messages" }),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .or(`and(artist_id.eq.${userId},status.eq.pending),and(client_id.eq.${userId},status.eq.delivered)`),
  ]);
  // A badge is a nicety: on error, show none rather than break the nav
  const unread = (threads.data ?? []).filter((c) =>
    isUnread(
      (c.messages as { id: number; sender_id: string }[])[0],
      (c.conversation_reads as { last_read_id: number }[])[0]?.last_read_id ?? 0,
      userId,
    ),
  ).length;
  return { unread, requests: requests.count ?? 0 };
}
