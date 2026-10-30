"use client";

import { useEffect, useRef } from "react";

const button =
  "h-10 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
export const modalButton = {
  quiet: `${button} hover:bg-secondary`,
  danger: `${button} bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-offset-2 focus-visible:ring-offset-nav`,
  primary: `${button} bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-offset-2 focus-visible:ring-offset-nav`,
};

// Centered card over a scrim, open while mounted. Esc, a scrim click or onClose dismisses it.
export function Modal({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => dialog.current?.showModal(), []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none flex-col overflow-y-auto border-0 bg-scrim p-4 text-foreground animate-in fade-in-0 backdrop:bg-transparent open:flex motion-reduce:animate-none"
    >
      <div className="m-auto flex w-full max-w-md flex-col gap-2 rounded-3xl bg-nav p-6 shadow-float">
        {children}
      </div>
    </dialog>
  );
}
