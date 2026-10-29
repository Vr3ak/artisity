"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FormError, MIN_PASSWORD } from "@/components/auth-parts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Sets the signed-in user's password: after a reset link, or as the last step of email sign-up.
export function UpdatePasswordForm({
  title = "Reset your password",
  description = "Enter a new password for your account.",
  submitLabel = "Save new password",
  next = "/",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  title?: string;
  description?: string;
  submitLabel?: string;
  next?: string;
}) {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== repeatPassword) {
      setError(
        "Passwords don't match. Re-enter the same password in both fields.",
      );
      return;
    }
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                aria-describedby="password-hint"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p id="password-hint" className="text-xs text-muted-foreground">
                At least {MIN_PASSWORD} characters.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repeat-password">Confirm password</Label>
              <Input
                id="repeat-password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>
            <FormError message={error} />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving…" : submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
