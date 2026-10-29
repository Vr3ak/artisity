"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Box,
  Brush,
  Clapperboard,
  Feather,
  Gamepad2,
  LayoutGrid,
  LayoutTemplate,
  Mountain,
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
};

const chipClass =
  "group flex shrink-0 items-center gap-2.5 rounded-full py-1 pr-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Disc({ Icon, from, to }: { Icon: LucideIcon; from?: string; to?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none",
        from ? "text-white" : "bg-foreground text-background",
      )}
      style={
        from
          ? {
              backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
              boxShadow: `0 6px 14px -6px ${to}, inset 0 1px 0 rgb(255 255 255 / 0.55)`,
            }
          : undefined
      }
    >
      {/* Gloss: a soft white sheen over the top half */}
      <span aria-hidden className="absolute inset-x-1 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/45 to-white/0" />
      <Icon className="relative size-[18px] drop-shadow-[0_1px_1px_rgb(0_0_0/0.25)]" aria-hidden />
    </span>
  );
}

// Category links to /artists: a colored disc plus plain text. One swipeable row on phones, wrapped from md up;
// `bleed` lets the row run to the screen edge inside a padded container of that width.
export function CategoryChips({
  active,
  withAll = false,
  bleed = "-mx-4 px-4",
}: {
  active?: string;
  withAll?: boolean;
  bleed?: string;
}) {
  const nav = useRef<HTMLElement>(null);
  // On phones the row scrolls sideways; bring the selected chip into view
  useEffect(() => {
    nav.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  const items = [
    ...(withAll ? [{ value: undefined, label: "All", disc: { Icon: LayoutGrid } }] : []),
    ...CATEGORIES.map((c) => ({ value: c.value, label: c.label, disc: ICONS[c.value] })),
  ];
  return (
    <nav
      ref={nav}
      aria-label="Categories"
      className={cn(
        "flex gap-x-5 gap-y-3 overflow-x-auto py-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0",
        bleed,
      )}
    >
      {items.map(({ value, label, disc }) => {
        const on = withAll && active === value;
        return (
          <Link
            key={label}
            href={value ? `/artists?category=${value}` : "/artists"}
            aria-current={on ? "page" : undefined}
            className={chipClass}
          >
            <Disc {...disc} />
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
}
