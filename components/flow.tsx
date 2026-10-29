"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

// Building blocks for the step-by-step sign-up and onboarding cards (layout after vgen.co):
// a dark card, back chevron + step counter, a large heading, filled fields and pill buttons.

export const fieldClass =
  "h-14 w-full rounded-xl border-0 bg-secondary px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

const pill =
  "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-nav disabled:pointer-events-none disabled:opacity-40";
export const pillClass = {
  // Foreground-colored "Next" pill for intermediate steps
  next: `${pill} bg-foreground text-background hover:bg-foreground/90`,
  // Gold pill for the step that commits
  final: `${pill} bg-primary text-primary-foreground hover:bg-primary/90`,
  // Quiet pill for secondary actions ("Add link")
  quiet: `${pill} bg-secondary text-foreground hover:bg-accent`,
  // Google/Facebook buttons inside a flow card (passed to OAuthButtons)
  oauth:
    "h-14 rounded-full border-0 bg-secondary text-base font-semibold shadow-none hover:bg-accent",
  // Outline pill while the main action isn't available yet
  outline: `${pill} border border-input text-foreground hover:bg-secondary`,
};

export function FlowCard({
  step,
  total,
  onBack,
  title,
  description,
  headingRef,
  children,
}: {
  headingRef?: React.Ref<HTMLHeadingElement>;
  step?: number;
  total?: number;
  onBack?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-nav p-6 shadow-float sm:p-8">
      {(onBack || step) && (
        <div className="mb-6 flex h-8 items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : (
            <span />
          )}
          {step && total && (
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              <span className="sr-only">Step </span>
              {step}/{total}
            </span>
          )}
        </div>
      )}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-balance text-3xl font-bold leading-tight tracking-tight outline-none sm:text-4xl"
      >
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-base text-muted-foreground">{description}</p>
      )}
      <div className="mt-8 flex flex-col gap-6">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  // Receives the id to put on the control so the label points at it
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

// A filled field with a fixed prefix, e.g. "artisity.com/@" before a username
export function PrefixInput({
  prefix,
  icon,
  className,
  ...props
}: React.ComponentProps<"input"> & {
  prefix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex h-14 items-center gap-2 rounded-xl bg-secondary px-4 focus-within:ring-2 focus-within:ring-ring">
      {icon}
      {prefix && (
        <span className="shrink-0 text-muted-foreground">{prefix}</span>
      )}
      <input
        {...props}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      />
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold">
      {label}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-8 w-14 shrink-0 rounded-full bg-secondary transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-nav after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-muted-foreground after:transition-transform peer-checked:after:translate-x-6 peer-checked:after:bg-primary-foreground motion-reduce:after:transition-none"
      />
    </label>
  );
}

// Native select in the filled style, with a drawn chevron in place of the browser arrow
export function SelectField({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(fieldClass, "appearance-none pr-10", className)}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

// Filled password field with a show/hide toggle
export function PasswordInput(
  props: Omit<React.ComponentProps<"input">, "type">,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex h-14 items-center gap-2 rounded-xl bg-secondary pl-4 pr-2 focus-within:ring-2 focus-within:ring-ring">
      <input
        {...props}
        type={show ? "text" : "password"}
        className="h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-nav"
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
