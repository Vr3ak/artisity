"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import {
  parseSocialLinks,
  profileHref,
  toUsername,
  usernameError,
} from "@/lib/utils";
import {
  BUSINESS_TYPES,
  CATEGORIES,
  CURRENCIES,
  PROVINCES,
  categoryLabel,
  type Category,
  type Currency,
} from "@/lib/options";
import { FormError } from "@/components/auth-parts";
import {
  Field,
  FlowCard,
  PrefixInput,
  SelectField,
  Switch,
  fieldClass,
  pillClass,
} from "@/components/flow";
import { ImagePlus } from "lucide-react";
import {
  ContactFields,
  EMPTY_CONTACTS,
  IMAGE_TYPES,
  ImageTile,
  ImagesEditor,
  LinksEditor,
  contactRow,
  useObjectUrl,
} from "@/components/profile-fields";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Price = { currency: Currency; min: string; max: string };
type Step =
  | "look"
  | "details"
  | "services"
  | "interests"
  | "portfolio"
  | "socials"
  | "contacts";

const MAX_PORTFOLIO = 12;

// Onboarding after vgen.co: one question per card, back chevron + counter, "All done!" commits.
// Everything is written at the end; role goes last because a set role marks onboarding done.
export function OnboardingForm({
  userId,
  initial,
  initialRole,
}: {
  userId: string;
  initial: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    cover_url: string | null;
  };
  initialRole: "client" | "artist";
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isArtist, setIsArtist] = useState(initialRole === "artist");
  // look
  const [name, setName] = useState(
    initial.display_name ?? initial.username ?? "",
  );
  const [username, setUsername] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(!!initial.username);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  // details
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  // services / interests
  const [categories, setCategories] = useState<Category[]>([]);
  const [prices, setPrices] = useState<Partial<Record<Category, Price>>>({});
  // portfolio
  const [portfolio, setPortfolio] = useState<File[]>([]);
  // socials + contacts
  const [links, setLinks] = useState<string[]>([]);
  const [contacts, setContacts] = useState(EMPTY_CONTACTS);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();

  const avatarPreview = useObjectUrl(avatar);
  const coverPreview = useObjectUrl(cover);
  const avatarSrc = avatarPreview ?? initial.avatar_url;
  const coverSrc = coverPreview ?? (coverRemoved ? null : initial.cover_url);

  const steps: Step[] = isArtist
    ? ["look", "details", "services", "portfolio", "socials", "contacts"]
    : ["look", "details", "interests", "socials", "contacts"];
  const step = steps[stepIndex];

  const goTo = (i: number) => {
    setError(null);
    setStepIndex(i);
    setTimeout(() => heading.current?.focus());
  };
  const back = stepIndex > 0 ? () => goTo(stepIndex - 1) : undefined;

  const priceFor = (c: Category): Price =>
    prices[c] ?? { currency: "USD", min: "", max: "" };
  const setPrice = (c: Category, patch: Partial<Price>) =>
    setPrices((p) => ({ ...p, [c]: { ...priceFor(c), ...patch } }));
  const toggleCategory = (c: Category) =>
    setCategories((cs) =>
      cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c],
    );

  const buildServices = () =>
    categories.map((c) => {
      const p = priceFor(c);
      const min = Number(p.min);
      const max = Number(p.max);
      if (p.min === "" || p.max === "" || min > max)
        throw new Error(
          `${categoryLabel(c)}: enter a minimum price no higher than the maximum.`,
        );
      return {
        artist_id: userId,
        category: c,
        currency: p.currency,
        price_min: min,
        price_max: max,
      };
    });

  // Validates the current card, saving the username early so a taken one is caught on its own card
  const next = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      if (step === "look") {
        if (!name.trim()) throw new Error("Add a display name.");
        if (!usernameSaved) {
          const bad = usernameError(username);
          if (bad) throw new Error(bad);
          setBusy(true);
          const { error } = await createClient()
            .from("profiles")
            .update({ username })
            .eq("id", userId);
          setBusy(false);
          if (error)
            throw new Error(
              error.code === "23505"
                ? "That username is taken. Try another."
                : error.message,
            );
          setUsernameSaved(true);
        }
      }
      if (step === "details") {
        if (!location) throw new Error("Choose your province.");
        if (!isArtist && !businessType)
          throw new Error("Choose what best describes you.");
      }
      if (
        (step === "services" || step === "interests") &&
        categories.length === 0
      )
        throw new Error(
          isArtist
            ? "Pick at least one service."
            : "Pick at least one category.",
        );
      if (step === "services") buildServices();
      if (step === "portfolio" && portfolio.length === 0)
        throw new Error("Add at least one image of your work.");
      if (step === "socials") parseSocialLinks(links.join("\n"));
      if (step === "contacts") return await finish();
      goTo(stepIndex + 1);
    } catch (err: unknown) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const finish = async () => {
    const supabase = createClient();
    setBusy(true);
    const contactValues = contactRow(contacts);
    const socialLinks = parseSocialLinks(links.join("\n"));
    let artistFields = {};
    if (isArtist) {
      const services = buildServices();
      const portfolioUrls = await Promise.all(
        portfolio.map((f) =>
          uploadImage(
            supabase,
            `${userId}/portfolio/${crypto.randomUUID()}`,
            f,
          ),
        ),
      );
      // Replace rather than upsert so a retry with fewer categories leaves no stale rows
      const { error: delError } = await supabase
        .from("services")
        .delete()
        .eq("artist_id", userId);
      if (delError) throw delError;
      const { error: svcError } = await supabase
        .from("services")
        .insert(services);
      if (svcError) throw svcError;
      artistFields = { portfolio: portfolioUrls };
    }
    const { error: contactError } = await supabase
      .from("contact_methods")
      .upsert({ user_id: userId, ...contactValues });
    if (contactError) throw contactError;

    // Setting role marks onboarding done, so this write goes last
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        bio: bio.trim() || null,
        location,
        categories,
        social_links: socialLinks,
        ...(avatar && {
          avatar_url: await uploadImage(supabase, `${userId}/avatar`, avatar, 800),
        }),
        ...(cover
          ? { cover_url: await uploadImage(supabase, `${userId}/cover`, cover) }
          : coverRemoved && { cover_url: null }),
        ...(!isArtist && {
          business_name: businessName.trim() || null,
          business_type: businessType,
        }),
        ...artistFields,
        role: isArtist ? "artist" : "client",
      })
      .eq("id", userId);
    if (error) throw error;
    router.push(
      isArtist
        ? profileHref({ id: userId, username: initial.username ?? username })
        : "/artists",
    );
    router.refresh();
  };

  const isLast = step === "contacts";
  const card = (
    title: React.ReactNode,
    body: React.ReactNode,
    description?: React.ReactNode,
  ) => (
    <FlowCard
      headingRef={heading}
      step={stepIndex + 1}
      total={steps.length}
      onBack={back}
      title={title}
      description={description}
    >
      <form onSubmit={next} className="flex flex-col gap-6" noValidate>
        {body}
        <FormError message={error} />
        <button
          type="submit"
          disabled={busy}
          className={isLast ? pillClass.final : pillClass.next}
        >
          {busy ? "Saving…" : isLast ? "All done!" : "Next"}
        </button>
      </form>
    </FlowCard>
  );

  if (step === "look")
    return card(
      "Let's make your Artisity look and feel like you",
      <>
        <ImagesEditor
          avatarSrc={avatarSrc}
          coverSrc={coverSrc}
          onAvatar={setAvatar}
          onCover={(f) => {
            setCover(f);
            setCoverRemoved(false);
          }}
          onRemoveCover={() => {
            setCover(null);
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
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          )}
        </Field>
        {!initial.username && (
          <Field label="Username">
            {(id) => (
              <PrefixInput
                id={id}
                prefix="artisity.com/@"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={30}
                disabled={usernameSaved}
                value={username}
                onChange={(e) => setUsername(toUsername(e.target.value))}
              />
            )}
          </Field>
        )}
        <Switch
          checked={isArtist}
          onChange={setIsArtist}
          label="I'm an artist"
        />
      </>,
    );

  if (step === "details")
    return card(
      "Profile details",
      <>
        <Field label="Bio" hint={`${bio.length}/500`}>
          {(id) => (
            <textarea
              id={id}
              maxLength={500}
              rows={4}
              placeholder={
                isArtist
                  ? "Write a little so clients get to know you: who you are, your specialties, languages, tools…"
                  : "Write a little so artists get to know you and what you're working on…"
              }
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`${fieldClass} h-auto min-h-32 resize-y py-3`}
            />
          )}
        </Field>
        <Field label="Province">
          {(id) => (
            <SelectField
              id={id}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Select your province…</option>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SelectField>
          )}
        </Field>
        {!isArtist && (
          <>
            <Field label="What best describes you?">
              {(id) => (
                <SelectField
                  id={id}
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
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
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={fieldClass}
                />
              )}
            </Field>
          </>
        )}
      </>,
    );

  if (step === "services" || step === "interests")
    return card(
      step === "services" ? "What do you offer?" : "What are you looking for?",
      <>
        <fieldset>
          <legend className="sr-only">Categories</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = categories.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCategory(c.value)}
                  className={`h-11 rounded-full px-4 text-sm font-semibold transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        {step === "services" && categories.length > 0 && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-semibold">
              Price range for each service
            </legend>
            {categories.map((c) => {
              const p = priceFor(c);
              const label = categoryLabel(c);
              return (
                <div
                  key={c}
                  className="flex flex-col gap-2 rounded-2xl bg-secondary/60 p-3"
                >
                  <span className="text-sm font-semibold">{label}</span>
                  <div className="grid grid-cols-[5.5rem_1fr_1fr] gap-2">
                    <SelectField
                      aria-label={`${label} currency`}
                      value={p.currency}
                      onChange={(e) =>
                        setPrice(c, { currency: e.target.value as Currency })
                      }
                      className="h-12 px-3 pr-8"
                    >
                      {CURRENCIES.map((cur) => (
                        <option key={cur}>{cur}</option>
                      ))}
                    </SelectField>
                    <PrefixInput
                      aria-label={`${label} minimum price`}
                      prefix="Min"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}

                      value={p.min}
                      onChange={(e) => setPrice(c, { min: e.target.value })}
                      className="tabular-nums"
                    />
                    <PrefixInput
                      aria-label={`${label} maximum price`}
                      prefix="Max"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}

                      value={p.max}
                      onChange={(e) => setPrice(c, { max: e.target.value })}
                      className="tabular-nums"
                    />
                  </div>
                </div>
              );
            })}
          </fieldset>
        )}
      </>,
      step === "services"
        ? "Pick the services clients can commission from you."
        : "We'll use this to show you the right artists.",
    );

  if (step === "portfolio")
    return card(
      "Show your work",
      <ul className="grid grid-cols-3 gap-2">
        {portfolio.map((f, i) => (
          <ImageTile
            key={`${f.name}-${f.lastModified}-${i}`}
            file={f}
            onRemove={() => setPortfolio((ps) => ps.filter((_, j) => j !== i))}
          />
        ))}
        {portfolio.length < MAX_PORTFOLIO && (
          <li>
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-secondary text-sm font-semibold hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
              <ImagePlus className="size-6" />
              Add
              <input
                type="file"
                multiple
                accept={IMAGE_TYPES}
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPortfolio((ps) =>
                    [...ps, ...files].slice(0, MAX_PORTFOLIO),
                  );
                  e.target.value = "";
                }}
              />
            </label>
          </li>
        )}
      </ul>,
      `Upload 1–${MAX_PORTFOLIO} pieces. They appear on your profile and in the home feed.`,
    );

  if (step === "socials")
    return card(
      "Socials + links",
      <LinksEditor links={links} onChange={setLinks} />,
      links.length === 0
        ? "Optional. Add your website, Behance, or any page that shows your work."
        : undefined,
    );

  return card(
    "Would you like to add any other contact methods?",
    <ContactFields contacts={contacts} onChange={setContacts} />,
    isArtist
      ? "Optional. Shown on your profile so clients can reach you."
      : "Optional. Only shared with people you have a commission request with.",
  );
}
