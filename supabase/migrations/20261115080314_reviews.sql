CREATE TABLE "public"."reviews" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "request_id" uuid,
  "artist_id"  uuid                     NOT NULL,
  "category"   public.art_category      NOT NULL,
  "rating"     smallint                 NOT NULL,
  "comment"    text                     NOT NULL DEFAULT ''::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reviews_comment_check" CHECK ((char_length(comment) <= 1000)),
  CONSTRAINT "reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT "reviews_request_id_key" UNIQUE (request_id),
  "client_id"  uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."reviews"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;

CREATE INDEX reviews_artist_id_idx ON public.reviews USING btree (artist_id, created_at DESC);

CREATE POLICY "reviews: select all" ON "public"."reviews"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

REVOKE ALL ON TABLE "public"."reviews" FROM "anon";

GRANT SELECT ON TABLE "public"."reviews" TO "anon";

REVOKE ALL ON TABLE "public"."reviews" FROM "authenticated";

REVOKE ALL ("artist_id") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("artist_id") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("category") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("category") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("comment") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("comment"), UPDATE ("comment") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("rating") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("rating"), UPDATE ("rating") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("request_id") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("request_id") ON TABLE "public"."reviews" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."reviews" TO "authenticated";

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX reviews_client_id_idx ON public.reviews USING btree (client_id);

CREATE POLICY "reviews: delete own" ON "public"."reviews"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = client_id));

CREATE POLICY "reviews: insert own completed request" ON "public"."reviews"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) AND (EXISTS ( SELECT 1
   FROM public.requests r
  WHERE
    ((r.id = reviews.request_id) AND (r.client_id = ( SELECT auth.uid() AS uid)) AND (r.artist_id = reviews.artist_id) AND (r.category = reviews.category) AND (r.status =
    'completed'::public.request_status))))));

CREATE POLICY "reviews: update own" ON "public"."reviews"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = client_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = client_id));
