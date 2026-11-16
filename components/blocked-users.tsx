"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorText, profileHref } from "@/lib/utils";

export type BlockedUser = {
  id: string;
  // null when RLS hides them (a blocked client you never shared a conversation with)
  profile: { display_name: string | null; username: string | null; avatar_url: string | null; role: string | null } | null;
};

// Everyone you've blocked, with Unblock (same delete as the Report/Block menu in safety-menu.tsx).
// Rows leave the list right away; a failure puts the row back with the error.
export function BlockedUsers({ initial }: { initial: BlockedUser[] }) {
  const [users, setUsers] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unblock = async (id: string) => {
    setBusy(id);
    setError(null);
    const { error } = await createClient().from("blocks").delete().eq("blocked_id", id);
    setBusy(null);
    if (error) return setError(errorText(error, "Couldn't unblock. Try again."));
    setUsers((us) => us.filter((u) => u.id !== id));
  };

  if (users.length === 0)
    return <p className="text-sm text-muted-foreground">You haven&apos;t blocked anyone.</p>;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border">
        {users.map(({ id, profile }) => {
          const name = profile?.display_name ?? "A user you blocked";
          const label = (
            <>
              <span className="size-10 shrink-0 overflow-hidden rounded-full bg-secondary">
                {profile?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{name}</span>
                {profile?.username && <span className="truncate text-sm text-muted-foreground">@{profile.username}</span>}
              </span>
            </>
          );
          return (
            <li key={id} className="flex items-center gap-3 py-3">
              {/* Only artist profiles are public pages */}
              {profile?.role === "artist" ? (
                <Link href={profileHref({ id, username: profile.username })} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                  {label}
                </Link>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-3">{label}</span>
              )}
              <button
                type="button"
                onClick={() => unblock(id)}
                disabled={busy !== null}
                aria-label={`Unblock ${name}`}
                className="inline-flex h-10 shrink-0 items-center rounded-full bg-secondary px-4 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {busy === id ? "Unblocking…" : "Unblock"}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
