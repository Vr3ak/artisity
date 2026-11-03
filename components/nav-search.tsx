"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// vgen.co-style docked search: once a page's #home-search form scrolls up under the nav, a compact
// filled pill rises into the bar, opening from its centre. It stays mounted (inert while hidden) so
// leaving animates too, and stays docked while focused so scrolling up never steals it mid-typing.
// Pages without #home-search never show it.
export function NavSearch() {
  const pathname = usePathname();
  const [passed, setPassed] = useState(false);
  const [focused, setFocused] = useState(false);
  const show = passed || focused;

  useEffect(() => {
    setPassed(false);
    const target = document.getElementById("home-search");
    if (!target) return;
    // -64px: the sticky header (h-16) covers that strip, so "under the nav" counts as gone
    const io = new IntersectionObserver(
      ([e]) => setPassed(!e.isIntersecting && e.boundingClientRect.top < 64),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [pathname]);

  return (
    <form
      action="/artists"
      role="search"
      inert={!show}
      data-show={show}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="relative mx-auto min-w-0 flex-1 transition-[opacity,transform,clip-path] duration-[180ms] ease-in [clip-path:inset(0_40%_0_40%_round_9999px)] data-[show=false]:pointer-events-none data-[show=false]:translate-y-1.5 data-[show=false]:opacity-0 data-[show=true]:duration-[360ms] data-[show=true]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[show=true]:[clip-path:inset(-4px_round_9999px)] motion-reduce:transition-opacity motion-reduce:data-[show=false]:translate-y-0 md:mt-1 md:max-w-2xl"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground md:left-3.5" />
      <input
        type="search"
        name="q"
        placeholder="Search"
        aria-label="Search for artist or tag"
        className="h-10 w-full rounded-full bg-secondary pl-10 pr-2 text-base text-secondary-foreground transition-colors placeholder:text-muted-foreground hover:bg-accent focus:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:pl-11 md:pr-4 md:text-sm"
      />
    </form>
  );
}
