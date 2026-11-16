"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Brush,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Feather,
  Gamepad2,
  LayoutGrid,
  LayoutTemplate,
  Mountain,
  Palette,
  PenTool,
  Radio,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES, type Category } from "@/lib/options";
import { cn } from "@/lib/utils";

// Each category gets its own glossy disc: a two-stop gradient (light top-left to deep bottom-right)
// with a matching drop shadow. Colors are fixed in both themes; the white icon reads on all of them.
const ICONS: Record<Category, { Icon: LucideIcon; from: string; to: string }> = {
  illustration: { Icon: Brush, from: "#FF8AC4", to: "#D81B72" },
  branding_graphic: { Icon: PenTool, from: "#FFD84D", to: "#E09400" },
  model_3d_2d: { Icon: Box, from: "#6FE6FF", to: "#0A84E0" },
  video_animation: { Icon: Clapperboard, from: "#FF9B70", to: "#E2401B" },
  game_asset: { Icon: Gamepad2, from: "#7FF0A0", to: "#16A34A" },
  emote: { Icon: Smile, from: "#F0A6FF", to: "#A21CAF" },
  scene_concept_art: { Icon: Mountain, from: "#6FFFE0", to: "#0D9488" },
  streaming_asset: { Icon: Radio, from: "#BBA6FF", to: "#6D28D9" },
  writing: { Icon: Feather, from: "#D9FF73", to: "#65A30D" },
  ui_ux: { Icon: LayoutTemplate, from: "#8FB8FF", to: "#2557E8" },
  fine_art: { Icon: Palette, from: "#FF9A9A", to: "#C81E3A" },
};

const chipClass =
  "group flex shrink-0 items-center rounded-full py-1 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Disc({ Icon, from, to, large }: { Icon: LucideIcon; from?: string; to?: string; large?: boolean }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none",
        large ? "size-14" : "size-10",
        from ? "text-white" : "bg-foreground text-background",
      )}
      style={
        from
          ? {
              backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
              boxShadow: `${large ? "0 8px 18px -8px" : "0 6px 14px -6px"} ${to}, inset 0 1px 0 rgb(255 255 255 / 0.55)`,
            }
          : undefined
      }
    >
      {/* Gloss: a soft white sheen over the top half */}
      <span aria-hidden className="absolute inset-x-1 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/45 to-white/0" />
      <Icon className={cn("relative drop-shadow-[0_1px_1px_rgb(0_0_0/0.25)]", large ? "size-6" : "size-[18px]")} aria-hidden />
    </span>
  );
}

// Category links to /artists: a colored disc plus plain text. One swipeable row on phones, wrapped from md up;
// `bleed` lets the row run to the screen edge inside a padded container of that width; `large` is the home page's bigger set.
// `row` never wraps (the home feed's docked bar) and adds behance.net-style ‹ › buttons for mouse users.
// `feed` links filter the home feed's posts in place (`/?category=`) instead of opening /artists.
export function CategoryChips({
  active,
  withAll = false,
  bleed = "-mx-4 px-4",
  large = false,
  row = false,
  feed = false,
}: {
  active?: string;
  withAll?: boolean;
  bleed?: string;
  large?: boolean;
  row?: boolean;
  feed?: boolean;
}) {
  const nav = useRef<HTMLElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const measure = () => {
    const el = nav.current;
    if (el) setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  };
  // On phones the row scrolls sideways; centre the selected chip in it. Only the row moves
  // (scrollIntoView would also scroll the page to a copy that's off screen).
  useEffect(() => {
    const el = nav.current;
    const chip = el?.querySelector('[aria-current="page"]');
    if (!el || !chip) return;
    const box = el.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    el.scrollTo({ left: el.scrollLeft + c.left - box.left - (box.width - c.width) / 2 });
  }, [active]);
  useEffect(() => {
    if (!row || !nav.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav.current);
    return () => observer.disconnect();
  }, [row]);
  const page = (dir: 1 | -1) => nav.current?.scrollBy({ left: dir * nav.current.clientWidth * 0.8, behavior: "smooth" });

  const items = [
    ...(withAll ? [{ value: undefined, label: "All", disc: { Icon: LayoutGrid } }] : []),
    ...CATEGORIES.map((c) => ({ value: c.value, label: c.label, disc: ICONS[c.value] })),
  ];
  const chips = (
    <nav
      ref={nav}
      aria-label="Categories"
      onScroll={row ? measure : undefined}
      className={cn(
        "flex overflow-x-auto py-1 [scrollbar-width:none]",
        !row && "md:mx-0 md:flex-wrap md:px-0",
        large ? "gap-x-7 gap-y-4" : "gap-x-5 gap-y-3",
        bleed,
      )}
    >
      {items.map(({ value, label, disc }) => {
        const on = withAll && active === value;
        return (
          <Link
            key={label}
            href={(feed ? "/" : "/artists") + (value ? `?category=${value}` : "")}
            scroll={!feed}
            aria-current={on ? "page" : undefined}
            className={cn(chipClass, large ? "gap-3 text-base font-semibold" : "gap-2.5 text-sm font-medium")}
          >
            <Disc {...disc} large={large} />
            <span
              className={cn(
                "underline-offset-4 group-hover:underline",
                on && "font-bold underline decoration-primary-ink decoration-2",
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
  if (!row) return chips;
  // Touch screens swipe; the buttons are for mice, which can't scroll sideways
  const arrow = "absolute inset-y-0 z-10 hidden items-center from-background from-60% to-transparent [@media(hover:hover)]:flex";
  const button = "flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-float transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="relative min-w-0">
      {chips}
      {!edge.start && (
        <div className={cn(arrow, "left-0 bg-gradient-to-r pr-8")}>
          <button type="button" aria-label="Scroll categories left" onClick={() => page(-1)} className={button}>
            <ChevronLeft className="size-5" />
          </button>
        </div>
      )}
      {!edge.end && (
        <div className={cn(arrow, "right-0 bg-gradient-to-l pl-8")}>
          <button type="button" aria-label="Scroll categories right" onClick={() => page(1)} className={button}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
