"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  if (actions.length === 0) return null;

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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a, i) => (
          <Button
            key={a.to}
            variant={i === 0 ? "default" : "outline"}
            disabled={isLoading}
            onClick={() => update(a.to)}
          >
            {a.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
