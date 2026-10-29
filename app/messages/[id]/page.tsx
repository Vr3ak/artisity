import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadChat } from "@/lib/chat";
import { RealtimeChat } from "@/components/realtime-chat";
import { Avatar } from "@/components/tab-bar";
import { profileHref } from "@/lib/utils";

async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const chat = await loadChat(supabase, id);
  if (!chat) notFound();
  const other = chat.people.find((p) => p.id !== user.sub)!;

  return (
    <>
      <header className="flex items-center gap-2 border-b px-2 py-3 md:px-4">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <Link
          href={profileHref(other)}
          className="flex min-w-0 items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-secondary"
        >
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
            <Avatar url={other.avatar_url} className="size-9" />
          </span>
          <h1 className="truncate font-semibold">{chat.names[other.id]}</h1>
        </Link>
      </header>
      <div className="min-h-0 flex-1">
        <RealtimeChat
          conversationId={id}
          userId={user.sub}
          partnerName={chat.names[other.id]}
          messages={chat.messages}
        />
      </div>
    </>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    // Full-height pane between the 4rem top bar and, below md, the 4rem tab bar
    <main className="mx-auto flex h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col md:h-[calc(100dvh-4rem)]">
      <Suspense>
        <Chat params={params} />
      </Suspense>
    </main>
  );
}
