"use client";

import { PrefixInput, fieldClass, pillClass } from "@/components/flow";
import { Facebook, Instagram, Pencil, Plus, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

// Profile editing pieces shared by onboarding and /profile (layout after vgen.co).

export const IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";
export const MAX_LINKS = 5;

export function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

// Square preview of a picked file with a remove button, for multi-image pickers
export function ImageTile({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const url = useObjectUrl(file);
  return (
    <li className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="size-full object-cover" />
      )}
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-nav/80 hover:bg-nav"
      >
        <X className="size-4" />
      </button>
    </li>
  );
}

const roundButton =
  "flex size-11 items-center justify-center rounded-full bg-foreground text-background shadow-md hover:bg-foreground/90";

// Cover banner with edit/remove buttons and an overlapping avatar. Bleeds to the edges of a FlowCard.
export function ImagesEditor({
  avatarSrc,
  coverSrc,
  onAvatar,
  onCover,
  onRemoveCover,
}: {
  avatarSrc: string | null;
  coverSrc: string | null;
  onAvatar: (file: File) => void;
  onCover: (file: File) => void;
  onRemoveCover: () => void;
}) {
  return (
    <div className="-mx-6 sm:-mx-8">
      <div className="relative h-40 bg-secondary">
        {coverSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" className="size-full object-cover" />
        )}
        <div className="absolute right-4 top-4 flex gap-2">
          <label
            className={`${roundButton} cursor-pointer focus-within:ring-2 focus-within:ring-ring`}
          >
            <Pencil className="size-5" />
            <span className="sr-only">Change cover image</span>
            <input
              type="file"
              accept={IMAGE_TYPES}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCover(f);
                e.target.value = "";
              }}
            />
          </label>
          {coverSrc && (
            <button
              type="button"
              aria-label="Remove cover image"
              onClick={onRemoveCover}
              className={roundButton}
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 px-6 sm:px-8">
        <label className="relative -mt-14 flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-nav bg-secondary focus-within:ring-2 focus-within:ring-ring">
          {avatarSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <span className="relative flex size-11 items-center justify-center rounded-full bg-foreground/90 text-background shadow-md">
            <Pencil className="size-5" />
          </span>
          <span className="sr-only">Change profile picture</span>
          <input
            type="file"
            accept={IMAGE_TYPES}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAvatar(f);
              e.target.value = "";
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Cover 1500×500 and picture 400×400 look best. PNG, JPEG, WebP or GIF;
          large images are resized, GIFs up to 7 MB.
        </p>
      </div>
    </div>
  );
}

export function LinksEditor({
  links,
  onChange,
}: {
  links: string[];
  onChange: (links: string[]) => void;
}) {
  return (
    <>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            aria-label={`Link ${i + 1}`}
            type="url"
            inputMode="url"
            placeholder="instagram.com/yourname"
            value={link}
            onChange={(e) =>
              onChange(links.map((l, j) => (j === i ? e.target.value : l)))
            }
            className={fieldClass}
          />
          <button
            type="button"
            aria-label={`Remove link ${i + 1}`}
            onClick={() => onChange(links.filter((_, j) => j !== i))}
            className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </div>
      ))}
      {links.length < MAX_LINKS && (
        <button
          type="button"
          onClick={() => onChange([...links, ""])}
          className={pillClass.quiet}
        >
          <Plus className="size-5" />
          Add link
        </button>
      )}
    </>
  );
}

// Handles as the DB stores them (see supabase/schemas/contact_methods.sql); pasted links are trimmed to the handle
export const CONTACTS = [
  {
    key: "telegram",
    label: "Telegram",
    prefix: "t.me/",
    icon: Send,
    re: /^[A-Za-z0-9_]{5,32}$/,
    strip: /^(https?:\/\/)?(t\.me\/|telegram\.me\/)?@?/i,
  },
  {
    key: "facebook",
    label: "Facebook",
    prefix: "facebook.com/",
    icon: Facebook,
    re: /^[A-Za-z0-9.]{5,50}$/,
    strip: /^(https?:\/\/)?((www|m)\.)?(facebook\.com\/)?@?/i,
  },
  {
    key: "instagram",
    label: "Instagram",
    prefix: "instagram.com/",
    icon: Instagram,
    re: /^[A-Za-z0-9._]{1,30}$/,
    strip: /^(https?:\/\/)?(www\.)?(instagram\.com\/)?@?/i,
  },
] as const;
export type Contacts = Record<(typeof CONTACTS)[number]["key"], string>;
export const EMPTY_CONTACTS: Contacts = {
  telegram: "",
  facebook: "",
  instagram: "",
};

// Typed values → contact_methods row (null for blanks); throws a readable error for a bad handle
export function contactRow(contacts: Contacts) {
  return Object.fromEntries(
    CONTACTS.map(({ key, label, re, strip }) => {
      const v = contacts[key].trim().replace(strip, "").replace(/\/+$/, "");
      if (v && !re.test(v))
        throw new Error(`${label}: that doesn't look like a valid username.`);
      return [key, v || null];
    }),
  );
}

export function ContactFields({
  contacts,
  onChange,
}: {
  contacts: Contacts;
  onChange: (contacts: Contacts) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {CONTACTS.map(({ key, label, prefix, icon: Icon }) => (
        <PrefixInput
          key={key}
          aria-label={`${label} username`}
          icon={<Icon className="size-5 shrink-0 text-muted-foreground" />}
          prefix={prefix}
          placeholder="username"
          autoCapitalize="none"
          spellCheck={false}
          value={contacts[key]}
          onChange={(e) => onChange({ ...contacts, [key]: e.target.value })}
        />
      ))}
    </div>
  );
}
