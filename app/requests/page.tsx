import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/options";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/loading";

type Request = {
  id: string;
  client_id: string;
  category: string;
  budget: number | null;
  currency: string;
  status: string;
  created_at: string;
  client: { display_name: string | null };
  artist: { display_name: string | null };
};

function RequestList({ title, requests, other }: { title: string; requests: Request[]; other: "client" | "artist" }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {requests.map((r) => (
            <li key={r.id}>
              <Link href={`/requests/${r.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm hover:bg-muted">
                <span className="font-medium">{r[other].display_name ?? "Unnamed"}</span>
                <span className="text-muted-foreground">{categoryLabel(r.category)}</span>
                {r.budget != null && <span>{formatPrice(r.budget, r.budget, r.currency)}</span>}
                <Badge variant="secondary" className="ml-auto capitalize">
                  {r.status}
                </Badge>
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
      {received.length > 0 && <RequestList title="Received" requests={received} other="client" />}
      <RequestList title="Sent" requests={sent} other="artist" />
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5">
      <h1 className="text-2xl font-semibold">Requests</h1>
      <Suspense fallback={<Loading />}>
        <Requests />
      </Suspense>
    </main>
  );
}
