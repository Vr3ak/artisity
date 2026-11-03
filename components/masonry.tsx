"use client";

import { Children, useSyncExternalStore } from "react";

// Pinterest/vgen-style columns. Items are dealt left to right (item i goes to column i % n), so a
// newest-first feed keeps its newest posts along the top row, which CSS `columns` would not.
// 2 columns on phones, 3 from md, 4 from xl. The server renders 2 (most visitors are on phones),
// so wider screens re-deal once after hydration.
// ponytail: round-robin, not shortest-column; columns can end unevenly. Store image sizes on posts
// to balance them.
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
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      {Array.from({ length: n }, (_, c) => (
        <ul key={c} className="flex min-w-0 flex-1 flex-col gap-5 sm:gap-6">
          {items.filter((_, i) => i % n === c)}
        </ul>
      ))}
    </div>
  );
}
