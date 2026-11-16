"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, MessageCircle, Search, User } from "lucide-react";
import { NavMenu } from "./nav-menu";
import { cn, withCount } from "@/lib/utils";

export function Avatar({
  url,
  className = "size-7",
}: {
  url: string | null | undefined;
  className?: string;
}) {
  return url ? (
    // Plain img: Google avatar hosts would need next/image remotePatterns config
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      className={cn(className, "rounded-full object-cover")}
    />
  ) : (
    <User className="size-5" />
  );
}

// Gold count on a nav icon's corner (unread threads, requests waiting on you); its parent is `relative`.
// The number is decorative: the link's own label carries it for screen readers.
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold tabular-nums leading-none text-primary-foreground ring-2 ring-background",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

const tabClass =
  "flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground outline-none focus-visible:text-foreground";
const iconClass =
  "flex h-7 w-14 items-center justify-center rounded-full transition-colors";

function Tab({
  active,
  icon,
  label,
  badge = 0,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <>
      <span className={cn(iconClass, "relative", active && "bg-accent text-accent-foreground")}>
        {icon}
        <CountBadge count={badge} className="right-1.5 top-[-0.3rem] ring-nav" />
      </span>
      <span className={cn(active && "font-semibold text-foreground")}>{label}</span>
    </>
  );
}

// Below md the top bar's icons and account menu move here.
export function TabBar({
  signedIn,
  role,
  avatarUrl,
  accountLabel,
  unread = 0,
  requests = 0,
}: {
  signedIn: boolean;
  role: string | null;
  avatarUrl: string | null | undefined;
  accountLabel: string;
  unread?: number;
  requests?: number;
}) {
  const path = usePathname();
  const links = [
    { href: "/", label: "Home", icon: <Home className="size-5" />, active: path === "/" },
    { href: "/artists", label: "Commission", icon: <Search className="size-5" />, active: path.startsWith("/artists") || path.startsWith("/@") },
    { href: "/messages", label: "Messages", icon: <MessageCircle className="size-5" />, active: path.startsWith("/messages"), badge: unread, noun: "unread" },
    { href: "/favorites", label: "Favorites", icon: <Heart className="size-5" />, active: path.startsWith("/favorites") },
  ];
  const accountActive = /^\/(profile|requests|staff|onboarding)/.test(path);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-nav pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex h-16">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={l.active ? "page" : undefined}
            aria-label={l.badge ? withCount(l.label, l.badge, l.noun) : undefined}
            className={tabClass}
          >
            <Tab active={l.active} icon={l.icon} label={l.label} badge={l.badge} />
          </Link>
        ))}
        <NavMenu
          signedIn={signedIn}
          role={role}
          requests={requests}
          side="top"
          trigger={
            <button type="button" aria-label={withCount(accountLabel, requests, "request waiting on you", "requests waiting on you")} className={tabClass}>
              <Tab
                active={accountActive}
                icon={<Avatar url={avatarUrl} className="size-6" />}
                label="Account"
                badge={requests}
              />
            </button>
          }
        />
      </div>
    </nav>
  );
}
