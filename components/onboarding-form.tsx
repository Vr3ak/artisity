"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import {
  profileHref,
  toUsername,
  usernameError,
} from "@/lib/utils";
import {
  BUSINESS_TYPES,
  PROVINCES,
  categoryLabel,
  type Category,
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
  type Contacts,
  IMAGE_TYPES,
  ImageTile,
  ImagesEditor,
  ServicesFields,
  buildServiceRows,
  contactRow,
  useObjectUrl,
  type Prices,
} from "@/components/profile-fields";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Step =
  | "look"
  | "details"
  | "services"
  | "interests"
  | "portfolio"
  | "contacts";

const MAX_PORTFOLIO = 12;
// Steps that can be skipped and filled in later from /profile/edit or /posts/new. The look card
// (display name, username) and an artist's services are what a profile needs to work, so they stay required.
const OPTIONAL: Step[] = ["details", "interests", "portfolio", "contacts"];

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
  const [prices, setPrices] = useState<Prices>({});
  // portfolio
  const [portfolio, setPortfolio] = useState<File[]>([]);
  // socials + contacts
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
    ? ["look", "details", "services", "portfolio", "contacts"]
    : ["look", "details", "interests", "contacts"];
  const step = steps[stepIndex];

  const goTo = (i: number) => {
    setError(null);
    setStepIndex(i);
    setTimeout(() => heading.current?.focus());
  };
  const back = stepIndex > 0 ? () => goTo(stepIndex - 1) : undefined;

  const buildServices = () => buildServiceRows(userId, categories, prices);

  // Validates the current card, saving the username early so a taken one is caught on its own card
  const next = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const skipping = (e.nativeEvent as SubmitEvent).submitter?.dataset.skip === "true";
    try {
      if (skipping) {
        // Skipping drops whatever was entered on this card, so nothing half-filled gets saved
        if (step === "details") {
          setBio("");
          setLocation("");
          setBusinessName("");
          setBusinessType("");
        }
        if (step === "interests") setCategories([]);
        if (step === "portfolio") setPortfolio([]);
        if (step === "contacts") {
          setContacts(EMPTY_CONTACTS);
          return await finish(EMPTY_CONTACTS);
        }
        return goTo(stepIndex + 1);
      }
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
      if (step === "services") {
        if (!categories.length) throw new Error("Pick at least one service.");
        buildServices();
      }
      if (step === "contacts") return await finish(contacts);
      goTo(stepIndex + 1);
    } catch (err: unknown) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const finish = async (finalContacts: Contacts) => {
    const contactValues = contactRow(finalContacts);
    const supabase = createClient();
    setBusy(true);
    let portfolioPosts: object[] = [];
    if (isArtist) {
      const services = buildServices();
      // Each portfolio image becomes a one-image post (titled after the first service), so it can be
      // liked and requested like any other. The ids come first because image_path must be
      // <uid>/posts/<id>; the rows go in after `role`, since only artists can post.
      const posts = await Promise.all(
        portfolio.map(async (f) => {
          const id = crypto.randomUUID();
          const image_path = `${userId}/posts/${id}`;
          await uploadImage(supabase, image_path, f);
          return { id, image_path, title: categoryLabel(categories[0]), category: categories[0] };
        }),
      );
      portfolioPosts = posts;
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
        location: location || null,
        categories,
        ...(avatar && {
          avatar_url: await uploadImage(supabase, `${userId}/avatar`, avatar, 800),
        }),
        ...(cover
          ? { cover_url: await uploadImage(supabase, `${userId}/cover`, cover) }
          : coverRemoved && { cover_url: null }),
        ...(!isArtist && {
          business_name: businessName.trim() || null,
          business_type: businessType || null,
        }),
        role: isArtist ? "artist" : "client",
      })
      .eq("id", userId);
    if (error) throw error;
    if (portfolioPosts.length) {
      const { error: postsError } = await supabase.from("posts").insert(portfolioPosts);
      if (postsError) throw postsError;
    }
    router.push(
      isArtist
        ? profileHref({ id: userId, username: initial.username ?? username })
        : "/artists",
    );
    router.refresh();
  };

  const isLast = step === "contacts";
  const optional = OPTIONAL.includes(step);
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
        {optional && (
          <button
            type="submit"
            data-skip="true"
            disabled={busy}
            className="-mt-2 self-center rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {isLast ? "Skip and finish" : "Skip for now"}
          </button>
        )}
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
      "Optional. You can fill this in later from your profile.",
    );

  if (step === "services" || step === "interests")
    return card(
      step === "services" ? "What do you offer?" : "What are you looking for?",
      <>
        <ServicesFields
          categories={categories}
          onCategories={setCategories}
          {...(step === "services" && { prices, onPrices: setPrices })}
        />
      </>,
      step === "services"
        ? "Pick the services clients can commission from you."
        : "Optional. We'll use this to show you the right artists.",
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
      `Up to ${MAX_PORTFOLIO} pieces. They appear on your profile and in the home feed. Optional: you can post later.`,
    );

  return card(
    "Social links",
    <ContactFields contacts={contacts} onChange={setContacts} />,
    isArtist
      ? "Optional. Shown on your profile so clients can reach you."
      : "Optional. Only shared with people you have a commission request with.",
  );
}
