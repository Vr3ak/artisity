import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/options";
import { formatPrice } from "@/lib/utils";
import { loadChat } from "@/lib/chat";
import { findConversation } from "@/lib/conversations";
import { Badge } from "@/components/ui/badge";
import { RealtimeChat } from "@/components/realtime-chat";
import { RequestActions } from "@/components/request-actions";
import { Loading } from "@/components/loading";

async function Request({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const { data: request, error } = await supabase
    .from("requests")
    .select(
      "id, client_id, artist_id, category, brief, budget, currency, deadline, status, created_at, client:profiles!requests_client_id_fkey(display_name), artist:profiles!requests_artist_id_fkey(display_name)",
    )
    .eq("id", id)
    .maybeSingle();
  // 22P02: id isn't a uuid
  if (error && error.code !== "22P02") throw error;
  if (!request) notFound();

  const side = request.artist_id === user.sub ? "artist" : "client";
  const other = (side === "artist"
    ? request.client
    : request.artist) as unknown as { display_name: string | null };
  // RLS shows contact_methods only to the owner and their request partners
  const { data: contact } = await supabase
    .from("contact_methods")
    .select("telegram, facebook, instagram")
    .eq("user_id", side === "artist" ? request.client_id : request.artist_id)
    .maybeSingle();
  const contactLinks = contact
    ? [
        contact.telegram && {
          label: "Telegram",
          href: `https://t.me/${contact.telegram}`,
        },
        contact.facebook && {
          label: "Facebook",
          href: `https://facebook.com/${contact.facebook}`,
        },
        contact.instagram && {
          label: "Instagram",
          href: `https://instagram.com/${contact.instagram}`,
        },
      ].filter((l): l is { label: string; href: string } => !!l)
    : [];

  // The request form opens this thread; it may have been started from either side
  const conversationId = await findConversation(
    supabase,
    request.client_id,
    request.artist_id,
  );
  const chat = conversationId && (await loadChat(supabase, conversationId));

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">
            {categoryLabel(request.category)}
          </h1>
          <Badge variant="secondary" className="capitalize">
            {request.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {side === "artist" ? "From" : "To"} {other.display_name ?? "Unnamed"}{" "}
          · {new Date(request.created_at).toLocaleDateString()}
        </p>
        <p className="whitespace-pre-line">{request.brief}</p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {request.budget != null && (
            <div>
              <dt className="inline text-muted-foreground">Budget: </dt>
              <dd className="inline">
                {formatPrice(request.budget, request.budget, request.currency)}
              </dd>
            </div>
          )}
          {request.deadline && (
            <div>
              <dt className="inline text-muted-foreground">Deadline: </dt>
              <dd className="inline">
                {new Date(`${request.deadline}T00:00`).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
        {contactLinks.length > 0 && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Contact:</span>
            {contactLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {l.label}
              </a>
            ))}
          </p>
        )}
        <RequestActions
          requestId={request.id}
          status={request.status}
          side={side}
        />
      </div>

      {chat && conversationId && (
        <section className="flex h-[32rem] flex-col overflow-hidden rounded-lg border">
          <RealtimeChat
            conversationId={conversationId}
            userId={user.sub}
            partnerName={other.display_name ?? "Unnamed"}
            messages={chat.messages}
          />
        </section>
      )}
    </>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5">
      <Suspense fallback={<Loading />}>
        <Request params={params} />
      </Suspense>
    </main>
  );
}
