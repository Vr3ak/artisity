"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, MessageCircle, Search, User } from "lucide-react";
import { NavMenu } from "./nav-menu";
import { cn } from "@/lib/utils";

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

const tabClass =
  "flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground outline-none focus-visible:text-foreground";
const iconClass =
  "flex h-7 w-14 items-center justify-center rounded-full transition-colors";

function Tab({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <>
      <span className={cn(iconClass, active && "bg-accent text-accent-foreground")}>
        {icon}
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
}: {
  signedIn: boolean;
  role: string | null;
  avatarUrl: string | null | undefined;
  accountLabel: string;
}) {
  const path = usePathname();
  const links = [
    { href: "/", label: "Home", icon: <Home className="size-5" />, active: path === "/" },
    { href: "/artists", label: "Commission", icon: <Search className="size-5" />, active: path.startsWith("/artists") || path.startsWith("/@") },
    { href: "/messages", label: "Messages", icon: <MessageCircle className="size-5" />, active: path.startsWith("/messages") },
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
            className={tabClass}
          >
            <Tab active={l.active} icon={l.icon} label={l.label} />
          </Link>
        ))}
        {/* ponytail: saved artists/posts don't exist yet */}
        <span
          aria-disabled
          title="Coming soon"
          className={cn(tabClass, "cursor-not-allowed opacity-50")}
        >
          <Tab active={false} icon={<Heart className="size-5" />} label="Favorites" />
        </span>
        <NavMenu
          signedIn={signedIn}
          role={role}
          side="top"
          trigger={
            <button type="button" aria-label={accountLabel} className={tabClass}>
              <Tab
                active={accountActive}
                icon={<Avatar url={avatarUrl} className="size-6" />}
                label="Account"
              />
            </button>
          }
        />
      </div>
    </nav>
  );
}
