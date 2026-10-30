"use client";

import { SUPPORT_EMAIL } from "@/lib/options";
import { cn } from "@/lib/utils";
import { FormError } from "@/components/auth-parts";
import { fieldClass, pillClass } from "@/components/flow";
import { Modal, modalButton } from "@/components/modal";
import { useState } from "react";

const CONFIRM_WORD = "DELETE";

// Danger zone at the bottom of /profile/edit. The server route does the deleting.
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setError(null);
  };

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typed !== CONFIRM_WORD) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/account/delete", { method: "POST" }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      return setError(`Your account wasn't deleted. Try again, or email ${SUPPORT_EMAIL}.`);
    }
    // Full load: the session is gone and every cached page is stale
    window.location.assign("/");
  };

  return (
    <section className="flex flex-col items-start gap-4 rounded-3xl bg-nav p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Delete account</h2>
        <p className="text-sm text-muted-foreground">
          Permanently removes your profile, images, services, messages, requests and contact
          details. People you&apos;ve talked to will lose those conversations too.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(pillClass.outline, "h-12 w-auto px-6 text-destructive")}
      >
        Delete account
      </button>

      {open && (
        <Modal labelledBy="delete-account-title" onClose={close}>
          <form onSubmit={remove} className="flex flex-col gap-4">
            <h2 id="delete-account-title" className="text-lg font-bold">
              Delete your account?
            </h2>
            <p className="text-sm text-muted-foreground">
              This can&apos;t be undone. Type <strong className="text-foreground">{CONFIRM_WORD}</strong>{" "}
              to confirm.
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={`Type ${CONFIRM_WORD} to confirm`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              className={fieldClass}
            />
            <FormError message={error} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} disabled={busy} className={modalButton.quiet}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={typed !== CONFIRM_WORD || busy}
                className={modalButton.danger}
              >
                {busy ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
