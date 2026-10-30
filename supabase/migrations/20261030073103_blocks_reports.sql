SET local check_function_bodies = off;

DROP POLICY "conversations: insert own" ON "public"."conversations";

DROP POLICY "messages: insert participant" ON "public"."messages";

DROP POLICY "requests: insert own" ON "public"."requests";

CREATE TABLE "public"."blocks" (
  "blocked_id" uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "blocker_id" uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "blocks_check" CHECK ((blocker_id <> blocked_id)),
  CONSTRAINT "blocks_pkey" PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE "public"."blocks"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."blocks" FROM "anon";

CREATE TABLE "public"."reports" (
  "id"          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "reported_id" uuid   NOT NULL,
  CONSTRAINT "reports_pkey" PRIMARY KEY (id),
  "reporter_id" uuid   DEFAULT auth.uid(),
  CONSTRAINT "reports_check" CHECK ((reporter_id <> reported_id))
);

ALTER TABLE "public"."reports"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."reports" FROM "anon";

CREATE TYPE "public"."report_reason" AS ENUM (
  'spam',
  'harassment',
  'scam',
  'inappropriate',
  'impersonation',
  'ai_generated',
  'other'
);

ALTER TABLE "public"."reports"
  ADD COLUMN "reason" public.report_reason NOT NULL;

ALTER TABLE "public"."reports"
  ADD COLUMN "details" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."reports"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."reports"
  ADD COLUMN "resolved_at" timestamp WITH time zone;

CREATE OR REPLACE FUNCTION private.is_blocked (
  a uuid,
  b uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$function$;

ALTER TABLE "public"."blocks"
  ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY (blocked_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_details_check" CHECK ((char_length(details) <= 1000));

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_reported_id_fkey" FOREIGN KEY (reported_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX blocks_blocked_id_idx ON public.blocks USING btree (blocked_id);

CREATE INDEX reports_reported_id_idx ON public.reports USING btree (reported_id);

CREATE POLICY "conversations: insert own" ON "public"."conversations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) AND private.is_artist(artist_id) AND (NOT private.is_blocked(client_id, artist_id))));

CREATE POLICY "messages: insert participant" ON "public"."messages"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE
    ((c.id = messages.conversation_id) AND ((( SELECT auth.uid() AS uid) = c.client_id) OR (( SELECT auth.uid() AS uid) = c.artist_id)) AND (NOT private.is_blocked(c.client_id,
    c.artist_id)))))));

CREATE POLICY "reports: update staff" ON "public"."reports"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.is_admin() AS is_admin))
  WITH CHECK (( SELECT private.is_admin() AS is_admin));

CREATE POLICY "requests: insert own" ON "public"."requests"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    (((( SELECT auth.uid() AS uid) = client_id) AND (status = 'pending'::public.request_status) AND private.is_artist(artist_id) AND (NOT private.is_blocked(client_id,
    artist_id))));

REVOKE ALL ON FUNCTION "private"."is_blocked"(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_blocked"(uuid, uuid) TO "authenticated";

REVOKE ALL ON TABLE "public"."blocks" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."blocks" TO "authenticated";

REVOKE ALL ON TABLE "public"."reports" FROM "authenticated";

REVOKE ALL ("resolved_at") ON TABLE "public"."reports" FROM "authenticated";

GRANT UPDATE ("resolved_at") ON TABLE "public"."reports" TO "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."reports" TO "authenticated";

ALTER TABLE "public"."blocks"
  ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY (blocker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "blocks: delete own" ON "public"."blocks"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = blocker_id));

CREATE POLICY "blocks: insert own" ON "public"."blocks"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = blocker_id));

CREATE POLICY "blocks: select own" ON "public"."blocks"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = blocker_id));

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX reports_reporter_id_idx ON public.reports USING btree (reporter_id);

CREATE POLICY "reports: insert own" ON "public"."reports"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = reporter_id) AND (resolved_at IS NULL)));

CREATE POLICY "reports: select own or staff" ON "public"."reports"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = reporter_id) OR ( SELECT private.is_admin() AS is_admin)));
