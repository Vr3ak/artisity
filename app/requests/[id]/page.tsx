import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/options";
import { contactLinks, formatPrice, profileHref } from "@/lib/utils";
import { loadChat } from "@/lib/chat";
import { findConversation } from "@/lib/conversations";
import { RequestStatus } from "@/components/request-status";
import { RealtimeChat } from "@/components/realtime-chat";
import { RequestActions } from "@/components/request-actions";
import { Loading } from "@/components/loading";
import { ReviewForm } from "@/components/review-form";
import { Stars } from "@/components/stars";

async function Request({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const { data: request, error } = await supabase
    .from("requests")
    .select(
      "id, client_id, artist_id, category, brief, budget, currency, deadline, status, created_at, client:profiles!requests_client_id_fkey(display_name), artist:profiles!requests_artist_id_fkey(display_name, username)",
    )
    .eq("id", id)
    .maybeSingle();
  // 22P02: id isn't a uuid
  if (error && error.code !== "22P02") throw error;
  if (!request) notFound();

  const side = request.artist_id === user.sub ? "artist" : "client";
  // The client's profile can be hidden from the artist by RLS (no shared conversation), so allow null
  const other = (side === "artist" ? request.client : request.artist) as unknown as {
    display_name: string | null;
    username?: string | null;
  } | null;
  const otherName = other ? (other.display_name ?? "Unnamed") : side === "artist" ? "Client" : "Artist";
  // RLS shows contact_methods to request partners (and publicly for artists)
  const { data: contact } = await supabase
    .from("contact_methods")
    .select("telegram, facebook, instagram")
    .eq("user_id", side === "artist" ? request.client_id : request.artist_id)
    .maybeSingle();
  const links = contactLinks(contact);
  const { data: review } =
    request.status === "completed"
      ? await supabase.from("reviews").select("id, rating, comment").eq("request_id", request.id).maybeSingle()
      : { data: null };

  // The request form opens this thread; it may have been started from either side
  const conversationId = await findConversation(
    supabase,
    request.client_id,
    request.artist_id,
  );
  const chat = conversationId && (await loadChat(supabase, conversationId));

  const date = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });

  return (
    <>
      <Link
        href="/requests"
        className="-ml-2 inline-flex w-fit items-center gap-1 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        All requests
      </Link>

      <article className="flex flex-col gap-6 rounded-3xl bg-card p-6 sm:p-8">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{categoryLabel(request.category)}</h1>
            <RequestStatus status={request.status} />
          </div>
          <p className="text-muted-foreground">
            {side === "artist" ? "From " : "To "}
            {side === "client" && other ? (
              <Link
                href={profileHref({ id: request.artist_id, username: other.username })}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {otherName}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{otherName}</span>
            )}
            {" · "}
            {date(request.created_at)}
          </p>
        </header>

        <p className="max-w-prose whitespace-pre-line leading-relaxed">{request.brief}</p>

        {(request.budget != null || request.deadline || links.length > 0) && (
          <dl className="grid gap-4 rounded-2xl bg-secondary/60 p-4 text-sm sm:grid-cols-3">
            {request.budget != null && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Budget</dt>
                <dd className="font-semibold tabular-nums">
                  {formatPrice(request.budget, request.budget, request.currency)}
                </dd>
              </div>
            )}
            {request.deadline && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Deadline</dt>
                <dd className="font-semibold">{date(`${request.deadline}T00:00`)}</dd>
              </div>
            )}
            {links.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="flex flex-wrap gap-x-3 font-semibold">
                  {links.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-primary-ink"
                    >
                      {l.label}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}

        <RequestActions requestId={request.id} status={request.status} side={side} />

        {request.status === "completed" &&
          (side === "client" ? (
            <ReviewForm
              requestId={request.id}
              artistId={request.artist_id}
              category={request.category}
              review={review}
            />
          ) : (
            review && (
              <div className="flex flex-col gap-1 border-t pt-5">
                <p className="flex items-center gap-2 font-semibold">
                  Client&apos;s review
                  <Stars value={review.rating} />
                  <span className="sr-only">{review.rating} out of 5</span>
                </p>
                {review.comment && <p className="whitespace-pre-line text-sm">{review.comment}</p>}
              </div>
            )
          ))}
      </article>

      {chat && conversationId && (
        <section
          aria-label={`Chat with ${otherName}`}
          className="flex h-[32rem] flex-col overflow-hidden rounded-3xl bg-card"
        >
          <RealtimeChat
            conversationId={conversationId}
            userId={user.sub}
            partnerName={otherName}
            messages={chat.messages}
          />
        </section>
      )}
    </>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:py-10">
      <Suspense fallback={<Loading />}>
        <Request params={params} />
      </Suspense>
    </main>
  );
}
