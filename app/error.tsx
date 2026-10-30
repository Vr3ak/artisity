"use client";

// Shown when a page throws (a failed query, etc.) instead of Next's bare "Application error"
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">This page didn&apos;t load. Try again in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
      >
        Try again
      </button>
    </main>
  );
}
