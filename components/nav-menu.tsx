"use client";

import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioItem } from "@radix-ui/react-dropdown-menu";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { type Theme } from "@/lib/theme";
import Link from "next/link";

const THEMES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

// Account menu. The caller supplies the trigger (a <button>): the top bar's
// avatar pill on desktop, the Account tab on mobile.
export function NavMenu({
  signedIn,
  role,
  trigger,
  side = "bottom",
}: {
  signedIn: boolean;
  role: string | null;
  trigger: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const { theme, setTheme } = useTheme();

  const logout = async () => {
    await createClient().auth.signOut();
    // Full load: a soft push would open the login modal over a page that now redirects
    window.location.assign("/auth/login");
  };

  // Segmented Light/Dark/System control; preventDefault keeps the menu open
  const themeItem = (
    <>
      <DropdownMenuLabel className="pb-1 text-xs font-medium text-muted-foreground">
        Theme
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={theme}
        onValueChange={(v) => setTheme(v as Theme)}
        className="mx-1 mb-1 grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1"
      >
        {THEMES.map(({ value, label, Icon }) => (
          <RadioItem
            key={value}
            value={value}
            onSelect={(e) => e.preventDefault()}
            className="flex cursor-default select-none flex-col items-center gap-1 rounded-md py-2 text-xs font-medium text-muted-foreground outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          >
            <Icon className="size-4" />
            {label}
          </RadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={side} className="w-52">
        {signedIn ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/requests">Requests</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            {!role && (
              <DropdownMenuItem asChild>
                <Link href="/onboarding">Finish setup</Link>
              </DropdownMenuItem>
            )}
            {role === "admin" && (
              <DropdownMenuItem asChild>
                <Link href="/staff">Staff</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {themeItem}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}>Log out</DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/auth/login">Log in</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/auth/sign-up">Sign up</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {themeItem}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
