"use client";

import { SUPPORT_EMAIL } from "@/lib/options";
import { FormError } from "@/components/auth-parts";
import { fieldClass } from "@/components/flow";
import { Modal, modalButton } from "@/components/modal";
import { useState } from "react";

const CONFIRM_WORD = "DELETE";

// Small "Delete account" link at the bottom of /profile/edit; the modal carries the warning.
// The server route does the deleting.
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
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
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
              This permanently removes your profile, images, services, messages, requests and
              contact details, and the people you&apos;ve talked to lose those conversations.
              It can&apos;t be undone. Type <strong className="text-foreground">{CONFIRM_WORD}</strong>{" "}
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
    </div>
  );
}
