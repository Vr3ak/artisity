import { MessageCircle } from "lucide-react";

// Right pane before a thread is picked (md and up; below md the list fills the screen)
export default function Page() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-2 p-8 text-center md:flex">
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary">
        <MessageCircle className="size-7 text-primary-ink" />
      </span>
      <p className="font-semibold">Select a conversation</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Pick an artist on the left to open your chat with them.
      </p>
    </div>
  );
}
