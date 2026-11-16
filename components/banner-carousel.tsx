"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// A file in public/banners/ with the poster's text spelled out in `alt`
export type BannerSlide = { image: string; alt: string };

// Home hero: rotating event banners, centred with the neighbours peeking in
export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  const go = (i: number) => {
    const el = track.current!;
    const slide = el.children[(i + slides.length) % slides.length] as HTMLElement;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const onScroll = () => {
    const el = track.current!;
    const [a, b] = el.children as unknown as HTMLElement[];
    const stride = b ? b.offsetLeft - a.offsetLeft : 1;
    setIndex(Math.min(slides.length - 1, Math.round(el.scrollLeft / stride)));
  };

  const control =
    "flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Events"
      className="flex flex-col gap-4 pt-2 [container-type:inline-size]"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHold(false)}
    >
      <ul
        ref={track}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[calc((100cqw-min(88cqw,78rem))/2)] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <li
            key={s.image}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            className="w-[min(88cqw,78rem)] shrink-0 snap-center"
          >
            <div
              className={cn(
                "aspect-[1024/378] overflow-hidden rounded-3xl bg-muted transition-opacity duration-500 ease-out motion-reduce:transition-none",
                i !== index && "opacity-40",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/banners/${s.image}`}
                alt={s.alt}
                loading={i < 2 ? "eager" : "lazy"}
                className="size-full object-cover"
              />
            </div>
          </li>
        ))}
      </ul>

      {slides.length > 1 && (
        <div className="mx-auto flex w-[min(88cqw,78rem)] items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.image}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === index}
                className="flex h-6 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "relative block h-1.5 overflow-hidden rounded-full bg-input transition-[width] duration-300 ease-out motion-reduce:transition-none",
                    i === index ? "w-8" : "w-1.5 hover:bg-foreground",
                  )}
                >
                  {i === index && (
                    <span
                      key={index}
                      onAnimationEnd={() => go(index + 1)}
                      className="absolute inset-0 origin-left animate-[hero-progress_4s_linear] bg-primary"
                      style={{ animationPlayState: paused || hold ? "paused" : "running" }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous banner" className={cn(control, "hidden sm:flex")}>
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next banner" className={cn(control, "hidden sm:flex")}>
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
