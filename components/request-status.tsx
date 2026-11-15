import { cn } from "@/lib/utils";

// Open requests (someone still has to act) read gold; finished ones step back.
const TONE: Record<string, string> = {
  pending: "bg-primary/15 text-primary-ink",
  accepted: "bg-primary/15 text-primary-ink",
  delivered: "bg-primary/15 text-primary-ink",
  completed: "bg-secondary text-foreground",
  declined: "border border-input text-muted-foreground",
  cancelled: "border border-input text-muted-foreground",
};

export function RequestStatus({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-semibold capitalize",
        TONE[status] ?? TONE.completed,
        className,
      )}
    >
      {status}
    </span>
  );
}
