"use client";

import { createClient } from "@/lib/supabase/client";
import { toUsername, usernameError } from "@/lib/utils";
import { OAuthButtons } from "@/components/oauth-buttons";
import { FormError, MIN_PASSWORD } from "@/components/auth-parts";
import {
  Field,
  FlowCard,
  PasswordInput,
  PrefixInput,
  Switch,
  pillClass,
} from "@/components/flow";
import { Check, Info, Mail, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Mirrors otp_length in supabase/config.toml
const CODE_LENGTH = 6;
// Hosted Supabase allows one code email per 60s per address
const RESEND_SECONDS = 60;

const inlineBox =
  "flex h-14 items-center gap-3 rounded-xl bg-secondary pl-4 pr-2 focus-within:ring-2 focus-within:ring-ring";
const inlineInput =
  "h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none disabled:opacity-60";
const inlineButton =
  "h-10 shrink-0 rounded-full bg-nav px-4 text-sm font-semibold tabular-nums hover:bg-accent disabled:opacity-50";

type Step = "choose" | "account" | "password";

// Sign-up after vgen.co: pick a method, then (email) 1/2 username + email verified by a
// one-time code, 2/2 password + "I'm an artist". Verifying the code signs the user in, so
// step 1 can save the username under RLS and step 2 can set the password on the session.
export function SignUpForm() {
  const [step, setStep] = useState<Step>("choose");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [showSentNotice, setShowSentNotice] = useState(false);
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [isArtist, setIsArtist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "send" | "verify" | "continue" | "create" | null
  >(null);
  const [cooldown, setCooldown] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
    // Steps swap in place, so move focus to the new heading for keyboard and screen-reader users
    setTimeout(() => heading.current?.focus());
  };

  const sendCode = async () => {
    setBusy("send");
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(null);
    if (error) return setError(error.message);
    setCodeSent(true);
    setShowSentNotice(true);
    setCooldown(RESEND_SECONDS);
  };

  const verify = async () => {
    setBusy("verify");
    setError(null);
    const { error } = await createClient().auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setBusy(null);
    if (error)
      return setError(
        error.code === "otp_expired"
          ? "That code is wrong or has expired. Check the latest email, or resend."
          : error.message,
      );
    setVerified(true);
    setShowSentNotice(false);
  };

  const saveUsername = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const bad = usernameError(username);
    if (bad) return setError(bad);
    setBusy("continue");
    setError(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getClaims();
    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", data!.claims.sub);
    setBusy(null);
    if (error)
      return setError(
        error.code === "23505"
          ? "That username is taken. Try another."
          : error.message,
      );
    go("password");
  };

  const createAccount = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy("create");
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setBusy(null);
      return setError(error.message);
    }
    router.push(`/onboarding?role=${isArtist ? "artist" : "client"}`);
    router.refresh();
  };

  if (step === "choose")
    return (
      <FlowCard headingRef={heading} title="Join Artisity">
        <div className="flex flex-col gap-3">
          <OAuthButtons
            next="/onboarding"
            verb="Sign up with"
            showFacebook
            buttonClassName={pillClass.oauth}
          />
          <button
            type="button"
            className={pillClass.quiet}
            onClick={() => go("account")}
          >
            <Mail className="size-5" />
            Sign up with email
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            replace
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      </FlowCard>
    );

  if (step === "account")
    return (
      <FlowCard
        headingRef={heading}
        step={1}
        total={2}
        onBack={() => go("choose")}
        title="Create account"
      >
        <form onSubmit={saveUsername} className="flex flex-col gap-6">
          {showSentNotice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl bg-primary/15 p-4 text-sm"
            >
              <Info className="mt-0.5 size-4 shrink-0 text-primary-ink" />
              <p className="flex-1">
                We sent a {CODE_LENGTH}-digit code to{" "}
                <span className="break-all font-semibold">{email}</span>. It may
                take a minute to arrive.
              </p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setShowSentNotice(false)}
                className="-m-1 rounded-full p-1 hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <Field label="Username">
            {(id) => (
              <PrefixInput
                id={id}
                prefix="artisity.com/@"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(toUsername(e.target.value))}
              />
            )}
          </Field>

          <Field label="Email">
            {(id) => (
              <div className="flex flex-col gap-3">
                <div className={inlineBox}>
                  <Mail className="size-5 shrink-0 text-muted-foreground" />
                  <input
                    id={id}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    disabled={verified}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inlineInput}
                  />
                  {!verified && (
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={
                        !email.includes("@") || busy !== null || cooldown > 0
                      }
                      className={inlineButton}
                    >
                      {busy === "send"
                        ? "Sending…"
                        : cooldown > 0
                          ? `Resend ${cooldown}s`
                          : codeSent
                            ? "Resend"
                            : "Send code"}
                    </button>
                  )}
                </div>
                {codeSent && (
                  <div className={inlineBox}>
                    <input
                      aria-label="Verification code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter code"
                      maxLength={CODE_LENGTH}
                      disabled={verified}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ""))
                      }
                      className={`${inlineInput} tabular-nums tracking-widest placeholder:tracking-normal`}
                    />
                    {verified ? (
                      <span className="flex h-10 items-center gap-1.5 px-3 text-sm font-semibold text-primary-ink">
                        <Check className="size-4" /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={verify}
                        disabled={code.length !== CODE_LENGTH || busy !== null}
                        className={inlineButton}
                      >
                        {busy === "verify" ? "Verifying…" : "Verify"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Field>

          <FormError message={error} />
          <button
            type="submit"
            disabled={!verified || busy !== null}
            className={verified ? pillClass.next : pillClass.outline}
          >
            {busy === "continue" ? "Saving…" : "Continue"}
          </button>
        </form>
      </FlowCard>
    );

  return (
    <FlowCard
      headingRef={heading}
      step={2}
      total={2}
      onBack={() => go("account")}
      title="Finish signing up"
    >
      <form onSubmit={createAccount} className="flex flex-col gap-6">
        <Field label="Password">
          {(id) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              placeholder={`${MIN_PASSWORD}+ characters`}
              minLength={MIN_PASSWORD}
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Switch
          checked={isArtist}
          onChange={setIsArtist}
          label="I'm an artist"
        />
        <FormError message={error} />
        <button
          type="submit"
          disabled={password.length < MIN_PASSWORD || busy !== null}
          className={pillClass.final}
        >
          {busy === "create" ? "Creating account…" : "Create account"}
        </button>
      </form>
    </FlowCard>
  );
}
