"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ArtStation-style viewer. The page keeps its own image layout and marks each image's button with
// data-lightbox="<index>"; a click on one opens this full-screen. Inside, the images sit in a
// horizontal scroll-snap strip, so phones swipe natively; buttons and ←/→ step through it.
// Esc closes (native <dialog>), and globals.css locks the page scroll while it's open.
export function Lightbox({ images, alt }: { images: string[]; alt: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = images.length > 1;
  const label = (i: number) => (many ? `${alt}, image ${i + 1} of ${images.length}` : alt);

  const go = (i: number) => {
    const s = strip.current;
    if (!s || i < 0 || i >= images.length) return;
    s.scrollTo({ left: i * s.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  useEffect(() => {
    const open = (i: number) => {
      setIndex(i);
      dialog.current?.showModal();
      // The strip has its width only once the dialog is shown
      requestAnimationFrame(() => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: "instant" }));
    };
    const onClick = (e: MouseEvent) => {
      const i = (e.target as Element).closest<HTMLElement>("[data-lightbox]")?.dataset.lightbox;
      if (i !== undefined) open(Number(i));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  const control =
    "flex size-11 items-center justify-center rounded-full bg-secondary text-foreground shadow-float transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0";

  return (
    <dialog
      ref={dialog}
      aria-label={alt}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none border-0 bg-background/95 p-0 text-foreground backdrop:bg-transparent open:animate-in open:fade-in-0 motion-reduce:open:animate-none"
    >
      <div
        ref={strip}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none]"
      >
        {images.map((src, i) => (
          // A click on the empty space around an image closes, like a scrim
          <div
            key={src}
            onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
            className="flex size-full shrink-0 snap-center items-center justify-center p-4 md:px-20 md:py-12"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={label(i)} className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>

      <form method="dialog" className="absolute right-4 top-4">
        <button aria-label="Close" autoFocus className={control}>
          <X className="size-5" />
        </button>
      </form>
      {many && (
        <>
          <button type="button" aria-label="Previous image" disabled={index === 0} onClick={() => go(index - 1)} className={`${control} absolute left-4 top-1/2 hidden -translate-y-1/2 md:flex`}>
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" aria-label="Next image" disabled={index === images.length - 1} onClick={() => go(index + 1)} className={`${control} absolute right-4 top-1/2 hidden -translate-y-1/2 md:flex`}>
            <ChevronRight className="size-5" />
          </button>
          <p aria-live="polite" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold tabular-nums">
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </dialog>
  );
}
