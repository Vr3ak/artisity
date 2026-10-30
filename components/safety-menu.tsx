"use client";

import { createClient } from "@/lib/supabase/client";
import { REPORT_REASONS } from "@/lib/options";
import { errorText } from "@/lib/utils";
import { FormError } from "@/components/auth-parts";
import { Modal, modalButton } from "@/components/modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// "More" menu on a profile or chat: report the user, or block/unblock them.
// blocked = the viewer has blocked this user (being blocked by them is never revealed).
export function SafetyMenu({
  userId,
  name,
  blocked,
  className,
}: {
  userId: string;
  name: string;
  blocked: boolean;
  className: string;
}) {
  const [dialog, setDialog] = useState<"report" | "block" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const close = () => setDialog(null);

  const unblock = async () => {
    setError(null);
    const { error } = await createClient().from("blocks").delete().eq("blocked_id", userId);
    if (error) return setError(errorText(error, "Couldn't unblock. Try again."));
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`More options for ${name}`} title="More" className={className}>
            <MoreHorizontal className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setDialog("report")}>Report</DropdownMenuItem>
          {blocked ? (
            <DropdownMenuItem onSelect={unblock}>Unblock</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setDialog("block")} className="text-destructive focus:text-destructive">
              Block
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {error}
        </p>
      )}
      {dialog === "block" && <BlockDialog userId={userId} name={name} onClose={close} />}
      {dialog === "report" && (
        <ReportDialog
          userId={userId}
          name={name}
          onClose={close}
          onBlock={blocked ? undefined : () => setDialog("block")}
        />
      )}
    </>
  );
}

function BlockDialog({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const block = async () => {
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("blocks").insert({ blocked_id: userId });
    // 23505: already blocked
    if (error && error.code !== "23505") {
      setBusy(false);
      return setError(errorText(error, "Couldn't block. Try again."));
    }
    onClose();
    router.refresh();
  };

  return (
    <Modal labelledBy="block-title" onClose={onClose}>
      <h2 id="block-title" className="text-lg font-bold">
        Block {name}?
      </h2>
      <p className="text-sm text-muted-foreground">
        Neither of you will be able to message the other or send commission requests. They
        won&apos;t be notified. You can unblock them from this menu at any time.
      </p>
      <FormError message={error} />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" autoFocus onClick={onClose} className={modalButton.quiet}>
          Cancel
        </button>
        <button type="button" onClick={block} disabled={busy} className={modalButton.danger}>
          {busy ? "Blocking…" : "Block"}
        </button>
      </div>
    </Modal>
  );
}

function ReportDialog({
  userId,
  name,
  onClose,
  onBlock,
}: {
  userId: string;
  name: string;
  onClose: () => void;
  onBlock?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return setError("Choose a reason.");
    setStatus("sending");
    setError(null);
    const { error } = await createClient()
      .from("reports")
      .insert({ reported_id: userId, reason, details: details.trim() });
    if (error) {
      setStatus("idle");
      return setError(error.message);
    }
    setStatus("sent");
  };

  if (status === "sent")
    return (
      <Modal labelledBy="report-title" onClose={onClose}>
        <h2 id="report-title" className="text-lg font-bold">
          Thanks for telling us
        </h2>
        <p className="text-sm text-muted-foreground">
          Our team will review your report. {name} won&apos;t know who reported them.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          {onBlock && (
            <button type="button" onClick={onBlock} className={modalButton.quiet}>
              Block {name}
            </button>
          )}
          <button type="button" autoFocus onClick={onClose} className={modalButton.primary}>
            Done
          </button>
        </div>
      </Modal>
    );

  return (
    <Modal labelledBy="report-title" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 id="report-title" className="text-lg font-bold">
          Report {name}
        </h2>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-sm font-semibold">What&apos;s wrong?</legend>
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-secondary has-[:checked]:bg-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="size-4 accent-primary focus:outline-none"
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Details (optional)
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What happened? Staff can't read your messages, so include anything that helps."
            className="resize-none rounded-xl bg-secondary px-4 py-3 text-base font-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
          />
        </label>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={modalButton.quiet}>
            Cancel
          </button>
          <button type="submit" disabled={status === "sending"} className={modalButton.primary}>
            {status === "sending" ? "Sending…" : "Send report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
