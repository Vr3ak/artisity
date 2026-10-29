SET local check_function_bodies = off;

DROP POLICY "profiles: update own" ON "public"."profiles";

CREATE TABLE "public"."services" (
  "artist_id" uuid    NOT NULL,
  "currency"  text    NOT NULL DEFAULT 'USD'::text,
  "price_min" integer NOT NULL,
  "price_max" integer NOT NULL,
  CONSTRAINT "services_check" CHECK ((price_max >= price_min)),
  CONSTRAINT "services_currency_check" CHECK ((currency = ANY (ARRAY['USD'::text, 'KHR'::text]))),
  CONSTRAINT "services_price_min_check" CHECK ((price_min >= 0))
);

ALTER TABLE "public"."services"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles"
  ADD COLUMN "location" text;

ALTER TABLE "public"."profiles"
  ADD COLUMN "business_name" text;

ALTER TABLE "public"."profiles"
  ADD COLUMN "business_type" text;

ALTER TABLE "public"."profiles"
  ADD COLUMN "portfolio" public.http_url[] NOT NULL DEFAULT '{}'::public.http_url[];

CREATE TYPE "public"."art_category" AS ENUM (
  'logo_branding',
  'illustration',
  'graphic_design',
  'social_media',
  'photography',
  'video_editing',
  'animation_motion',
  'menu_packaging',
  'web_ui',
  'mural_signage',
  'music_audio',
  'writing_translation'
);

ALTER TABLE "public"."profiles"
  ADD COLUMN "categories" public.art_category[] NOT NULL DEFAULT '{}'::public.art_category[];

ALTER TABLE "public"."services"
  ADD COLUMN "category" public.art_category NOT NULL;

CREATE TYPE "public"."user_role" AS ENUM (
  'client',
  'artist',
  'admin'
);

ALTER TABLE "public"."profiles"
  ADD COLUMN "role" public.user_role;

CREATE OR REPLACE FUNCTION private.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$function$;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_business_name_check" CHECK ((char_length(business_name) <= 100));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_business_type_check" CHECK ((char_length(business_type) <= 60));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_categories_check" CHECK ((cardinality(categories) <= 12));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_location_check" CHECK ((char_length(location) <= 60));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_portfolio_check" CHECK ((cardinality(portfolio) <= 12));

ALTER TABLE "public"."services"
  ADD CONSTRAINT "services_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."services"
  ADD CONSTRAINT "services_pkey" PRIMARY KEY (artist_id, category);

CREATE POLICY "profiles: select all (staff)" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.is_admin() AS is_admin));

CREATE POLICY "profiles: select artists" ON "public"."profiles"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((ROLE = 'artist'::public.user_role));

CREATE POLICY "profiles: update own" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK (((( SELECT auth.uid() AS uid) = id) AND ((role IS DISTINCT FROM 'admin'::public.user_role) OR ( SELECT private.is_admin() AS is_admin))));

CREATE POLICY "services: delete own" ON "public"."services"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = artist_id));

CREATE POLICY "services: insert own" ON "public"."services"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = artist_id));

CREATE POLICY "services: select all" ON "public"."services"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "services: update own" ON "public"."services"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = artist_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = artist_id));

REVOKE ALL ON FUNCTION "private"."is_admin"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_admin"() TO "authenticated";

REVOKE ALL ON SCHEMA "private" FROM "authenticated";

GRANT USAGE ON SCHEMA "private" TO "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "anon";

GRANT SELECT ON TABLE "public"."profiles" TO "anon";

REVOKE ALL ON TABLE "public"."services" FROM "anon";

GRANT SELECT ON TABLE "public"."services" TO "anon";

REVOKE ALL ON TABLE "public"."services" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."services" TO "authenticated";
