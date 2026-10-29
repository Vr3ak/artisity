ALTER TABLE "public"."profiles"
  ADD COLUMN "bio" text;

ALTER TABLE "public"."profiles"
  ADD COLUMN "cover_url" text;

CREATE DOMAIN "public"."http_url" AS text CONSTRAINT "http_url_check"
  CHECK (((VALUE ~* '^https?://'::text) AND (char_length(VALUE) <= 300)));

ALTER TABLE "public"."profiles"
  ADD COLUMN "social_links" public.http_url[] NOT NULL DEFAULT '{}'::public.http_url[];

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_bio_check" CHECK ((char_length(bio) <= 500));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_social_links_check" CHECK ((cardinality(social_links) <= 5));

CREATE POLICY "profile-images: delete own" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "profile-images: insert own" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "profile-images: select own" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "profile-images: update own" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)))
  WITH CHECK (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
