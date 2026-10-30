"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth-parts";
import { type Provider } from "@supabase/supabase-js";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

// Same OAuth client id as Supabase's Google provider (public, not a secret)
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// The slice of Google Identity Services (accounts.google.com/gsi/client) used here
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            nonce: string;
            ux_mode: "popup";
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
        };
      };
    };
  }
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Google's own button (Google Identity Services). It runs on our origin, so the account
// chooser says "to continue to artisity.co" instead of the Supabase project domain. Its ID
// token signs in with Supabase directly, so /auth/callback isn't involved.
function GoogleButton({
  next,
  verb,
  onError,
  onUnavailable,
}: {
  next: string;
  verb: string;
  onError: (message: string | null) => void;
  // GIS couldn't start (script blocked, or no crypto outside a secure context); use the redirect flow
  onUnavailable: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [signingIn, setSigningIn] = useState(false);

  // renderButton takes a fixed pixel width, so it's redrawn whenever the container's width changes
  const draw = useCallback(
    (width: number) => {
      const el = container.current;
      const gsi = window.google?.accounts.id;
      if (!el || !gsi || !initialized.current || width === 0) return;
      // ponytail: theme is read per draw; switching theme alone doesn't redraw the button
      gsi.renderButton(el, {
        type: "standard",
        theme: document.documentElement.classList.contains("dark") ? "filled_black" : "outline",
        size: "large",
        shape: "pill",
        text: verb.startsWith("Sign up") ? "signup_with" : verb.startsWith("Log in") ? "signin_with" : "continue_with",
        logo_alignment: "center",
        width: Math.min(width, 400), // GIS max
      });
    },
    [verb],
  );

  const setup = useCallback(async () => {
    const gsi = window.google?.accounts.id;
    if (!gsi || !GOOGLE_CLIENT_ID) throw new Error("Google Identity Services didn't load");
    // Google puts the hash in the ID token; Supabase checks it against the raw nonce.
    // Both calls throw outside a secure context (HTTPS or localhost).
    const nonce = crypto.randomUUID();
    gsi.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce: await sha256Hex(nonce),
      ux_mode: "popup",
      callback: async ({ credential }) => {
        setSigningIn(true);
        onError(null);
        const { error } = await createClient().auth.signInWithIdToken({
          provider: "google",
          token: credential,
          nonce,
        });
        if (error) {
          setSigningIn(false);
          return onError(error.message);
        }
        // Full load, like the redirect flow: the server-rendered header needs the new session
        window.location.assign(next);
      },
    });
    initialized.current = true;
    draw(Math.round(container.current?.clientWidth ?? 0));
  }, [next, onError, draw]);

  // Covers every width change: a closed <dialog> (0 until it opens), window resizes, phone rotation
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let last = -1;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width === last) return; // the button's own height changes don't need a redraw
      last = width;
      draw(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onReady={() => void setup().catch(onUnavailable)}
        onError={onUnavailable}
      />
      {/* min-h reserves the button's height so the card doesn't jump when it renders.
          color-scheme light matches Google's iframe; on our dark root a mismatch makes
          Chrome paint the iframe an opaque white box. */}
      <div ref={container} className="flex min-h-11 w-full justify-center [color-scheme:light]" />
      {signingIn && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Signing in…
        </p>
      )}
    </>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}

export function OAuthButtons({
  next = "/",
  verb = "Continue with",
  showFacebook = false,
  buttonClassName,
}: {
  next?: string;
  verb?: string;
  showFacebook?: boolean;
  buttonClassName?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Provider | null>(null);
  const [gisUnavailable, setGisUnavailable] = useState(false);

  const handleOAuth = async (provider: Provider) => {
    const supabase = createClient();
    setPending(provider);
    setError(null);

    // On success the browser navigates to the provider, so only errors land here
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {GOOGLE_CLIENT_ID && !gisUnavailable ? (
        <GoogleButton
          next={next}
          verb={verb}
          onError={setError}
          onUnavailable={() => setGisUnavailable(true)}
        />
      ) : (
        // Redirect flow through Supabase: no client id configured (e.g. local dev), or GIS failed to start
        <Button
          type="button"
          variant="outline"
          className={cn("w-full", buttonClassName)}
          disabled={pending !== null}
          onClick={() => handleOAuth("google")}
        >
          <GoogleIcon />
          {pending === "google" ? "Redirecting…" : `${verb} Google`}
        </Button>
      )}
      {showFacebook && (
        // ponytail: placeholder until the Facebook provider is configured in Supabase
        <Button
          type="button"
          variant="outline"
          className={cn("w-full", buttonClassName)}
          disabled
          title="Coming soon"
        >
          <FacebookIcon />
          {verb} Facebook
          <span className="text-xs font-normal text-muted-foreground">
            Soon
          </span>
        </Button>
      )}
      <FormError message={error} />
    </div>
  );
}
