"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import {
  USERNAME_HINT,
  USERNAME_RE,
  cn,
  parseSocialLinks,
  toUsername,
} from "@/lib/utils";
import { BUSINESS_TYPES, PROVINCES } from "@/lib/options";
import { FormError } from "@/components/auth-parts";
import {
  Field,
  PrefixInput,
  SelectField,
  fieldClass,
  pillClass,
} from "@/components/flow";
import {
  ContactFields,
  ImagesEditor,
  LinksEditor,
  contactRow,
  useObjectUrl,
  type Contacts,
} from "@/components/profile-fields";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type Profile = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  social_links: string[];
  location: string | null;
  role: string | null;
  business_name: string | null;
  business_type: string | null;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-3xl bg-nav p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

// Profile editor in the same cards as onboarding (after vgen.co), saved in one go from a sticky bar.
export function ProfileForm({
  profile,
  contacts: initialContacts,
  userId,
}: {
  profile: Profile;
  contacts: Contacts;
  userId: string;
}) {
  const isClient = profile.role === "client";
  const [name, setName] = useState(profile.display_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [businessName, setBusinessName] = useState(profile.business_name ?? "");
  const [businessType, setBusinessType] = useState(profile.business_type ?? "");
  const [links, setLinks] = useState(profile.social_links);
  const [contacts, setContacts] = useState(initialContacts);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const router = useRouter();

  const avatarPreview = useObjectUrl(avatar);
  const coverPreview = useObjectUrl(cover);
  const avatarSrc = avatarPreview ?? profile.avatar_url;
  const coverSrc = coverPreview ?? (coverRemoved ? null : profile.cover_url);

  // Any edit after a save clears the "Saved" confirmation
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setStatus("idle");
    };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setStatus("saving");
    const supabase = createClient();
    try {
      if (!name.trim()) throw new Error("Add a display name.");
      if (username && !USERNAME_RE.test(username))
        throw new Error(`Username: ${USERNAME_HINT}.`);
      if (isClient && !businessType)
        throw new Error("Choose what best describes you.");
      const socialLinks = parseSocialLinks(
        links.filter((l) => l.trim()).join("\n"),
      );
      const contactValues = contactRow(contacts);

      const { error: contactError } = await supabase
        .from("contact_methods")
        .upsert({ user_id: userId, ...contactValues });
      if (contactError) throw contactError;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim(),
          username: username || null,
          bio: bio.trim() || null,
          location: location || null,
          social_links: socialLinks,
          ...(isClient && {
            business_name: businessName.trim() || null,
            business_type: businessType,
          }),
          ...(avatar && {
            avatar_url: await uploadImage(supabase, `${userId}/avatar`, avatar, 800),
          }),
          ...(cover
            ? {
                cover_url: await uploadImage(
                  supabase,
                  `${userId}/cover`,
                  cover,
                ),
              }
            : coverRemoved && { cover_url: null }),
        })
        .eq("id", userId);
      if (error)
        throw new Error(
          error.code === "23505"
            ? "That username is taken. Try another."
            : error.message,
        );

      setAvatar(null);
      setCover(null);
      setLinks(socialLinks);
      setStatus("saved");
      router.refresh();
    } catch (err: unknown) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Section title="Look and feel">
        <ImagesEditor
          avatarSrc={avatarSrc}
          coverSrc={coverSrc}
          onAvatar={edit(setAvatar)}
          onCover={(f) => {
            edit(setCover)(f);
            setCoverRemoved(false);
          }}
          onRemoveCover={() => {
            edit(setCover)(null);
            setCoverRemoved(true);
          }}
        />
        <Field label="Display name">
          {(id) => (
            <input
              id={id}
              required
              maxLength={100}
              autoComplete="name"
              value={name}
              onChange={(e) => edit(setName)(e.target.value)}
              className={fieldClass}
            />
          )}
        </Field>
        <Field label="Username" hint={USERNAME_HINT}>
          {(id) => (
            <PrefixInput
              id={id}
              prefix="artisity.com/@"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={30}
              value={username}
              onChange={(e) => edit(setUsername)(toUsername(e.target.value))}
            />
          )}
        </Field>
      </Section>

      <Section title="Profile details">
        <Field label="Bio" hint={`${bio.length}/500`}>
          {(id) => (
            <textarea
              id={id}
              maxLength={500}
              rows={4}
              placeholder="Who you are, your specialties, languages, tools…"
              value={bio}
              onChange={(e) => edit(setBio)(e.target.value)}
              className={`${fieldClass} h-auto min-h-32 resize-y py-3`}
            />
          )}
        </Field>
        <Field label="Province">
          {(id) => (
            <SelectField
              id={id}
              value={location}
              onChange={(e) => edit(setLocation)(e.target.value)}
            >
              <option value="">Select your province…</option>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SelectField>
          )}
        </Field>
        {isClient && (
          <>
            <Field label="What best describes you?">
              {(id) => (
                <SelectField
                  id={id}
                  value={businessType}
                  onChange={(e) => edit(setBusinessType)(e.target.value)}
                >
                  <option value="">Select…</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </SelectField>
              )}
            </Field>
            <Field label="Business name (optional)">
              {(id) => (
                <input
                  id={id}
                  maxLength={100}
                  value={businessName}
                  onChange={(e) => edit(setBusinessName)(e.target.value)}
                  className={fieldClass}
                />
              )}
            </Field>
          </>
        )}
      </Section>

      <Section
        title="Socials + links"
        description="Shown on your public profile."
      >
        <LinksEditor links={links} onChange={edit(setLinks)} />
      </Section>

      <Section
        title="Contact methods"
        description="Private. Only shared with people you have a commission request with."
      >
        <ContactFields contacts={contacts} onChange={edit(setContacts)} />
      </Section>

      {/* Sticky save bar; bottom-[5rem+inset] clears the mobile tab bar */}
      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[5] flex flex-col gap-2 rounded-3xl bg-nav/95 p-3 shadow-float backdrop-blur md:bottom-4">
        <FormError message={error} />
        <div className="flex items-center gap-3">
          <p
            role="status"
            className="flex-1 pl-3 text-sm text-muted-foreground"
          >
            {status === "saved" && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary-ink">
                <Check className="size-4" /> Saved
              </span>
            )}
          </p>
          <button
            type="submit"
            disabled={status === "saving"}
            className={cn(pillClass.final, "h-12 w-auto px-8")}
          >
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
