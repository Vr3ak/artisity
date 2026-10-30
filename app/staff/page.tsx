import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReasonLabel } from "@/lib/options";
import { profileHref } from "@/lib/utils";
import { ResolveButton } from "./resolve-button";
import { Loading } from "@/components/loading";

type Person = { id: string; display_name: string | null; username: string | null; role: string | null } | null;

async function Users() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.sub)
    .single();
  if (me?.role !== "admin") notFound();

  // RLS "select own, artists, or staff" returns every row for admins
  const [{ data: users, error }, { data: reports, error: reportsError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, role, location, business_name, business_type, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select(
        "id, reason, details, created_at, reporter:profiles!reports_reporter_id_fkey(id, display_name, username, role), reported:profiles!reports_reported_id_fkey(id, display_name, username, role)",
      )
      .is("resolved_at", null)
      .order("created_at"),
  ]);
  if (error) throw error;
  if (reportsError) throw reportsError;

  // Only artist profiles have a public page
  const person = (p: Person) => {
    if (!p) return "Deleted account";
    const label = p.display_name ?? p.username ?? "Unnamed";
    return p.role === "artist" ? (
      <Link href={profileHref(p)} className="font-semibold underline-offset-4 hover:underline">
        {label}
      </Link>
    ) : (
      <strong>
        {label}
        {p.username && <span className="font-normal text-muted-foreground"> @{p.username}</span>}
      </strong>
    );
  };

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Open reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to review.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-2xl bg-card p-4 text-sm">
                <p>
                  {person(r.reported as unknown as Person)} reported for{" "}
                  <strong>{reportReasonLabel(r.reason)}</strong> by {person(r.reporter as unknown as Person)}
                  <span className="text-muted-foreground"> · {new Date(r.created_at).toLocaleString()}</span>
                </p>
                {r.details && <p className="whitespace-pre-line text-muted-foreground">{r.details}</p>}
                <div className="flex items-center gap-3">
                  <ResolveButton reportId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <h2 className="text-xl font-semibold">Users</h2>
      <table className="w-full text-left text-sm">
        <thead className="border-b">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Role</th>
            <th className="p-2">Location</th>
            <th className="p-2">Business</th>
            <th className="p-2">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="p-2">{u.display_name ?? "—"}</td>
              <td className="p-2">{u.role ?? "onboarding"}</td>
              <td className="p-2">{u.location ?? "—"}</td>
              <td className="p-2">
                {[u.business_name, u.business_type].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="p-2">{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-5">
      <h1 className="text-2xl font-semibold">Staff</h1>
      <Suspense fallback={<Loading />}>
        <Users />
      </Suspense>
    </main>
  );
}
