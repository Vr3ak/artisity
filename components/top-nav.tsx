import Link from "next/link";
import { Heart, Menu, MessageCircle, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { NavMenu } from "./nav-menu";
import { NavSearch } from "./nav-search";
import { Avatar, CountBadge, TabBar } from "./tab-bar";
import { Presence } from "./online";
import { createClient } from "@/lib/supabase/server";
import { navCounts } from "@/lib/conversations";
import { withCount } from "@/lib/utils";
import { Bone } from "./skeletons";

// Layout follows vgen.co: the bar shares the page background; text links on the left,
// round icon buttons + pill CTAs + an avatar/menu pill on the right. Below md the
// icons move to the fixed bottom tab bar (tab-bar.tsx).
const linkClass = "rounded-full px-3 py-2 text-base font-bold hover:bg-secondary";
const soonClass =
  "cursor-not-allowed text-muted-foreground opacity-60 hover:bg-transparent";
const iconButtonClass =
  "flex size-10 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-accent";

export async function TopNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Profile and badge counts in parallel: this bar is on every page.
  // ponytail: badges are as fresh as the last render (a load, or router.refresh, which the inbox runs on
  // new messages and reads); subscribe to messages/requests here if they must update live everywhere
  const [{ data: profile }, counts] = user
    ? await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url, role").eq("id", user.sub).maybeSingle(),
        navCounts(supabase, user.sub),
      ])
    : [{ data: null }, { unread: 0, requests: 0 }];
  const role = profile?.role ?? null;
  const accountLabel = user
    ? `Account menu for ${profile?.display_name || user.email}`
    : "Account menu";

  return (
    <>
      {user && <Presence userId={user.sub} />}
      <Logo />

      <MainLinks />

      <NavSearch />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          {role === "artist" && (
            <Link
              href="/posts/new"
              className="flex h-10 items-center gap-1.5 rounded-full bg-primary pl-3 pr-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-5" />
              Post
            </Link>
          )}
          <Link
            href="/messages"
            aria-label={withCount("Messages", counts.unread, "unread")}
            title="Messages"
            className={`${iconButtonClass} relative`}
          >
            <MessageCircle className="size-5" />
            <CountBadge count={counts.unread} />
          </Link>
          <Link
            href="/favorites"
            aria-label="Favorites"
            title="Favorites"
            className={iconButtonClass}
          >
            <Heart className="size-5" />
          </Link>
        </div>
        {!user && (
          <>
            <Button asChild className="h-10 rounded-full px-4 font-semibold">
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </>
        )}
        <div className="hidden md:block">
          <NavMenu
            signedIn={!!user}
            role={role}
            requests={counts.requests}
            trigger={
              <button
                type="button"
                aria-label={withCount(accountLabel, counts.requests, "request waiting on you", "requests waiting on you")}
                className="relative flex h-10 items-center gap-2 rounded-full bg-secondary pl-1.5 pr-3 transition-colors hover:bg-accent data-[state=open]:bg-accent"
              >
                <CountBadge count={counts.requests} />
                <span className="flex size-7 items-center justify-center">
                  <Avatar url={profile?.avatar_url} />
                </span>
                <Menu className="size-5" />
              </button>
            }
          />
        </div>
      </div>

      <TabBar
        signedIn={!!user}
        role={role}
        avatarUrl={profile?.avatar_url}
        accountLabel={accountLabel}
        unread={counts.unread}
        requests={counts.requests}
      />
    </>
  );
}

function MainLinks() {
  return (
    <>
      {/* mt-2 drops the links to the wordmark, which sits below the logo image's center */}
      <nav aria-label="Main" className="mt-2 hidden items-center gap-1 md:flex">
       
        <Link href="/artists" className={linkClass}>
          Commission
        </Link>
        {/* ponytail: Shop is a placeholder until that page exists */}
        <span
          aria-disabled
          className={`${linkClass} ${soonClass}`}
          title="Coming soon"
        >
          Shop
        </span> 
        <Link href="/about" className={linkClass}>
          About us
        </Link>
      </nav>
    </>
  );
}

function Logo() {
  return (
    <Link href="/" aria-label="Artisity home" className="shrink-0">
      {/* Cream logo on the dark theme, brown logo on the light theme */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Artisity"
        width={600}
        height={246}
        className="hidden h-12 w-auto dark:block"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.png"
        alt="Artisity"
        width={1200}
        height={483}
        className="h-12 w-auto dark:hidden"
      />
    </Link>
  );
}

// Suspense fallback while the session loads: the same bar with the controls as placeholders,
// so nothing jumps when TopNav lands
export function TopNavSkeleton() {
  return (
    <>
      <Logo />
      <MainLinks />
      <div className="ml-auto flex items-center gap-2">
        <Bone className="hidden size-10 md:block" />
        <Bone className="hidden size-10 md:block" />
        <Bone className="h-10 w-24 md:w-[4.5rem]" />
      </div>
      <div aria-hidden className="fixed inset-x-0 bottom-0 z-10 border-t bg-nav pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-center gap-1.5">
              <Bone className="size-6" delay={i * 80} />
              <Bone className="h-2.5 w-10" delay={i * 80} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
