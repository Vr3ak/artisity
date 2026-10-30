"use client";

import { createClient } from "@/lib/supabase/client";
import { openConversation } from "@/lib/conversations";
import { CURRENCIES, categoryLabel } from "@/lib/options";
import { errorText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

const fieldClass =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function RequestForm({
  userId,
  artistId,
  artistName,
  categories,
  initialCategory,
}: {
  userId: string;
  artistId: string;
  artistName: string;
  categories: string[];
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(
    initialCategory && categories.includes(initialCategory)
      ? initialCategory
      : (categories[0] ?? ""),
  );
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Request a commission</CardTitle>
        <CardDescription>
          {artistName} will accept or decline your request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="category">Service</Label>
              <select
                id="category"
                required
                className={`${fieldClass} h-9 py-1`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brief">Brief</Label>
              <textarea
                id="brief"
                required
                maxLength={2000}
                className={`${fieldClass} min-h-32`}
                placeholder="What do you need, sizes or formats, references, where it will be used…"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budget">Budget (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  step={1}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <select
                  aria-label="Currency"
                  className={`${fieldClass} h-9 w-24 py-1`}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input
                id="deadline"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !category}
            >
              {isLoading ? "Sending..." : "Send request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
