ALTER TABLE "public"."posts"
  DROP CONSTRAINT "posts_check";

ALTER TABLE "public"."posts"
  ADD CONSTRAINT "posts_check"
    CHECK (((image_path = (((artist_id)::text || '/posts/'::text) || (id)::text)) OR (image_path ~ (('^'::text || (artist_id)::text) || '/portfolio/[0-9a-f-]{36}$'::text))));

-- Hand-added DML (production has portfolio images): every onboarding portfolio image becomes a
-- one-image post, so it can be liked and requested like any other post. The file stays where it is.
-- Title and category come from the artist's first service (labels mirror lib/options.ts CATEGORIES).
-- created_at keeps their old place in the feed (the artist's sign-up), first image newest.
INSERT INTO public.posts (artist_id, image_path, title, category, created_at)
SELECT
  p.id,
  u.path,
  CASE s.category
    WHEN 'illustration' THEN 'Illustration'
    WHEN 'branding_graphic' THEN 'Branding & Graphic'
    WHEN 'model_3d_2d' THEN '3D & 2D Model'
    WHEN 'video_animation' THEN 'Video & Animation'
    WHEN 'game_asset' THEN 'Game Asset'
    WHEN 'emote' THEN 'Emote'
    WHEN 'scene_concept_art' THEN 'Scene & Concept Art'
    WHEN 'streaming_asset' THEN 'Streaming Asset'
    WHEN 'writing' THEN 'Writing'
    WHEN 'ui_ux' THEN 'UI/UX Design'
    ELSE 'Portfolio'
  END,
  s.category,
  p.created_at - u.n * interval '1 second'
FROM public.profiles p
CROSS JOIN LATERAL (
  SELECT substring(url FROM '/profile-images/([^?#]+)') AS path, n
  FROM unnest(p.portfolio) WITH ORDINALITY AS t(url, n)
) u
LEFT JOIN LATERAL (
  SELECT category FROM public.services WHERE artist_id = p.id ORDER BY category LIMIT 1
) s ON true
WHERE u.path ~ ('^' || p.id::text || '/portfolio/[0-9a-f-]{36}$');

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_portfolio_check";

ALTER TABLE "public"."profiles"
  DROP COLUMN "portfolio";
