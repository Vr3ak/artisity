import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Fiverr's order tracker: where a commission stands in the status flow
// (private.check_request_transition). Filled steps are done; the ringed one is what's happening now.
const STEPS = [
  { key: "pending", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
];

export function RequestTimeline({ status }: { status: string }) {
  // Declined or cancelled requests stop after "Sent". The table keeps only the final status, so a
  // request cancelled after acceptance shows the same way.
  const ended = status === "declined" || status === "cancelled";
  const reached = ended ? 0 : STEPS.findIndex((s) => s.key === status);
  const steps = ended
    ? [STEPS[0], { key: status, label: status === "declined" ? "Declined" : "Cancelled" }]
    : STEPS;

  return (
    <ol aria-label="Progress" className={cn("grid", ended ? "grid-cols-2 max-w-xs" : "grid-cols-4")}>
      {steps.map((step, i) => {
        const stop = ended && i === 1;
        const done = !stop && (i <= reached || status === "completed");
        // The step being worked on: the one after the last reached (completed has none)
        const current = !ended && status !== "completed" && i === reached + 1;
        return (
          <li
            key={step.key}
            aria-current={current ? "step" : undefined}
            className="relative flex flex-col items-center gap-2 text-center"
          >
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-1/2 top-3.5 h-0.5 w-full",
                  i < reached || status === "completed" ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative flex size-7 items-center justify-center rounded-full",
                done && "bg-primary text-primary-foreground",
                current && "bg-card ring-2 ring-inset ring-primary",
                stop && "border-2 border-input bg-card text-muted-foreground",
                !done && !current && !stop && "bg-border",
              )}
            >
              {done && <Check className="size-4" strokeWidth={3} />}
              {current && <span className="size-2.5 rounded-full bg-primary motion-safe:animate-pulse" />}
              {stop && <X className="size-4" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                "text-xs font-semibold sm:text-sm",
                done || current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
              <span className="sr-only">{done ? " (done)" : current ? " (in progress)" : stop ? "" : " (next)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
