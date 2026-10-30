# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clients:** anyone who wants to commission a Cambodian artist. That includes individuals (personal commissions such as portraits, avatars and gifts) and businesses: restaurants and cafés, retail shops, hotels and tourism, beauty and wellness, startups, education, NGOs, and events and weddings. Onboarding records the business name and type as optional context. They come to find an artist, judge their work and price, then contact them or send a commission request.
- **Artists:** Cambodian creatives offering services in 10 categories: illustration, branding & graphic, 3D & 2D model, video & animation, game asset, emote, scene & concept art, streaming asset, writing, and UI/UX design. The list leans toward digital art, games and streaming (emotes, stream overlays, concept art); photography, music and murals/signage were dropped on 2026-10-29. They show a portfolio, set a price range per category, and manage incoming requests and conversations.
- **Staff (admin):** read the user list at `/staff`.
- Many users are on phones.

## Product Purpose

Artisity is a marketplace where people and businesses discover Cambodian artists and commission original, human-made work from them. Success means a client finds the right artist, agrees a brief and price through a request and chat, and receives work they trust is real and human.

## Positioning

**Human-made only.** Artisity's promise is real artists, real work and real trust; the logo carries "Real artists · Real work · Real trust" and the home headline is "Embrace HUMAN Activity". AI-generated work is not allowed. The platform is local to Cambodia: artists are placed by province, prices can be in USD or KHR, and the category list (digital art, branding, games and streaming assets) serves personal commissions, creators and businesses.

## Operating Context

- **Discovery:** the home feed of portfolio work, the artist directory (`/artists`) with category filter and name search, and artist profiles showing bio, social links, services with price ranges, and portfolio.
- **Hiring loop:** the client messages an artist or sends a commission request (service, brief, optional budget and deadline). The artist accepts or declines, then delivers; the client completes. Either side can cancel an accepted request. Chat between the two runs live.
- **Prices:** whole units in USD or KHR, shown as ranges. There is no currency conversion.
- **Payment** currently happens outside the platform.

## Capabilities and Constraints

- **Built:** an About page (`/about`, placeholder image), auth (email/password, OAuth), onboarding (client/artist role), profiles (avatar, cover, bio, social links, portfolio), priced services, artist directory, messaging, commission requests with an enforced status flow, admin user list.
- **Not built yet:** Shop (digital products), favorites/saves, reviews, notifications, on-platform payments (KHQR/ABA are the likely local options), delivery file uploads, disputes, verification badges. Future work must not present these as existing.
- **Stack:** Next.js (App Router), Supabase (auth, Postgres with RLS, storage, realtime), Tailwind 3 + shadcn/ui. See CLAUDE.md.
- **Terminology:** "Commission" is the client-facing name for hiring an artist, used in the nav and in "Request commission". A "request" is a single commission order.

## Brand Commitments

- **Name:** Artisity.
- **Logo:** `public/logo.png`, cream lettering with a gold orbit and stars, and the taglines "Real artists · Real work · Real trust". It needs a dark surface; `public/logo-dark.png` (brown lettering) is the light-theme version.
- **Home headline:** "Embrace HUMAN Activity", with HUMAN emphasized.
- **Font:** Poppins, chosen by the user.
- **Palette** (binding, user-chosen): background `#2B2A2A`, text `#F9E6A8`, from the palette cream `#F9E6A8`, gold `#F2A900`, orange `#CC6F00`, brown `#4D2A00` (colorhunt.co/palette/f9e6a8f2a900cc6f004d2a00). Dark is the default theme; the light theme uses brown `#4D2A00` text on `#FCF1D0`.
- **Human-made-only stance:** binding.

## Evidence on Hand

- The logo (`public/logo.png`) and the role/category/business-type copy in `lib/options.ts` and the onboarding form.
- There are no testimonials, reviews, user counts, featured artists, press or partner logos. Future work must not invent artist names, stats, ratings or quotes.

## Product Principles

1. **Human craft is the product.** Every surface should make the artist and their real work the focus, and never blur whether work is human-made.
2. **Trust before transaction.** Clients commit money to someone they've never met. Clear pricing, a visible portfolio, a recorded brief and an explicit status flow come before anything else.
3. **Local by default.** Cambodian context should feel native, not added on: KHR alongside USD, provinces, local business needs, Khmer language.
4. **Fair to both sides.** Artists and clients each get a clear view of where a commission stands and what they can do next.

## Accessibility & Inclusion

- The UI must support **English and Khmer**. Khmer script needs fonts with Khmer glyphs and line-height and wrapping that suit it, and layouts must tolerate the length differences between the two languages. Khmer UI isn't implemented yet.
- Design for phones first; many users are on mobile.
