import Link from "next/link";
import {
  ChevronRight,
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
  Plus,
  Send,
} from "lucide-react";
import { categoryLabel } from "@/lib/options";
import { contactLinks, formatPrice, loginHref, postImagePaths, profileHref, profileImageUrl } from "@/lib/utils";
import { ImageCarousel } from "@/components/image-carousel";
import { MessageButton } from "@/components/message-button";
import { SafetyMenu } from "@/components/safety-menu";
import { ShareButton } from "@/components/share-button";
import { RatingSummary, Stars } from "@/components/stars";

export type Service = {
  category: string;
  currency: string;
  price_min: number;
  price_max: number;
};
export type ProfileTab = "commissions" | "portfolio" | "reviews";
export const parseTab = (tab?: string): ProfileTab =>
  tab === "portfolio" || tab === "reviews" ? tab : "commissions";

// Reviewers stay anonymous: client profiles are private
export const PROFILE_REVIEW_COLUMNS = "reviews!reviews_artist_id_fkey(id, rating, comment, category, created_at)";
type ProfileReview = { id: string; rating: number; comment: string; category: string; created_at: string };

export type ProfileData = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  // Public for artists; clients' only reach their own page and request partners (RLS)
  contact_methods?: { telegram: string | null; facebook: string | null; instagram: string | null } | null;
  role: string | null;
  // Artists only: false hides Request (the requests insert policy enforces it)
  commissions_open?: boolean;
  created_at?: string;
  business_name?: string | null;
  business_type?: string | null;
  // Priced services; `categories` also lists the ones picked without a price yet
  services: Service[];
  categories?: string[];
  // Newest first; only artists have posts
  posts?: { id: string; title: string; image_path: string; image_count: number }[];
  // Newest first; only artists get reviews
  reviews?: ProfileReview[];
};

const pillClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors";
const circleClass =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-accent disabled:opacity-50";

const CONTACT_ICONS = { telegram: Send, facebook: Facebook, instagram: Instagram };

// Every service the artist offers, with its price once set (onboarding picks them unpriced)
function offers(artist: ProfileData) {
  const priced = new Map(artist.services.map((s) => [s.category, s]));
  return [...new Set([...artist.services.map((s) => s.category), ...(artist.categories ?? [])])].map(
    (category) => ({ category, price: priced.get(category) }),
  );
}

