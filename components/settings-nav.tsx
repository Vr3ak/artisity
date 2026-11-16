"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/preferences", label: "Preferences" },
  { href: "/settings/privacy", label: "Privacy & safety" },
];

// Settings menu (after Fiverr/Behance): a swipeable underlined tab row on phones, like the profile
// tabs, and a vertical list from md up
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Settings"
      className="-mx-4 flex gap-6 overflow-x-auto border-b px-4 [scrollbar-width:none] md:mx-0 md:flex-col md:gap-1 md:border-b-0 md:px-0"
    >
      {SECTIONS.map(({ href, label }) => {
        const on = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              // Underline only in the phone tab row; the md+ list uses filled pills instead
              "shrink-0 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:-mb-px max-md:border-b-2 max-md:pb-3 md:rounded-full md:px-4 md:py-2.5",
              on
                ? "border-foreground text-foreground md:bg-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground md:hover:bg-secondary/60",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
