"use client";

import { createClient } from "@/lib/supabase/client";
import { openConversation } from "@/lib/conversations";
import { CURRENCIES, categoryLabel } from "@/lib/options";
import { cn, errorText, formatPrice } from "@/lib/utils";
import { FormError } from "@/components/auth-parts";
import { Field, SelectField, fieldClass, pillClass } from "@/components/flow";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type PricedService = { category: string; price_min: number; price_max: number; currency: string };

export function RequestForm({
  userId,
  artistId,
  artistName,
  categories,
  services,
  initialCategory,
}: {
  userId: string;
  artistId: string;
  artistName: string;
  categories: string[];
  services: PricedService[];
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(
    initialCategory && categories.includes(initialCategory)
      ? initialCategory
      : (categories[0] ?? ""),
  );
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState("");
  // Fiverr shows the gig's price beside the order: the chosen service's range, in its currency
  const priceOf = (c: string) => services.find((s) => s.category === c);
  const price = priceOf(category);
  const [currency, setCurrency] = useState<string>(price?.currency ?? CURRENCIES[0]);
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!brief.trim()) return setError("Describe what you need in the brief.");
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("requests")
        .insert({
          artist_id: artistId,
          category,
          brief: brief.trim(),
          budget: budget ? Number(budget) : null,
          currency,
          deadline: deadline || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      // The request page embeds this pair's chat
      await openConversation(supabase, userId, artistId);
      router.push(`/requests/${data.id}`);
    } catch (error: unknown) {
      setError(errorText(error, "An error occurred"));
      setIsLoading(false);
    }
  };

  // Same page shape as /posts/new: heading above a filled card of flow fields
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Request a commission</h1>
        <p className="text-muted-foreground">
          {artistName} will accept or decline. You can keep talking in chat either way.
        </p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 rounded-3xl bg-nav p-6 shadow-card sm:p-8">
        <Field
          label="Service"
          hint={
            price ? (
              <>
                {artistName} usually charges{" "}
                <span className="font-semibold tabular-nums text-primary-ink">
                  {formatPrice(price.price_min, price.price_max, price.currency)}
                </span>{" "}
                for this.
              </>
            ) : (
              "No listed price for this one. Put your budget below or ask for a quote in the brief."
            )
          }
        >
          {(id) => (
            <SelectField
              id={id}
              required
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                // Follow the service's currency until the client types a budget of their own
                const next = priceOf(e.target.value);
                if (next && !budget) setCurrency(next.currency);
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </SelectField>
          )}
        </Field>
        <Field label="Brief" hint={`${brief.length}/2000`}>
          {(id) => (
            <textarea
              id={id}
              required
              maxLength={2000}
              rows={6}
              placeholder="What you need, sizes or formats, references, and where it will be used"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className={cn(fieldClass, "h-auto min-h-40 resize-y py-3")}
            />
          )}
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Budget (optional)">
            {(id) => (
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className={cn(fieldClass, "tabular-nums")}
                />
                <SelectField aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-3 pr-8">
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </SelectField>
              </div>
            )}
          </Field>
          <Field label="Deadline (optional)">
            {(id) => (
              <input
                id={id}
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={fieldClass}
              />
            )}
          </Field>
        </div>
        <FormError message={error} />
        <button type="submit" disabled={isLoading || !category} className={pillClass.final}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {isLoading ? "Sending…" : "Send request"}
        </button>
      </form>
    </div>
  );
}
