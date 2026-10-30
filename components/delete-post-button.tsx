"use client";

import { createClient } from "@/lib/supabase/client";
import { FormError } from "@/components/auth-parts";
import { Modal, modalButton } from "@/components/modal";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeletePostButton({
  postId,
  imagePaths,
  className,
}: {
  postId: string;
  imagePaths: string[];
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const remove = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    // The post is gone either way; leftover images only costs storage
    await supabase.storage.from("profile-images").remove(imagePaths);
    router.push("/profile?tab=portfolio");
    router.refresh();
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Delete post
      </button>
      {open && (
        <Modal labelledBy="delete-post-title" onClose={() => !busy && setOpen(false)}>
          <h2 id="delete-post-title" className="text-lg font-bold">
            Delete this post?
          </h2>
          <p className="text-sm text-muted-foreground">
            It will be removed from the home feed and your profile. This can&apos;t be undone.
          </p>
          <FormError message={error} />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" autoFocus onClick={() => setOpen(false)} disabled={busy} className={modalButton.quiet}>
              Cancel
            </button>
            <button type="button" onClick={remove} disabled={busy} className={modalButton.danger}>
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
