CREATE TABLE "public"."contact_methods" (
  "telegram"  text,
  "facebook"  text,
  "instagram" text,
  CONSTRAINT "contact_methods_facebook_check" CHECK ((facebook ~ '^[A-Za-z0-9.]{5,50}$'::text)),
  CONSTRAINT "contact_methods_instagram_check" CHECK ((instagram ~ '^[A-Za-z0-9._]{1,30}$'::text)),
  CONSTRAINT "contact_methods_telegram_check" CHECK ((telegram ~ '^[A-Za-z0-9_]{5,32}$'::text)),
  "user_id"   uuid NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "contact_methods_pkey" PRIMARY KEY (user_id)
);

ALTER TABLE "public"."contact_methods"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."contact_methods" FROM "anon";

ALTER TABLE "public"."profiles"
  ADD COLUMN "username" text;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_username_check" CHECK ((username ~ '^[a-z0-9_]{3,30}$'::text));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_username_key" UNIQUE (username);

REVOKE ALL ON TABLE "public"."contact_methods" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "public"."contact_methods" TO "authenticated";

ALTER TABLE "public"."contact_methods"
  ADD CONSTRAINT "contact_methods_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "contact_methods: insert own" ON "public"."contact_methods"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "contact_methods: select own or request partner" ON "public"."contact_methods"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.requests r
  WHERE
    (((r.client_id = ( SELECT auth.uid() AS uid)) AND (r.artist_id = contact_methods.user_id)) OR ((r.artist_id = ( SELECT auth.uid() AS uid)) AND (r.client_id =
    contact_methods.user_id)))))));

CREATE POLICY "contact_methods: update own" ON "public"."contact_methods"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