// The owner's "Finish your profile" card (VGen's Getting Started, Contra's checklist), worked out
// from the profile itself so onboarding's skipped cards aren't forgotten. Gone once all are done.
// ponytail: four derived checks; move them into lib/utils.ts with a test if more are added.
function SetupChecklist({ artist }: { artist: ProfileData }) {
  const tasks = [
    { done: !!artist.avatar_url, label: "Add a profile photo", href: "/settings/profile" },
    {
      done: offers(artist).every((o) => o.price),
      label: "Set your prices",
      hint: "Until then clients ask you for a quote.",
      href: "/settings/profile#services",
    },
    { done: !!artist.bio, label: "Write a short bio", href: "/settings/profile" },
    {
      done: (artist.posts ?? []).length > 0,
      label: "Add your first post",
      hint: "You're not listed under Commission until you do.",
      href: "/posts/new",
    },
    { done: contactLinks(artist.contact_methods ?? null).length > 0, label: "Add a social link", href: "/settings/profile" },
  ];
  const done = tasks.filter((t) => t.done).length;
  if (done === tasks.length) return null;
  return (
    <section aria-labelledby="setup-heading" className="flex flex-col gap-3 rounded-3xl bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="setup-heading" className="font-semibold">Finish your profile</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {done}/{tasks.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Profile setup"
        aria-valuemin={0}
        aria-valuemax={tasks.length}
        aria-valuenow={done}
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${(done / tasks.length) * 100}%` }} />
      </div>
      <ul className="-mx-2 flex flex-col">
        {tasks
          .filter((t) => !t.done)
          .map((t) => (
            <li key={t.label}>
              <Link
                href={t.href}
                className="flex items-center gap-3 rounded-2xl px-2 py-2 text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{t.label}</span>
                  {t.hint && <span className="text-muted-foreground">{t.hint}</span>}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
}

// Profile page after vgen.co: full-bleed cover, a sticky left column (avatar, name, @handle,
// actions, bio, links) and tabbed content on the right. Shared by the public artist page and
// the owner's own /profile, which swaps the visitor actions for "Edit profile".
export function ProfileView({
  profile: artist,
  tab,
  viewerId,
  blocked = false,
}: {
  profile: ProfileData;
  tab: ProfileTab;
  viewerId: string | undefined;
  // The viewer has blocked this profile
  blocked?: boolean;
}) {
  const id = artist.id;
  const name = artist.display_name ?? "Unnamed";
  const services = offers(artist);
  const posts = artist.posts ?? [];
  const reviews = artist.reviews ?? [];
  const links = contactLinks(artist.contact_methods ?? null);
  const isOwn = viewerId === id;
  const isArtist = artist.role === "artist";
  const open = artist.commissions_open !== false;
  const requestHref = (category?: string) => {
    const path = `/requests/new?artist=${id}${category ? `&category=${category}` : ""}`;
    return viewerId ? path : loginHref(path);
  };

  return (
    <>
      <div className="h-44 w-full bg-secondary sm:h-56 md:h-72">
        {artist.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artist.cover_url} alt="" className="size-full object-cover" />
        )}
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 md:grid-cols-[18rem_1fr] md:gap-12 md:px-6">
        <aside className="flex flex-col gap-5 md:sticky md:top-20 md:self-start">
          <div className="-mt-16 size-32 overflow-hidden rounded-full border-4 border-background bg-secondary md:-mt-24 md:size-44">
            {artist.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.avatar_url}
                alt=""
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">{name}</h1>
            {artist.username && (
              <p className="text-sm text-muted-foreground">@{artist.username}</p>
            )}
            {/* Commission status, after VGen's comm status and Dribbble's "Available for work" */}
            {isArtist && (
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden className={`size-2.5 rounded-full ${open ? "bg-primary" : "bg-muted-foreground"}`} />
                {open ? "Open for commissions" : "Commissions closed"}
              </p>
            )}
            {isArtist && (
              <Link href="?tab=reviews" scroll={false} className="mt-1 w-fit text-sm hover:underline">
                <RatingSummary reviews={reviews} />
              </Link>
            )}
            {artist.location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {artist.location}
              </p>
            )}
            {artist.created_at && (
              <p className="text-sm text-muted-foreground">
                Member since{" "}
                {new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(artist.created_at))}
              </p>
            )}
            {!isArtist && (artist.business_name || artist.business_type) && (
              <p className="text-sm text-muted-foreground">
                {[artist.business_name, artist.business_type].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isOwn ? (
              <>
                <Link
                  href="/settings/profile"
                  className={`${pillClass} flex-1 bg-foreground text-background hover:bg-foreground/90`}
                >
                  Edit profile
                </Link>
                {isArtist && (
                  <Link href="/posts/new" aria-label="New post" title="New post" className={circleClass}>
                    <Plus className="size-5" />
                  </Link>
                )}
              </>
            ) : blocked ? (
              <>
                <p className="flex-1 text-sm text-muted-foreground">You blocked {name}.</p>
                <SafetyMenu userId={id} name={name} blocked className={circleClass} />
              </>
            ) : (
              <>
                {open ? (
                  <Link
                    href={requestHref()}
                    className={`${pillClass} flex-1 bg-foreground text-background hover:bg-foreground/90`}
                  >
                    Request commission
                  </Link>
                ) : (
                  <span aria-disabled className={`${pillClass} flex-1 cursor-not-allowed bg-secondary text-muted-foreground`}>
                    Commissions closed
                  </span>
                )}
                {viewerId ? (
                  <MessageButton
                    userId={viewerId}
                    artistId={id}
                    artistName={name}
                    className={circleClass}
                  />
                ) : (
                  <Link
                    href={loginHref(profileHref({ id, username: artist.username }))}
                    aria-label={`Message ${name}`}
                    title="Message"
                    className={circleClass}
                  >
                    <MessageCircle className="size-5" />
                  </Link>
                )}
                {viewerId && (
                  <SafetyMenu userId={id} name={name} blocked={false} className={circleClass} />
                )}
              </>
            )}
            {/* Client profiles are private, so only artist profiles have a link worth sharing */}
            {isArtist && !blocked && (
              <ShareButton title={name} path={profileHref({ id, username: artist.username })} className={circleClass} />
            )}
          </div>

          {isOwn && isArtist && <SetupChecklist artist={artist} />}

          {artist.bio && (
            <p className="whitespace-pre-line text-sm leading-relaxed">{artist.bio}</p>
          )}

          {links.length > 0 && (
            <ul className="flex gap-2">
              {links.map((link) => {
                const Icon = CONTACT_ICONS[link.key];
                return (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${name} on ${link.label}`}
                      title={link.label}
                      className={circleClass}
                    >
                      <Icon className="size-5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-5 md:pt-6">
          {!isArtist ? (
            <div className="flex flex-col items-start gap-4 rounded-3xl bg-card p-6 sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight">Your profile is private</h2>
              <p className="text-muted-foreground">
                Only you and the artists you message or send commission requests to can see it.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/artists" className={`${pillClass} bg-foreground text-background hover:bg-foreground/90`}>
                  Find an artist
                </Link>
                <Link href="/requests" className={`${pillClass} border border-input hover:bg-secondary`}>
                  Your requests
                </Link>
              </div>
            </div>
          ) : (
          <>
          <nav aria-label="Profile sections" className="flex gap-6 border-b">
            {(
              [
                ["commissions", "Commissions", services.length],
                ["portfolio", "Portfolio", posts.length],
                ["reviews", "Reviews", reviews.length],
              ] as const
            ).map(([value, label, count]) => (
              <Link
                key={value}
                href={value === "commissions" ? "?" : `?tab=${value}`}
                scroll={false}
                aria-current={tab === value ? "page" : undefined}
                className={`-mb-px border-b-2 pb-3 text-xl font-bold transition-colors sm:text-2xl ${
                  tab === value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                <span className="ml-1.5 align-middle text-sm font-semibold tabular-nums text-muted-foreground">
                  {count}
                </span>
              </Link>
            ))}
          </nav>

          {tab === "commissions" ? (
            services.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center text-muted-foreground">
                <p>{isOwn ? "You haven't listed any services yet." : `${name} hasn't listed any services yet.`}</p>
                {isOwn && (
                  <Link href="/settings/profile#services" className={`${pillClass} bg-foreground text-background hover:bg-foreground/90`}>
                    <Plus className="size-4" />
                    Add services
                  </Link>
                )}
              </div>
            ) : (
              <>
                {(services.length > 1 || isOwn) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {services.length > 1 &&
                      services.map((s) => (
                        <a
                          key={s.category}
                          href={`#${s.category}`}
                          className="inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold hover:bg-secondary"
                        >
                          {categoryLabel(s.category)}
                        </a>
                      ))}
                    {isOwn && (
                      <Link
                        href="/settings/profile#services"
                        className="ml-auto inline-flex h-9 items-center rounded-full bg-secondary px-4 text-sm font-semibold hover:bg-accent"
                      >
                        Edit services
                      </Link>
                    )}
                  </div>
                )}
                <ul className="flex flex-col gap-4">
                  {services.map((s) => (
                    <li
                      key={s.category}
                      id={s.category}
                      className="flex scroll-mt-24 flex-col gap-5 rounded-3xl bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
                    >
                      <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-bold tracking-tight">
                          {categoryLabel(s.category)}
                        </h2>
                        <p className="text-lg tabular-nums text-muted-foreground">
                          {s.price ? `From ${formatPrice(s.price.price_min, s.price.price_max, s.price.currency)}` : "Ask for a quote"}
                        </p>
                      </div>
                      {!isOwn && !blocked && open && (
                        <Link
                          href={requestHref(s.category)}
                          className={`${pillClass} shrink-0 border border-input hover:bg-secondary sm:min-w-48`}
                        >
                          Request
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : tab === "reviews" ? (
            reviews.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">
                {isOwn
                  ? "No reviews yet. Clients can rate you once they mark a commission complete."
                  : `${name} has no reviews yet.`}
              </p>
            ) : (
              <>
                <RatingSummary reviews={reviews} className="text-lg" />
                <ul className="flex flex-col gap-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 rounded-3xl bg-card p-5 sm:p-6">
                      <p className="flex items-center gap-2">
                        <Stars value={r.rating} className="text-lg" />
                        <span className="sr-only">{r.rating} out of 5</span>
                      </p>
                      {r.comment && <p className="whitespace-pre-line leading-relaxed">{r.comment}</p>}
                      <p className="text-sm text-muted-foreground">
                        Verified client · {categoryLabel(r.category)} ·{" "}
                        {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center text-muted-foreground">
              <p>No portfolio pieces yet.</p>
              {isOwn && (
                <Link href="/posts/new" className={`${pillClass} bg-foreground text-background hover:bg-foreground/90`}>
                  <Plus className="size-4" />
                  New post
                </Link>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/posts/${post.id}`}
                    className="group relative block aspect-square overflow-hidden rounded-2xl bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ImageCarousel
                      images={postImagePaths(post.image_path, post.image_count).map(profileImageUrl)}
                      alt={post.title}
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-sm font-semibold text-white">
                      {post.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          </>
          )}
        </div>
      </div>
    </>
  );
}
