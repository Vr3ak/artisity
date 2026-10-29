import { type SupabaseClient } from "@supabase/supabase-js";

// Shared by the server loader and the client chat (a "use client" module can't export values to the server)
export interface ChatMessage {
  id: number;
  body: string;
  sender_id: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
}

export const MESSAGE_COLUMNS =
  "id, body, sender_id, created_at, edited_at, deleted_at, attachment_path, attachment_type, attachment_name, attachment_size";

export const ATTACHMENT_BUCKET = "chat-attachments";
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // bucket file_size_limit

type Person = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

// Everything RealtimeChat needs for one conversation, or null if the viewer can't see it.
export async function loadChat(supabase: SupabaseClient, conversationId: string) {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select(
      "id, client:profiles!conversations_client_id_fkey(id, display_name, username, avatar_url), artist:profiles!conversations_artist_id_fkey(id, display_name, username, avatar_url)",
    )
    .eq("id", conversationId)
    .maybeSingle();
  // 22P02: id isn't a uuid
  if (error && error.code !== "22P02") throw error;
  if (!conversation) return null;

  // ponytail: last 100 messages only; add "load earlier" when threads get long
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("id", { ascending: false })
    .limit(100);
  if (messagesError) throw messagesError;

  const people = [conversation.client, conversation.artist] as unknown as Person[];
  return {
    people,
    names: Object.fromEntries(people.map((p) => [p.id, p.display_name ?? "Unnamed"])),
    messages: (messages as ChatMessage[]).reverse(),
  };
}
