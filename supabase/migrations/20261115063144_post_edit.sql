CREATE POLICY "posts: update own" ON "public"."posts"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = artist_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = artist_id));

GRANT UPDATE ("title", "caption", "category") ON TABLE "public"."posts" TO "authenticated";
