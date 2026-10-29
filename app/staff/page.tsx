import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

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
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, location, business_name, business_type, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
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
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-5">
      <h1 className="text-2xl font-semibold">Users</h1>
      <Suspense>
        <Users />
      </Suspense>
    </main>
  );
}
