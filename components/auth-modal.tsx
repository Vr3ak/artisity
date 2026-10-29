"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef } from "react";

// Lets a form inside the modal close it and refresh the page underneath
// (so the server-rendered header shows the signed-in user).
const AuthModalContext = createContext<{ close: () => void } | null>(null);
export const useAuthModal = () => useContext(AuthModalContext);

// Login/sign-up over the current page. Rendered by the intercepting routes in
// app/@modal; a hard visit to /auth/* still gets the full page.
export function AuthModal({
  path,
  label,
  children,
}: {
  path: string;
  label: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  // A parallel slot keeps its last content on soft navigation elsewhere
  // (e.g. sign-up pushing /onboarding), so only show on our own path.
  const open = usePathname() === path;
  const dialog = useRef<HTMLDialogElement>(null);
  const refreshOnClose = useRef(false);

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    return () => {
      if (refreshOnClose.current) {
        refreshOnClose.current = false;
        router.refresh();
      }
    };
  }, [open, router]);

  if (!open) return null;

  const close = () => {
    refreshOnClose.current = true;
    router.back();
  };

  return (
    <AuthModalContext value={{ close }}>
      <dialog
        ref={dialog}
        aria-label={label}
        // Esc fires close; leaving the route is the close
        onClose={() => router.back()}
        // A click on the scrim (the dialog itself, outside the card) dismisses
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none flex-col overflow-y-auto border-0 bg-scrim p-4 text-foreground animate-in fade-in-0 backdrop:bg-transparent open:flex motion-reduce:animate-none sm:p-6"
      >
        <div className="m-auto flex w-full max-w-md flex-col gap-3 duration-300 ease-out animate-in slide-in-from-bottom-6 motion-reduce:animate-none">
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="flex size-10 items-center justify-center self-end rounded-full bg-nav transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" />
          </button>
          {children}
        </div>
      </dialog>
    </AuthModalContext>
  );
}
