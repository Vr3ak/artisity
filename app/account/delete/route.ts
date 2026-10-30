import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENT_BUCKET } from "@/lib/chat";

// Every file path under prefix. Storage list() isn't recursive; folders come back with id null.
// ponytail: list() caps at 1000 entries per folder; page with offset if a folder ever holds more
async function listFiles(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  const nested = await Promise.all(
    data.map((f) =>
      f.id ? [`${prefix}/${f.name}`] : listFiles(admin, bucket, `${prefix}/${f.name}`),
    ),
  );
  return nested.flat();
}

// Deletes the signed-in user. Every table cascades from auth.users, but SQL can't delete
// Storage files, so their images and the attachments of their (cascade-deleted)
// conversations are removed here with the secret key.
export async function POST(request: NextRequest) {
  // Same-origin only: the session cookie alone mustn't be enough to delete an account
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims.sub;
  if (!uid) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Collect paths first: the conversations are gone once the user is.
  // RLS limits this to the user's own threads.
  const { data: conversations, error } = await supabase.from("conversations").select("id");
  if (error) return new Response(error.message, { status: 500 });
  const [images, attachments] = await Promise.all([
    listFiles(admin, "profile-images", uid),
    Promise.all(conversations.map((c) => listFiles(admin, ATTACHMENT_BUCKET, c.id))),
  ]);

  const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
  if (deleteError) return new Response(deleteError.message, { status: 500 });

  // The account is gone either way; leftover files are only a cleanup job, so log rather than fail.
  for (const [bucket, paths] of [
    ["profile-images", images],
    [ATTACHMENT_BUCKET, attachments.flat()],
  ] as const) {
    if (paths.length === 0) continue;
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) console.error(`account delete: ${bucket} cleanup failed for ${uid}`, error, paths);
  }

  // The refresh token died with the user, so only clear the cookies
  await supabase.auth.signOut({ scope: "local" });
  return new Response(null, { status: 204 });
}
