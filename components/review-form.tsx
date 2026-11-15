"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FormError } from "@/components/auth-parts";
import { fieldClass, pillClass } from "@/components/flow";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"];

export type Review = { id: string; rating: number; comment: string };

// The client's rating of a completed request. Stars are radio inputs, so arrow keys work.
export function ReviewForm({
  requestId,
  artistId,
  category,
  review,
}: {
  requestId: string;
  artistId: string;
  category: string;
  review: Review | null;
}) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const shown = hover || rating;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setError("Pick a star rating.");
    setBusy(true);
    setError(null);
    const reviews = createClient().from("reviews");
    const values = { rating, comment: comment.trim() };
    const { error } = review
      ? await reviews.update(values).eq("id", review.id)
      : await reviews.insert({ ...values, request_id: requestId, artist_id: artistId, category });
    setBusy(false);
    if (error) return setError(error.message);
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t pt-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">
          {review ? "Your review" : "How was working with this artist?"}
        </legend>
        <div className="flex items-center gap-3">
          <div className="flex" onMouseLeave={() => setHover(0)}>
            {LABELS.map((label, i) => (
              <label key={label} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(i + 1)}>
                <input
                  type="radio"
                  name="rating"
                  value={i + 1}
                  checked={rating === i + 1}
                  onChange={() => {
                    setRating(i + 1);
                    setSaved(false);
                  }}
                  className="peer sr-only"
                />
                <span className="sr-only">
                  {i + 1} {i ? "stars" : "star"}, {label}
                </span>
                <Star
                  aria-hidden
                  className={cn(
                    "size-8 rounded text-primary-ink transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                    i < shown ? "fill-current" : "opacity-30",
                  )}
                />
              </label>
            ))}
          </div>
          {shown > 0 && <span className="text-sm text-muted-foreground">{LABELS[shown - 1]}</span>}
        </div>
      </fieldset>
      <textarea
        aria-label="Review (optional)"
        placeholder="Tell others about the result, communication and timing (optional)"
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setSaved(false);
        }}
        maxLength={1000}
        rows={3}
        className={cn(fieldClass, "h-auto resize-none py-3")}
      />
      <FormError message={error} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={cn(pillClass.final, "h-11 w-auto px-6")}>
          {busy ? "Saving…" : review ? "Update review" : "Post review"}
        </button>
        {saved && (
          <span role="status" className="text-sm text-muted-foreground">
            Thanks! Your review is on their profile.
          </span>
        )}
      </div>
    </form>
  );
}
