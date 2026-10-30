import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/options";
import { postImagePaths, profileHref, profileImageUrl } from "@/lib/utils";
import { Avatar } from "@/components/tab-bar";
import { DeletePostButton } from "@/components/delete-post-button";
import { MessageButton } from "@/components/message-button";
import { Loading } from "@/components/loading";

type Artist = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

const pillClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors";
const circleClass =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-accent disabled:opacity-50";

async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select(
      "id, title, caption, category, image_path, image_count, created_at, artist:profiles!posts_artist_id_fkey(id, username, display_name, avatar_url)",
    )
    .eq("id", id)
    .maybeSingle();
  // 22P02: id isn't a uuid
  if (error && error.code !== "22P02") throw error;
  // No artist: the poster stopped being an artist, so RLS hides their profile
  if (!post?.artist) notFound();

  const artist = post.artist as unknown as Artist;
  const imagePaths = postImagePaths(post.image_path, post.image_count);
  const name = artist.display_name ?? "Unnamed";
  const { data: claims } = await supabase.auth.getClaims();
  const viewerId = claims?.claims.sub;
  const isOwn = viewerId === artist.id;
  const requestHref = viewerId
    ? `/requests/new?artist=${artist.id}${post.category ? `&category=${post.category}` : ""}`
    : "/auth/login";

  return (
    <article className="grid gap-8 md:grid-cols-[3fr_2fr] md:gap-12">
      {/* ponytail: images stacked like a Behance project; add a carousel if long posts feel heavy */}
      <div className="flex flex-col gap-3">
        {imagePaths.map((path, i) => (
          <div key={path} className="overflow-hidden rounded-3xl bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profileImageUrl(path)}
              alt={imagePaths.length > 1 ? `${post.title}, image ${i + 1} of ${imagePaths.length}` : post.title}
              loading={i ? "lazy" : undefined}
              className="max-h-[80dvh] w-full object-contain"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5 md:sticky md:top-20 md:self-start">
        <Link
          href={profileHref(artist)}
          className="flex w-fit items-center gap-3 rounded-full py-1 pl-1 pr-4 hover:bg-secondary"
        >
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-secondary">
            <Avatar url={artist.avatar_url} className="size-10" />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold leading-tight">{name}</span>
            {artist.username && (
              <span className="text-sm text-muted-foreground">@{artist.username}</span>
            )}
          </span>
        </Link>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{post.title}</h1>
          <p className="text-sm text-muted-foreground">
            {post.category && <>{categoryLabel(post.category)} · </>}
            {new Date(post.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </p>
        </div>

        {post.caption && <p className="whitespace-pre-line leading-relaxed">{post.caption}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {isOwn ? (
            <DeletePostButton
              postId={post.id}
              imagePaths={imagePaths}
              className={`${pillClass} border border-input text-destructive hover:bg-secondary`}
            />
          ) : (
            <>
              <Link
                href={requestHref}
                className={`${pillClass} flex-1 bg-foreground text-background hover:bg-foreground/90`}
              >
                Request commission
              </Link>
              {viewerId ? (
                <MessageButton userId={viewerId} artistId={artist.id} artistName={name} className={circleClass} />
              ) : (
                <Link href="/auth/login" aria-label={`Message ${name}`} title="Message" className={circleClass}>
                  <MessageCircle className="size-5" />
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 md:px-6 md:pt-10">
      <Suspense fallback={<Loading />}>
        <Post params={params} />
      </Suspense>
    </main>
  );
}
