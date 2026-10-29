"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth-parts";
import { type Provider } from "@supabase/supabase-js";
import { useState } from "react";

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
