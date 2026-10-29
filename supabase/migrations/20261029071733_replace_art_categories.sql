ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_categories_check";

ALTER TABLE "public"."profiles"
  ALTER COLUMN "categories" DROP DEFAULT;

-- Hand-added data mapping (pg-delta generated the type swap but can't know how old values map).
-- photography and music_audio have no new equivalent: artists lose them and their prices;
-- old requests in those categories fall back to illustration so the not-null column survives.
create function private.map_art_category(c text) returns text language sql immutable set search_path = '' as $$
  select case c
    when 'illustration' then 'illustration'
    when 'mural_signage' then 'illustration'
    when 'logo_branding' then 'branding_graphic'
    when 'graphic_design' then 'branding_graphic'
    when 'social_media' then 'branding_graphic'
    when 'menu_packaging' then 'branding_graphic'
    when 'video_editing' then 'video_animation'
    when 'animation_motion' then 'video_animation'
    when 'web_ui' then 'ui_ux'
    when 'writing_translation' then 'writing'
  end
$$;

create function private.map_art_categories(cs text[]) returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct m), '{}')
  from unnest(cs) c, private.map_art_category(c) m
  where m is not null
$$;

-- services is keyed (artist_id, category): drop unmappable rows and keep one row per merged category
delete from public.services where private.map_art_category(category::text) is null;
delete from public.services s using public.services t
where s.artist_id = t.artist_id
  and private.map_art_category(s.category::text) = private.map_art_category(t.category::text)
  and s.category::text > t.category::text;

ALTER TYPE "public"."art_category" RENAME TO "art_category__pgdelta_replaced";

CREATE TYPE "public"."art_category" AS ENUM (
  'illustration',
  'branding_graphic',
  'model_3d_2d',
  'video_animation',
  'game_asset',
  'emote',
  'scene_concept_art',
  'streaming_asset',
  'writing',
  'ui_ux'
);

ALTER TABLE "public"."profiles"
  ALTER COLUMN "categories" TYPE "public"."art_category"[] USING private.map_art_categories("categories"::text[])::"public"."art_category"[];

ALTER TABLE "public"."requests"
  ALTER COLUMN "category" TYPE "public"."art_category" USING coalesce(private.map_art_category("category"::text), 'illustration')::"public"."art_category";

ALTER TABLE "public"."services"
  ALTER COLUMN "category" TYPE "public"."art_category" USING private.map_art_category("category"::text)::"public"."art_category";

DROP TYPE "public"."art_category__pgdelta_replaced";

DROP FUNCTION private.map_art_categories(text[]);

DROP FUNCTION private.map_art_category(text);

ALTER TABLE "public"."profiles"
  ALTER COLUMN "categories" SET DEFAULT '{}'::public.art_category[];

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_categories_check" CHECK ((cardinality(categories) <= 10));
