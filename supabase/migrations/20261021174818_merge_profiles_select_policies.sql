DROP POLICY "profiles: select all (staff)" ON "public"."profiles";

DROP POLICY "profiles: select own" ON "public"."profiles";

ALTER POLICY "profiles: select artists" ON "public"."profiles" TO "anon";

CREATE POLICY "profiles: select own, artists, or staff" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((ROLE = 'artist'::public.user_role) OR (( SELECT auth.uid() AS uid) = id) OR ( SELECT private.is_admin() AS is_admin)));
