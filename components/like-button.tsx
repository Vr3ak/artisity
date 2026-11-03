"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Heart toggle for a post. Optimistic: flips at once, writes post_likes under RLS, then refreshes the
// route so server-rendered hearts elsewhere (feed, favorites) agree. A failed write flips back and
// says why in a toast; it's portalled to <body> because cards are isolated stacking contexts.
// Signed-out visitors get the login modal instead.
export function LikeButton({
  postId,
  title,
  liked: serverLiked,
  signedIn,
  className,
}: {
  postId: string;
  title: string;
  liked: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(serverLiked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Take the server's value whenever it changes (after a refresh, or Back to a cached page)
  const [seen, setSeen] = useState(serverLiked);
  if (serverLiked !== seen) {
    setSeen(serverLiked);
    setLiked(serverLiked);
  }

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  async function toggle() {
    if (!signedIn) return router.push("/auth/login");
    if (busy) return;
    const next = !liked;
    setLiked(next);
    setBusy(true);
    setError(null);
    const likes = createClient().from("post_likes");
    const { error } = next
      ? await likes.insert({ post_id: postId })
      : await likes.delete().eq("post_id", postId);
    setBusy(false);
    // 23505: already liked (another tab), so the heart is right as it is
    if (error && error.code !== "23505") {
      setLiked(!next);
      setError(
        error.code === "23503"
          ? "This post was removed."
          : error.code === "42501" || error.code === "PGRST301"
            ? "Your session ended. Sign in again to like posts."
            : "Couldn't save your like. Check your connection and try again.",
      );
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={liked}
        aria-label={`Like ${title}`}
        title={liked ? "Unlike" : "Like"}
        data-liked={liked}
        className={cn(
          "flex items-center justify-center rounded-full transition-[transform,background-color,color,opacity] duration-150 ease-out active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
          className,
        )}
      >
        <Heart
          className={cn(
            "size-5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            liked && "scale-110 fill-current",
          )}
        />
      </button>
      {error &&
        createPortal(
          // Above the phone tab bar; bottom-right from md up
          <p
            role="alert"
            className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-float animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none md:inset-x-auto md:bottom-6 md:right-6 md:max-w-sm"
          >
            {error}
          </p>,
          document.body,
        )}
    </>
  );
}
