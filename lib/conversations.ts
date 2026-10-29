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
