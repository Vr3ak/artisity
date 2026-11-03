"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  image: string;
  title: string;
  artist: string | null;
  avatar: string | null;
  ago: string;
};

// Home hero: the newest posts as a centered strip with the neighbours peeking in. The active dot's fill
// is the autoplay timer: its animationend advances the strip, and pausing it pauses autoplay. Hover or
// focus holds it, and reduced motion starts paused (WCAG 2.2.2 wants the pause button either way).
export function PostHero({ slides }: { slides: HeroSlide[] }) {
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
      aria-label="Newest posts"
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
            key={s.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            className="w-[min(88cqw,78rem)] shrink-0 snap-center"
          >
            <Link
              href={`/posts/${s.id}`}
              className={cn(
                "group relative block aspect-[16/10] overflow-hidden rounded-3xl bg-muted outline-none transition-opacity duration-500 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none sm:aspect-[21/9] lg:aspect-[3/1]",
                i !== index && "opacity-40",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt=""
                loading={i < 2 ? "eager" : "lazy"}
                className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
              />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-nav/95 via-nav/60 to-transparent p-4 pt-16 sm:gap-2 sm:p-6 sm:pt-20 lg:p-8">
                <p className="line-clamp-2 max-w-3xl text-balance text-lg font-bold tracking-tight sm:text-2xl lg:text-3xl">
                  {s.title}
                </p>
                <p className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="size-6 shrink-0 overflow-hidden rounded-full bg-secondary sm:size-7">
                    {s.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatar} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="truncate font-semibold">{s.artist}</span>
                  <span className="shrink-0 text-muted-foreground">· {s.ago}</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {slides.length > 1 && (
        <div className="mx-auto flex w-[min(88cqw,78rem)] items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show post ${i + 1}`}
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
                      className="absolute inset-0 origin-left animate-[hero-progress_6s_linear] bg-primary"
                      style={{ animationPlayState: paused || hold ? "paused" : "running" }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous post" className={cn(control, "hidden sm:flex")}>
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next post" className={cn(control, "hidden sm:flex")}>
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
