import Link from "next/link";
import { formatPrice, postImagePaths, profileImageUrl } from "@/lib/utils";
import { ImageCarousel } from "@/components/image-carousel";
import { LikeButton } from "@/components/like-button";

type Service = { category: string; price_min: number; currency: string };
export type CardArtist = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  services: Service[];
};

// Select these on the artist side of a post (or profile) to fill a card
export const CARD_ARTIST_COLUMNS = "id, username, display_name, avatar_url, services(category, price_min, currency)";
export const CARD_POST_COLUMNS = `id, title, category, image_path, image_count, created_at, artist:profiles!posts_artist_id_fkey(${CARD_ARTIST_COLUMNS})`;

export type Card = {
  href: string;
  images: string[];
  title: string | null;
  artist: CardArtist;
  service: Service | undefined;
  postId: string;
};

type PostRow = { id: string; title: string; category: string | null; image_path: string; image_count: number; created_at: string; artist: unknown };

// A posts row selected with CARD_POST_COLUMNS; null when RLS hid the author (no longer an artist)
export function postCard(p: PostRow): Card | null {
  const artist = p.artist as CardArtist | null;
  if (!artist) return null;
  return {
    href: `/posts/${p.id}`,
    images: postImagePaths(p.image_path, p.image_count).map(profileImageUrl),
    title: p.title,
    artist,
    service: artist.services.find((s) => s.category === p.category) ?? artist.services[0],
    postId: p.id,
  };
}

// Card follows vgen.co (artwork at its own shape in masonry columns, bold title, artist + price).
// Hover follows pinterest.com: the image dims, the artist pill sits top-left (over the 1/n badge)
// and the like heart top-right. The heart is a sibling of the link (no buttons inside <a>), always
// shown on touch screens (no hover there) and once liked.
const reveal =
  "pointer-events-none opacity-0 transition-opacity duration-150 ease-out group-hover/card:opacity-100 group-has-[:focus-visible]/card:opacity-100 motion-reduce:transition-none";

export function PostCard({ card, liked, viewerId }: { card: Card; liked: boolean; viewerId: string | undefined }) {
  const { href, images, title, artist, service, postId } = card;
  return (
    // isolate: the pill and heart z-20 (and the badge z-10) stay inside the card, under the sticky nav
    <li className="group/card relative isolate">
      <Link
        href={href}
        className="flex flex-col gap-2 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        <div className="relative overflow-hidden rounded-2xl bg-muted">
          {/* An invisible copy of the cover gives the card the artwork's own shape (same URL, one
              request); the carousel fills that box. Capped so very tall or wide pieces crop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="" aria-hidden loading="lazy" className="invisible block max-h-[32rem] min-h-28 w-full" />
          <div className="absolute inset-0">
            <ImageCarousel images={images} alt="" />
          </div>
          <div aria-hidden className={`${reveal} absolute inset-0 bg-nav/60`} />
          {/* Decorative repeat of the artist below, so it stays out of the link's accessible name.
              Its own z-20 layer, so it covers the carousel's z-10 1/n badge even mid-fade. */}
          <span
            aria-hidden
            className={`${reveal} absolute left-2 top-2 z-20 flex h-9 max-w-[calc(100%-3.5rem)] items-center gap-2 rounded-full bg-primary pl-1 pr-3.5 text-sm font-semibold text-primary-foreground shadow-float`}
          >
            <Avatar url={artist.avatar_url} className="size-7" />
            <span className="truncate">{artist.display_name}</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 px-1">
          {title && <p className="line-clamp-2 break-words font-semibold md:line-clamp-1">{title}</p>}
          {/* Two-column phones stack the price under the artist; wider columns keep one row */}
          <div className="flex flex-col gap-0.5 text-sm md:flex-row md:items-center md:justify-between md:gap-3">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <Avatar url={artist.avatar_url} className="size-5" />
              <span className="truncate">{artist.display_name}</span>
            </span>
            {service && (
              <span className="shrink-0 font-semibold tabular-nums">
                From {formatPrice(service.price_min, service.price_min, service.currency)}
              </span>
            )}
          </div>
        </div>
      </Link>
      {/* No heart on your own posts, matching /posts/[id] */}
      {artist.id !== viewerId && (
        <LikeButton
          postId={postId}
          title={title ?? "post"}
          liked={liked}
          signedIn={!!viewerId}
          className="absolute right-2 top-2 z-20 size-9 bg-nav/85 text-foreground opacity-0 shadow-float hover:bg-nav focus-visible:opacity-100 group-hover/card:opacity-100 group-has-[:focus-visible]/card:opacity-100 data-[liked=true]:bg-primary data-[liked=true]:text-primary-foreground data-[liked=true]:opacity-100 [@media(hover:none)]:size-10 [@media(hover:none)]:opacity-100"
        />
      )}
    </li>
  );
}

function Avatar({ url, className }: { url: string | null; className: string }) {
  return (
    <span className={`${className} shrink-0 overflow-hidden rounded-full bg-secondary`}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      )}
    </span>
  );
}
