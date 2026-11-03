"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// vgen.co-style docked search: once a page's #home-search form scrolls up under the nav, a compact
// filled pill appears in the bar. Pages without #home-search never show it.
export function NavSearch() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    const target = document.getElementById("home-search");
    if (!target) return;
    // -64px: the sticky header (h-16) covers that strip, so "under the nav" counts as gone
    const io = new IntersectionObserver(
      ([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 64),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [pathname]);

  if (!show) return null;
  return (
    <form
      action="/artists"
      role="search"
      className="relative mx-auto min-w-0 flex-1 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none md:mt-1 md:max-w-md"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-5 md:left-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="q"
        placeholder="Search"
        aria-label="Search for artist or tag"
        className="h-10 w-full rounded-full bg-secondary pl-10 pr-2 md:pl-11 md:pr-4 text-base text-secondary-foreground transition-colors placeholder:text-muted-foreground hover:bg-accent focus:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
      />
    </form>
  );
}
