"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

// Swipeable (scroll-snap) images for a post card, with prev/next arrows on hover and a 1/n badge.
// Cards are links, so the arrows are aria-hidden spans, not buttons (no buttons inside <a>);
// keyboard users open the post, which shows every image.
export function ImageCarousel({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = images.length > 1;

  const go = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault(); // stays on the card instead of following the link
    const el = ref.current!;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };

  const arrow = "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-nav/80 opacity-0 shadow-md transition-opacity hover:bg-nav group-hover/carousel:opacity-100";

  return (
    <div className="group/carousel relative size-full">
      <div
        ref={ref}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={i ? "" : alt}
            loading="lazy"
            className={cn("size-full shrink-0 snap-center object-cover", className)}
          />
        ))}
      </div>
      {many && (
        <>
          <span aria-hidden className="absolute left-2 top-2 z-10 rounded-full bg-nav/80 px-2 py-0.5 text-xs font-semibold tabular-nums">
            {index + 1}/{images.length}
          </span>
          {index > 0 && (
            <span aria-hidden onClick={(e) => go(e, -1)} className={cn(arrow, "left-2")}>
              <ChevronLeft className="size-5" />
            </span>
          )}
          {index < images.length - 1 && (
            <span aria-hidden onClick={(e) => go(e, 1)} className={cn(arrow, "right-2")}>
              <ChevronRight className="size-5" />
            </span>
          )}
        </>
      )}
    </div>
  );
}
