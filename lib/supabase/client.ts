import { createBrowserClient } from "@supabase/ssr";

// Local Realtime rejects sb_publishable_ keys on the websocket (MalformedJWT); the hosted
// gateway accepts them. NEXT_PUBLIC_SUPABASE_REALTIME_KEY (the local legacy anon JWT) works around it.
const realtimeKey = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_KEY;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    realtimeKey ? { realtime: { params: { apikey: realtimeKey } } } : undefined,
  );
}
