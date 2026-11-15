import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/options";
import { formatPrice } from "@/lib/utils";
import { RequestStatus } from "@/components/request-status";
import { Loading } from "@/components/loading";

type Request = {
  id: string;
  client_id: string;
  category: string;
  budget: number | null;
  currency: string;
  status: string;
  created_at: string;
  client: { display_name: string | null } | null;
  artist: { display_name: string | null } | null;
};

function RequestList({
  title,
  requests,
  other,
  empty,
}: {
  title: string;
  requests: Request[];
  other: "client" | "artist";
  empty: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
        {title}
        <span className="ml-1.5 align-middle text-sm font-semibold tabular-nums text-muted-foreground">
          {requests.length}
        </span>
      </h2>
      {requests.length === 0 ? (
        empty
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="flex items-center gap-4 rounded-2xl bg-card px-5 py-4 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* The other side's profile can be hidden by RLS (e.g. no shared conversation) */}
                  <span className="truncate font-semibold">{r[other] ? (r[other].display_name ?? "Unnamed") : other === "client" ? "Client" : "Artist"}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {categoryLabel(r.category)}
                    {r.budget != null && <> · {formatPrice(r.budget, r.budget, r.currency)}</>}
                    {" · "}
                    {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                </span>
                <RequestStatus status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function Requests() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  // RLS returns only requests the viewer is part of
  const { data: requests, error } = await supabase
    .from("requests")
    .select(
      "id, client_id, category, budget, currency, status, created_at, client:profiles!requests_client_id_fkey(display_name), artist:profiles!requests_artist_id_fkey(display_name)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const all = requests as unknown as Request[];
  const received = all.filter((r) => r.client_id !== user.sub);
  const sent = all.filter((r) => r.client_id === user.sub);

  return (
    <>
      {received.length > 0 && (
        <RequestList title="Received" requests={received} other="client" empty={null} />
      )}
      <RequestList
        title="Sent"
        requests={sent}
        other="artist"
        empty={
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-5">
            <p className="text-muted-foreground">
              You haven&apos;t sent a request yet. Find an artist and request a commission from their profile.
            </p>
            <Link
              href="/artists"
              className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              Find an artist
            </Link>
          </div>
        }
      />
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 md:py-10">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Requests</h1>
      <Suspense fallback={<Loading />}>
        <Requests />
      </Suspense>
    </main>
  );
}
