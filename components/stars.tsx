import { Star } from "lucide-react";
import { averageRating, cn } from "@/lib/utils";

// Five stars filled to the nearest whole star; decorative, so pair it with the number as text
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex text-primary-ink", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-[1em]", n <= Math.round(value) ? "fill-current" : "opacity-30")} />
      ))}
    </span>
  );
}

// "★★★★☆ 4.3 (12)", or "No reviews yet"
export function RatingSummary({ reviews, className }: { reviews: { rating: number }[]; className?: string }) {
  const avg = averageRating(reviews);
  if (avg === null) return <span className={cn("text-muted-foreground", className)}>No reviews yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Stars value={avg} />
      <span className="font-semibold tabular-nums">
        {avg.toFixed(1)}
        <span className="sr-only"> out of 5</span>
      </span>
      <span className="tabular-nums text-muted-foreground">
        ({reviews.length}
        <span className="sr-only"> {reviews.length === 1 ? "review" : "reviews"}</span>)
      </span>
    </span>
  );
}
