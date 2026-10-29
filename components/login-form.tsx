"use client";

import { createClient } from "@/lib/supabase/client";
import { OAuthButtons } from "@/components/oauth-buttons";
import { useAuthModal } from "@/components/auth-modal";
import { AuthDivider, FormError } from "@/components/auth-parts";
import {
  Field,
  FlowCard,
  PasswordInput,
  fieldClass,
  pillClass,
} from "@/components/flow";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Onboarded users are bounced from /onboarding to /; a first-time Google login lands in onboarding,
// which asks for the role itself.
const NEXT = "/onboarding";

// Same card system as sign-up (after vgen.co)
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const modal = useAuthModal();

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(
        error.code === "invalid_credentials"
          ? "That email and password don't match. Check them, or reset your password."
          : error.message,
      );
      setIsLoading(false);
      return;
    }
    // In the modal, onboarded users stay on the page they were on
    if (modal) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.role) return modal.close();
    }
    router.push(NEXT);
    // Root layout's header is server-rendered; refresh so it shows the user
    router.refresh();
  };

  return (
    <FlowCard title="Welcome back">
      <OAuthButtons
        next={NEXT}
        verb="Log in with"
        showFacebook
        buttonClassName={pillClass.oauth}
      />
      <AuthDivider />
      <form onSubmit={handleLogin} className="flex flex-col gap-6">
        <Field label="Email">
          {(id) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <Field label="Password">
            {(id) => (
              <PasswordInput
                id={id}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          {/* After the field in the DOM so Tab goes email → password → this link */}
          <Link
            href="/auth/forgot-password"
            className="self-end text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <FormError message={error} />
        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className={pillClass.final}
        >
          {isLoading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to Artisity?{" "}
        <Link
          href="/auth/sign-up"
          replace
          className="font-semibold text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </FlowCard>
  );
}
