"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormError } from "@/components/auth-parts";
import { Field, PasswordInput, fieldClass } from "@/components/flow";
import { Section } from "@/components/section";
import { THEMES } from "@/components/nav-menu";
import { useTheme } from "@/hooks/use-theme";
import { type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const button =
  "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const primary = `${button} bg-foreground text-background hover:bg-foreground/90`;
const quiet = `${button} bg-secondary hover:bg-accent`;

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-2xl bg-secondary px-4 py-3 text-sm">
      {children}
    </p>
  );
}

// Email change. double_confirm_changes is on, so Supabase mails a link to both the old and the new
// address and switches only once both are confirmed.
export function EmailSettings({ email }: { email: string }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const next = value.trim().toLowerCase();
    if (next === email) return setError("That's already your email.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser(
      { email: next },
      { emailRedirectTo: `${location.origin}/settings/account` },
    );
    setBusy(false);
    if (error) return setError(error.message);
    setSentTo(next);
    setValue("");
  };

  return (
    <Section title="Email" description="Used to log in and for messages about your account.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm">
          Current: <strong className="break-all font-semibold">{email}</strong>
        </p>
        <Field label="New email">
          {(id) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={fieldClass}
            />
          )}
        </Field>
        {sentTo && (
          <Notice>
            Check your inbox at <strong>{email}</strong> and at <strong>{sentTo}</strong>. Your email
            changes once you confirm from both.
          </Notice>
        )}
        <FormError message={error} />
        <button type="submit" disabled={busy || !value.trim()} className={cn(primary, "self-start")}>
          {busy ? "Sending…" : "Change email"}
        </button>
      </form>
    </Section>
  );
}

// Change, or set for the first time if they signed up with Google. secure_password_change is off,
// so a signed-in session is enough.
export function PasswordSettings() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error)
      return setError(
        error.code === "same_password" ? "That's your current password. Pick a new one." : error.message,
      );
    setDone(true);
    setPassword("");
    setConfirm("");
  };

  return (
    <Section title="Password" description="Change your password, or set one if you signed up with Google.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="New password">
          {(id) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Field label="Confirm new password">
          {(id) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
        </Field>
        {done && <Notice>Password saved.</Notice>}
        <FormError message={error} />
        <button type="submit" disabled={busy || !password || !confirm} className={cn(primary, "self-start")}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </Section>
  );
}

export function SessionSettings() {
  const [busy, setBusy] = useState(false);
  const logoutEverywhere = async () => {
    setBusy(true);
    await createClient().auth.signOut({ scope: "global" });
    // Full load, like the menu's Log out: this page now redirects
    window.location.assign("/auth/login");
  };
  return (
    <Section
      title="Devices"
      description="Logged in on a phone or computer you no longer use? Log out everywhere, including here."
    >
      <button type="button" onClick={logoutEverywhere} disabled={busy} className={cn(quiet, "self-start")}>
        {busy ? "Logging out…" : "Log out of all devices"}
      </button>
    </Section>
  );
}

// Same choice as the account menu's segmented control (both use useTheme, so they stay in sync)
export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <Section title="Theme" description="System follows your device's light or dark setting.">
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="sr-only">Theme</legend>
        {THEMES.map(({ value, label, Icon }) => (
          <label
            key={value}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-secondary py-4 text-sm font-semibold transition-colors hover:bg-accent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value as Theme)}
              className="sr-only"
            />
            <Icon className="size-5" />
            {label}
          </label>
        ))}
      </fieldset>
    </Section>
  );
}
