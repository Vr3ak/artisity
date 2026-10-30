import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Resolves a user-supplied redirect target to a same-origin path, else "/".
// Parsing with URL catches "//evil.com", "/\\evil.com", "https://evil.com", etc.
export function safeRedirectPath(next: string | null): string {
  const base = "http://same.origin";
  const url = new URL(next ?? "/", base);
  return url.origin === base ? url.pathname + url.search + url.hash : "/";
}

// Public profile URL: /@username once chosen, else the id route
export function profileHref(p: { id: string; username?: string | null }) {
  return p.username ? `/@${p.username}` : `/artists/${p.id}`;
}

// Mirrors the profiles.username check constraint
export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
// Names only the rule the username breaks; toUsername already strips most bad characters as you type
export function usernameError(u: string): string | null {
  if (!u) return "Choose a username.";
  if (u.length < 3) return "Username needs at least 3 characters.";
  if (u.length > 30) return "Username can be at most 30 characters.";
  if (!USERNAME_RE.test(u)) return "Username can only use lowercase letters, numbers and _.";
  return null;
}
// What a user typed → candidate username (lowercased, spaces and stray characters dropped)
export const toUsername = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

// Public URL of a file in the profile-images bucket (posts store the path, not the URL)
export const profileImageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;

// A post's image paths: the cover is image_path, the rest add -1 … -9 (see supabase/schemas/posts.sql)
export const postImagePaths = (imagePath: string, count: number) =>
  Array.from({ length: count }, (_, i) => (i ? `${imagePath}-${i}` : imagePath));

// RLS rejects writes between blocked users (and other forbidden writes) with 42501;
// show that plainly instead of "new row violates row-level security policy".
export function errorText(err: unknown, fallback: string) {
  if ((err as { code?: unknown } | null)?.code === "42501") return "You can't contact this person.";
  return err instanceof Error ? err.message : fallback;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Whole-unit price range, e.g. "$20 – $50" or "KHR 100,000"
export function formatPrice(min: number, max: number, currency: string) {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return min === max
    ? fmt.format(min)
    : `${fmt.format(min)} – ${fmt.format(max)}`;
}

// Profile URLs for contact_methods handles (the DB stores bare handles)
export function contactLinks(
  contact: { telegram: string | null; facebook: string | null; instagram: string | null } | null,
) {
  if (!contact) return [];
  return [
    contact.telegram && { label: "Telegram", href: `https://t.me/${contact.telegram}` },
    contact.facebook && { label: "Facebook", href: `https://facebook.com/${contact.facebook}` },
    contact.instagram && { label: "Instagram", href: `https://instagram.com/${contact.instagram}` },
  ].filter((l): l is { label: string; href: string } => !!l);
}
