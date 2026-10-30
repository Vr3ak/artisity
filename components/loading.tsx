import { Loader2 } from "lucide-react";

// Suspense fallback while a page's data loads
export function Loading() {
  return (
    <div role="status" className="flex justify-center py-16 text-muted-foreground">
      <Loader2 className="size-8 animate-spin motion-reduce:animate-none" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
