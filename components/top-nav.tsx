import Link from "next/link";
import { Heart, Menu, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { NavMenu } from "./nav-menu";
import { Avatar, TabBar } from "./tab-bar";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name, avatar_url, role")
        .eq("id", user.sub)
        .maybeSingle()
    : { data: null };
  const role = profile?.role ?? null;
  const accountLabel = user
    ? `Account menu for ${profile?.display_name || user.email}`
    : "Account menu";

  return (
    <>
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

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/messages"
            aria-label="Messages"
            title="Messages"
            className={iconButtonClass}
          >
            <MessageCircle className="size-5" />
          </Link>
          {/* ponytail: saved artists/posts don't exist yet */}
          <span
            aria-disabled
            aria-label="Favorites (coming soon)"
            title="Favorites (coming soon)"
            className={`${iconButtonClass} ${soonClass}`}
          >
            <Heart className="size-5" />
          </span>
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
            trigger={
              <button
                type="button"
                aria-label={accountLabel}
                className="flex h-10 items-center gap-2 rounded-full bg-secondary pl-1.5 pr-3 transition-colors hover:bg-accent data-[state=open]:bg-accent"
              >
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
      />
    </>
  );
}
