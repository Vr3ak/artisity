"use client";

import { useEffect, useRef, useState } from "react";
import { PanelLeftClose, SlidersHorizontal } from "lucide-react";
import { CategoryChips } from "@/components/category-chips";
import { Masonry } from "@/components/masonry";
import { PostCard, type Card } from "@/components/post-card";
import { categoryLabel } from "@/lib/options";
import { KHR_PER_USD, PRICE_RANGES, cn, inPriceRange } from "@/lib/utils";

// behance.net's explore toolbar: a bar docks under the nav (h-16) over the feed. Once the page's
// #home-services list scrolls away, a one-row copy of the services fades into it (swipe or ‹ ›).
// Services filter the posts by tag on the server (`?category=`, see app/page.tsx); Filter opens a
// sidebar (stacked above the feed on phones) that narrows them by price.
// ponytail: filters the loaded posts client-side; move to the query once the feed paginates.
export function HomeFeed({
  cards,
  liked,
  viewerId,
  category,
}: {
  cards: Card[];
  liked: string[];
  viewerId: string | undefined;
  category: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [docked, setDocked] = useState(false);
  const range = price === null ? null : PRICE_RANGES[price];
  const shown = range ? cards.filter((c) => inPriceRange(c.service, range)) : cards;
  const likedSet = new Set(liked);
  const feedTop = useRef<HTMLDivElement>(null);

  // Picked from the docked row deep in the feed: put the top of the new results under the bar
  useEffect(() => {
    const top = feedTop.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 128) window.scrollBy({ top: top - 128 });
  }, [category]);

  useEffect(() => {
    const target = document.getElementById("home-services");
    if (!target) return;
    // -128px: the nav (h-16) plus this bar (h-16) cover that strip
    const io = new IntersectionObserver(
      ([e]) => setDocked(!e.isIntersecting && e.boundingClientRect.top < 128),
      { rootMargin: "-128px 0px 0px 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  const fade = "transition-opacity duration-200 ease-out [grid-area:1/1] motion-reduce:transition-none";
  return (
    <>
      <div className="sticky top-16 z-10 -mx-4 flex h-16 items-center gap-3 bg-background px-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="feed-filters"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex h-10 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            open && "bg-secondary",
          )}
        >
          {open ? <PanelLeftClose className="size-4" /> : <SlidersHorizontal className="size-4" />}
          Filter
          {range && <span className="size-2 rounded-full bg-primary" aria-label="(1 active)" />}
        </button>
        <div className="grid min-w-0 flex-1 items-center">
          <h2 className={cn(fade, "truncate text-lg font-bold tracking-tight", docked && "opacity-0")} aria-hidden={docked}>
            Latest work
          </h2>
          <div className={cn(fade, "-mr-4 min-w-0 md:mr-0", !docked && "pointer-events-none opacity-0")} inert={!docked}>
            <CategoryChips row feed withAll active={category} bleed="pr-4 md:pr-0" />
          </div>
        </div>
      </div>

      {/* Filter slides like behance.net's: the sidebar's grid track grows (rows on phones, a column
          from md) so the feed glides aside, while the panel inside, already at full size, is
          uncovered and eases in a beat behind. Exit is quicker than entry. Reduced motion snaps the
          tracks and keeps only the fade. */}
      <div
        ref={feedTop}
        data-open={open}
        className="group/filters grid grid-rows-[0fr_auto] transition-[grid-template-rows,grid-template-columns,row-gap,column-gap] duration-200 ease-in data-[open=true]:grid-rows-[1fr_auto] data-[open=true]:gap-y-6 data-[open=true]:duration-[400ms] data-[open=true]:ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:grid-cols-[0rem_minmax(0,1fr)] md:grid-rows-1 md:data-[open=true]:grid-cols-[14rem_minmax(0,1fr)] md:data-[open=true]:grid-rows-1 md:data-[open=true]:gap-x-6 md:data-[open=true]:gap-y-0"
      >
        <aside
          id="feed-filters"
          inert={!open}
          className="min-h-0 min-w-0 overflow-hidden md:sticky md:top-32 md:self-start"
        >
          <div className="-translate-y-2 opacity-0 transition-[opacity,transform] duration-150 ease-in group-data-[open=true]/filters:translate-x-0 group-data-[open=true]/filters:translate-y-0 group-data-[open=true]/filters:opacity-100 group-data-[open=true]/filters:delay-75 group-data-[open=true]/filters:duration-300 group-data-[open=true]/filters:ease-[cubic-bezier(0.16,1,0.3,1)] p-1 motion-reduce:translate-y-0 md:w-56 md:-translate-x-6 md:translate-y-0 motion-reduce:md:translate-x-0">
            <fieldset className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <legend className="font-semibold">Starting price</legend>
                {range && (
                  <button type="button" onClick={() => setPrice(null)} className="text-sm text-primary-ink underline-offset-4 hover:underline">
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:flex-col">
                {PRICE_RANGES.map((r, i) => (
                  <label
                    key={r.label}
                    className="flex cursor-pointer items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                  >
                    <input
                      type="radio"
                      name="price"
                      className="sr-only"
                      checked={price === i}
                      onChange={() => setPrice(i)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Riel prices count at {KHR_PER_USD.toLocaleString("en-US")} ៛ per $1.</p>
            </fieldset>
          </div>
        </aside>
        <div className="min-w-0">
          {shown.length === 0 ? (
            <p className="text-muted-foreground">
              {cards.length > 0
                ? "No posts start in that price range."
                : category
                  ? `No ${categoryLabel(category)} posts yet.`
                  : "No posts yet."}
            </p>
          ) : (
            <Masonry>
              {shown.map((card) => (
                <PostCard key={card.postId} card={card} liked={likedSet.has(card.postId)} viewerId={viewerId} />
              ))}
            </Masonry>
          )}
        </div>
      </div>
    </>
  );
}
