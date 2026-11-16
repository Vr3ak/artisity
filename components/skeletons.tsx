import { cn } from "@/lib/utils";

// Suspense fallbacks shaped like the content they stand in for, so the page keeps its layout
// when the data lands. Bones pulse in a slow wave (each one delayed a little more); reduced
// motion holds them still.

export function Bone({ className, delay = 0, style }: { className?: string; delay?: number; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      style={{ animationDelay: `${delay}ms`, ...style }}
      className={cn("block animate-pulse rounded-full bg-muted motion-reduce:animate-none", className)}
    />
  );
}

function Status({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// Cover heights (width ÷ height), dealt across columns so neighbours differ, like real artwork
const SHAPES = [0.8, 1.25, 0.67, 1, 0.75, 1.5, 0.9, 1.1, 0.7, 1.33, 0.85, 1.2];

function PostCardSkeleton({ ratio, delay }: { ratio: number; delay: number }) {
  return (
    <li className="flex flex-col gap-2">
      <Bone className="w-full rounded-2xl" style={{ aspectRatio: ratio }} delay={delay} />
      <div className="flex flex-col gap-2 px-1 pt-0.5">
        <Bone className="h-4 w-3/4" delay={delay} />
        <div className="flex items-center gap-2">
          <Bone className="size-5" delay={delay} />
          <Bone className="h-3 w-1/3" delay={delay} />
        </div>
      </div>
    </li>
  );
}

// Matches components/masonry.tsx: 2 columns, 3 from md, 4 from xl, same gaps
export function PostGridSkeleton({ count = 12 }: { count?: number }) {
  const columns = [0, 1, 2, 3].map((c) =>
    Array.from({ length: count }, (_, i) => i).filter((i) => i % 4 === c),
  );
  return (
    <Status label="Loading posts…" className="flex items-start gap-3 sm:gap-4">
      {columns.map((col, c) => (
        <ul
          key={c}
          aria-hidden
          className={cn("min-w-0 flex-1 flex-col gap-5 sm:gap-6", c === 2 ? "hidden md:flex" : c === 3 ? "hidden xl:flex" : "flex")}
        >
          {col.map((i) => (
            <PostCardSkeleton key={i} ratio={SHAPES[i % SHAPES.length]} delay={(i % 4) * 120 + Math.floor(i / 4) * 80} />
          ))}
        </ul>
      ))}
    </Status>
  );
}

// The home feed's sticky bar (Filter pill + "Latest work"), then the posts
export function HomeFeedSkeleton() {
  return (
    <>
      <div className="sticky top-16 z-10 -mx-4 flex h-16 items-center gap-3 bg-background px-4">
        <Bone className="h-10 w-24" />
        <p aria-hidden className="text-lg font-bold tracking-tight">Latest work</p>
      </div>
      <PostGridSkeleton />
    </>
  );
}

// The square portfolio tiles on a profile
export function TileGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Status label="Loading posts…" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className="aspect-square rounded-2xl" delay={i * 90} />
      ))}
    </Status>
  );
}

// Inside bg-card the muted fill disappears in the dark theme; the border tone stays visible
const onCard = "bg-border/70";

export function ArtistGridSkeleton() {
  return (
    <Status label="Loading artists…" className="flex flex-col gap-6">
      <div className="flex gap-2 overflow-hidden">
        {[16, 24, 20, 28, 22, 18].map((w, i) => (
          <Bone key={i} className="h-10 shrink-0" style={{ width: `${w * 0.25}rem` }} delay={i * 60} />
        ))}
      </div>
      <ul aria-hidden className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex flex-col gap-4 rounded-3xl bg-card p-5">
            <div className="flex items-center gap-3">
              <Bone className={cn("size-14 shrink-0", onCard)} delay={i * 90} />
              <div className="flex flex-1 flex-col gap-2">
                <Bone className={cn("h-5 w-2/3", onCard)} delay={i * 90} />
                <Bone className={cn("h-3 w-1/3", onCard)} delay={i * 90} />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Bone className={cn("h-7 w-20", onCard)} delay={i * 90} />
              <Bone className={cn("h-7 w-24", onCard)} delay={i * 90} />
            </div>
            <Bone className={cn("h-4 w-24", onCard)} delay={i * 90} />
          </li>
        ))}
      </ul>
    </Status>
  );
}

// components/profile-view.tsx: full-bleed cover, overlapping avatar and name column, tabs
export function ProfileSkeleton() {
  return (
    <Status label="Loading profile…">
      <Bone className="h-44 w-full rounded-none sm:h-56 md:h-72" />
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 md:grid-cols-[18rem_1fr] md:gap-12 md:px-6">
        <div className="flex flex-col gap-5">
          {/* relative: the pulsing cover gets its own paint layer and would cover a static avatar */}
          <span className="relative -mt-16 block size-32 rounded-full border-4 border-background bg-background md:-mt-24 md:size-44">
            <Bone className="size-full" delay={80} />
          </span>
          <div className="flex flex-col gap-2.5">
            <Bone className="h-8 w-48" delay={160} />
            <Bone className="h-4 w-28" delay={160} />
            <Bone className="mt-2 h-4 w-40" delay={240} />
          </div>
          <Bone className="h-11 w-full max-w-72" delay={320} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 md:pt-6">
          <div className="flex gap-6 border-b pb-3">
            {[32, 28, 26].map((w, i) => (
              <Bone key={i} className="h-7" style={{ width: `${w * 0.25}rem` }} delay={i * 80} />
            ))}
          </div>
          <TileGridSkeleton />
        </div>
      </div>
    </Status>
  );
}

// components/inbox.tsx rows
export function InboxSkeleton() {
  return (
    <Status label="Loading conversations…" className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b p-4">
        <p aria-hidden className="text-xl font-bold">Messages</p>
        <Bone className="h-9 w-full" />
      </div>
      <ul aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Bone className="size-12 shrink-0" delay={i * 90} />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-4 w-2/5" delay={i * 90} />
              <Bone className="h-3 w-4/5" delay={i * 90} />
            </div>
          </li>
        ))}
      </ul>
    </Status>
  );
}

// app/requests/page.tsx: a heading per side, then rows
export function RequestListSkeleton() {
  return (
    <Status label="Loading requests…" className="flex flex-col gap-8">
      {[3, 2].map((rows, s) => (
        <div key={s} className="flex flex-col gap-3">
          <Bone className="h-7 w-40" delay={s * 200} />
          <ul aria-hidden className="flex flex-col gap-2">
            {Array.from({ length: rows }, (_, i) => (
              <li key={i} className="flex items-center gap-4 rounded-2xl bg-card px-5 py-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Bone className={cn("h-4 w-1/3", onCard)} delay={s * 200 + i * 90} />
                  <Bone className={cn("h-3 w-1/2", onCard)} delay={s * 200 + i * 90} />
                </div>
                <Bone className={cn("h-7 w-20", onCard)} delay={s * 200 + i * 90} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Status>
  );
}
