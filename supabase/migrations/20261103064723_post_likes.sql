CREATE TABLE "public"."post_likes" (
  "post_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_id"    uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "post_likes_pkey" PRIMARY KEY (user_id, post_id)
);

ALTER TABLE "public"."post_likes"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."post_likes" FROM "anon";

ALTER TABLE "public"."post_likes"
  ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

CREATE INDEX post_likes_post_id_idx ON public.post_likes USING btree (post_id);

REVOKE ALL ON TABLE "public"."post_likes" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."post_likes" TO "authenticated";

ALTER TABLE "public"."post_likes"
  ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "post_likes: delete own" ON "public"."post_likes"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "post_likes: insert own" ON "public"."post_likes"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "post_likes: select own" ON "public"."post_likes"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));
