import Link from "next/link";
import {
  Dribbble,
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  MapPin,
  MessageCircle,
  Plus,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";
import { categoryLabel } from "@/lib/options";
import { formatPrice, postImagePaths, profileImageUrl } from "@/lib/utils";
import { ImageCarousel } from "@/components/image-carousel";
import { MessageButton } from "@/components/message-button";
import { SafetyMenu } from "@/components/safety-menu";

export type Service = {
  category: string;
  currency: string;
  price_min: number;
  price_max: number;
};
export type ProfileTab = "commissions" | "portfolio";
export const parseTab = (tab?: string): ProfileTab =>
  tab === "portfolio" ? "portfolio" : "commissions";

export type ProfileData = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  social_links: string[];
  role: string | null;
  business_name?: string | null;
  business_type?: string | null;
  portfolio: string[];
  services: Service[];
  // Newest first; only artists have posts
  posts?: { id: string; title: string; image_path: string; image_count: number }[];
};

const pillClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors";
const circleClass =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-accent disabled:opacity-50";

// Icon for a social link by host; anything unknown gets a globe
const SOCIAL_ICONS: [RegExp, typeof Globe][] = [
  [/(^|\.)instagram\.com$/, Instagram],
  [/(^|\.)(facebook|fb)\.com$/, Facebook],
  [/(^|\.)(youtube\.com|youtu\.be)$/, Youtube],
  [/(^|\.)(twitter|x)\.com$/, Twitter],
  [/(^|\.)linkedin\.com$/, Linkedin],
  [/(^|\.)github\.com$/, Github],
  [/(^|\.)dribbble\.com$/, Dribbble],
  [/(^|\.)twitch\.tv$/, Twitch],
];

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
  const { services, portfolio } = artist;
  const posts = artist.posts ?? [];
  const isOwn = viewerId === id;
  const isArtist = artist.role === "artist";
  const requestHref = (category?: string) =>
    viewerId
      ? `/requests/new?artist=${id}${category ? `&category=${category}` : ""}`
      : "/auth/login";

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
            {artist.location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {artist.location}
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
                  href="/profile/edit"
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
                <Link
                  href={requestHref()}
                  className={`${pillClass} flex-1 bg-foreground text-background hover:bg-foreground/90`}
                >
                  Request commission
                </Link>
                {viewerId ? (
                  <MessageButton
                    userId={viewerId}
                    artistId={id}
                    artistName={name}
                    className={circleClass}
                  />
                ) : (
                  <Link
                    href="/auth/login"
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
          </div>

          {artist.bio && (
            <p className="whitespace-pre-line text-sm leading-relaxed">{artist.bio}</p>
          )}

          {artist.social_links.length > 0 && (
            <ul className="flex flex-col gap-3 text-sm font-semibold">
              {artist.social_links.map((link) => {
                const host = new URL(link).hostname.replace(/^www\./, "");
                const Icon = SOCIAL_ICONS.find(([re]) => re.test(host))?.[1] ?? Globe;
                return (
                  <li key={link}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
                    >
                      <Icon className="size-4 shrink-0" />
                      {host}
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
                ["portfolio", "Portfolio", posts.length + portfolio.length],
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
              <p className="py-10 text-center text-muted-foreground">
                {isOwn ? "You haven't listed any services yet." : `${name} hasn't listed any services yet.`}
              </p>
            ) : (
              <>
                {services.length > 1 && (
                  <ul className="flex flex-wrap gap-2">
                    {services.map((s) => (
                      <li key={s.category}>
                        <a
                          href={`#${s.category}`}
                          className="inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold hover:bg-secondary"
                        >
                          {categoryLabel(s.category)}
                        </a>
                      </li>
                    ))}
                  </ul>
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
                          From {formatPrice(s.price_min, s.price_max, s.currency)}
                        </p>
                      </div>
                      {!isOwn && !blocked && (
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
          ) : posts.length + portfolio.length === 0 ? (
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
              {portfolio.map((url, i) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square overflow-hidden rounded-2xl bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Work by ${name}, piece ${i + 1}`}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-300 ease-out hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  </a>
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
