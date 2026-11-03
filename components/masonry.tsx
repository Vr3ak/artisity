"use client";

import { masonryLayout } from "@/lib/utils";
import { Children, isValidElement, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Pinterest/vgen-style columns. Each item goes to the currently shortest column, in feed order, so a
// newest-first feed keeps its newest posts near the top and the columns end level (CSS `columns`
// would read top-to-bottom instead). Heights are measured after render; until then every item
// counts as 1, which deals them round-robin.
// 2 columns on phones, 3 from md, 4 from xl. The server renders 2 (most visitors are on phones),
// so wider screens re-deal once after hydration.
// ponytail: measured heights, so cards below the fold can shift once their lazy image loads. Store
// image sizes on posts to place them before load.
const WIDE = "(min-width: 1280px)";
const MEDIUM = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const queries = [WIDE, MEDIUM].map((q) => matchMedia(q));
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}
const columnCount = () => (matchMedia(WIDE).matches ? 4 : matchMedia(MEDIUM).matches ? 3 : 2);

export function Masonry({ children }: { children: React.ReactNode }) {
  const n = useSyncExternalStore(subscribe, columnCount, () => 2);
  const items = Children.toArray(children);
  const keys = items.map((item, i) => String((isValidElement(item) && item.key) ?? i));
  const [heights, setHeights] = useState<Record<string, number>>({});
  const cols = masonryLayout(keys, n, heights);
  const ref = useRef<HTMLDivElement>(null);

  // Re-measure whenever a card resizes (image loaded, window resized). Cards whose image hasn't
  // loaded yet keep their last height, so a card moved to another column (remounted, image
  // reloading) doesn't bounce back.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cards = [...el.children].map((col) => [...col.children] as HTMLElement[]);
    const measure = () =>
      setHeights((prev) => {
        const next = { ...prev };
        cards.forEach((col, c) =>
          col.forEach((card, j) => {
            if (card.querySelector("img")?.complete === false) return;
            next[keys[cols[c][j]]] = card.offsetHeight;
          }),
        );
        return keys.every((k) => next[k] === prev[k]) ? prev : next;
      });
    const observer = new ResizeObserver(measure);
    cards.flat().forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  });

  return (
    <div ref={ref} className="flex items-start gap-3 sm:gap-4">
      {cols.map((col, c) => (
        <ul key={c} className="flex min-w-0 flex-1 flex-col gap-5 sm:gap-6">
          {col.map((i) => items[i])}
        </ul>
      ))}
    </div>
  );
}
