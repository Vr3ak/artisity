"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FormError } from "@/components/auth-parts";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Mirrors private.check_request_transition, which is the real guard
const ACTIONS: Record<"artist" | "client", Record<string, { to: string; label: string }[]>> = {
  artist: {
    pending: [
      { to: "accepted", label: "Accept" },
      { to: "declined", label: "Decline" },
    ],
    accepted: [
      { to: "delivered", label: "Mark delivered" },
      { to: "cancelled", label: "Cancel" },
    ],
  },
  client: {
    pending: [{ to: "cancelled", label: "Cancel request" }],
    accepted: [{ to: "cancelled", label: "Cancel" }],
    delivered: [{ to: "completed", label: "Mark completed" }],
  },
};

// What the viewer is waiting on or expected to do next, per side and status
const HINTS: Record<"artist" | "client", Record<string, string>> = {
  artist: {
    pending: "Accept to start the work, or decline if it isn't a fit.",
    accepted: "Mark it delivered once you've sent the final files.",
    delivered: "Waiting for the client to confirm they received the work.",
  },
  client: {
    pending: "Waiting for the artist to accept or decline.",
    accepted: "The artist is working on it.",
    delivered: "Mark it completed once you've received the final work.",
  },
};

const pill =
  "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export function RequestActions({
  requestId,
  status,
  side,
}: {
  requestId: string;
  status: string;
  side: "artist" | "client";
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const actions = ACTIONS[side][status] ?? [];
  const hint = HINTS[side][status];
  if (actions.length === 0 && !hint) return null;

  const update = async (to: string) => {
    setIsLoading(true);
    setError(null);
    const { error } = await createClient()
      .from("requests")
      .update({ status: to })
      .eq("id", requestId);
    if (error) setError(error.message);
    else router.refresh();
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-5">
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            // Moving the request forward is the main action; cancelling or declining stays quiet
            const closes = a.to === "cancelled" || a.to === "declined";
            return (
              <button
                key={a.to}
                type="button"
                disabled={isLoading}
                onClick={() => update(a.to)}
                className={cn(
                  pill,
                  closes
                    ? "border border-input text-foreground hover:bg-secondary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}
      <FormError message={error} />
    </div>
  );
}
