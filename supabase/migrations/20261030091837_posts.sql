CREATE TABLE "public"."posts" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "image_path" text                     NOT NULL,
  "title"      text                     NOT NULL,
  "caption"    text                     NOT NULL DEFAULT ''::text,
  "category"   public.art_category,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "posts_caption_check" CHECK ((char_length(caption) <= 2000)),
  CONSTRAINT "posts_pkey" PRIMARY KEY (id),
  CONSTRAINT "posts_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100))),
  "artist_id"  uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "posts_check" CHECK ((image_path = (((artist_id)::text || '/posts/'::text) || (id)::text)))
);

ALTER TABLE "public"."posts"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at DESC);

CREATE POLICY "posts: select all" ON "public"."posts"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

REVOKE ALL ON TABLE "public"."posts" FROM "anon";

GRANT SELECT ON TABLE "public"."posts" TO "anon";

REVOKE ALL ON TABLE "public"."posts" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."posts" TO "authenticated";

ALTER TABLE "public"."posts"
  ADD CONSTRAINT "posts_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX posts_artist_id_idx ON public.posts USING btree (artist_id);

CREATE POLICY "posts: delete own" ON "public"."posts"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = artist_id));

CREATE POLICY "posts: insert own artist" ON "public"."posts"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = artist_id) AND private.is_artist(artist_id)));
