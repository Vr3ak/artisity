import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadChat } from "@/lib/chat";
import { RealtimeChat } from "@/components/realtime-chat";
import { SafetyMenu } from "@/components/safety-menu";
import { Avatar } from "@/components/tab-bar";
import { profileHref } from "@/lib/utils";
import { Loading } from "@/components/loading";
import { OnlineDot, OnlineLabel } from "@/components/online";

async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/auth/login");

  const chat = await loadChat(supabase, id);
  if (!chat) notFound();
  const other = chat.people.find((p) => p.id !== user.sub)!;
  // RLS returns only the viewer's own blocks
  const { data: block } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocked_id", other.id)
    .maybeSingle();

  return (
    <>
      <header className="flex items-center gap-2 border-b px-2 py-3 md:px-4">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-secondary md:hidden"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <Link
          href={profileHref(other)}
          className="flex min-w-0 items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-secondary"
        >
          <span className="relative shrink-0">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-secondary">
              <Avatar url={other.avatar_url} className="size-9" />
            </span>
            <OnlineDot userId={other.id} />
          </span>
          <span className="min-w-0">
            <h2 className="truncate font-semibold">{chat.names[other.id]}</h2>
            <OnlineLabel userId={other.id} />
          </span>
        </Link>
        <div className="ml-auto">
          <SafetyMenu
            userId={other.id}
            name={chat.names[other.id]}
            blocked={!!block}
            className="flex size-10 items-center justify-center rounded-full hover:bg-secondary"
          />
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <RealtimeChat
          conversationId={id}
          userId={user.sub}
          partnerName={chat.names[other.id]}
          partnerAvatar={other.avatar_url}
          partnerReadId={chat.reads[other.id]}
          messages={chat.messages}
          blocked={!!block}
        />
      </div>
    </>
  );
}

// The right pane of app/messages/layout.tsx, which sets the height
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    // data-chat: on phones the layout hides the conversation list while this is open
    <div data-chat className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<Loading />}>
        <Chat params={params} />
      </Suspense>
    </div>
  );
}
