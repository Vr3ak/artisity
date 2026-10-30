CREATE POLICY "contact_methods: select artist" ON "public"."contact_methods"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = contact_methods.user_id) AND (p.role = 'artist'::public.user_role)))));

REVOKE ALL ON TABLE "public"."contact_methods" FROM "anon";

GRANT SELECT ON TABLE "public"."contact_methods" TO "anon";
