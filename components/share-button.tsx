"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Phones open the system share sheet (Telegram, Messenger…); elsewhere the link is copied.
// `path` is site-relative; the absolute URL comes from the current origin.
export function ShareButton({ title, path, className }: { title: string; path: string; className: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = new URL(path, location.origin).href;
    if (navigator.share) {
      // Dismissing the sheet rejects with AbortError; nothing to report
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button type="button" onClick={share} aria-label={`Share ${title}`} title="Share" className={cn("relative", className)}>
      {copied ? <Check className="size-5" /> : <Share2 className="size-5" />}
      {/* Seen above the button, and announced */}
      <span
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background shadow-float transition-opacity duration-150",
          !copied && "opacity-0",
        )}
      >
        {copied ? "Link copied" : ""}
      </span>
    </button>
  );
}
