"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResolveButton({ reportId }: { reportId: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const resolve = async () => {
    setBusy(true);
    setError(null);
    const { error } = await createClient()
      .from("reports")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", reportId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={resolve}
        disabled={busy}
        className="h-9 rounded-full bg-secondary px-4 text-sm font-semibold hover:bg-accent disabled:opacity-50"
      >
        {busy ? "Resolving…" : "Resolve"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
