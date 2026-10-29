SET local check_function_bodies = off;

DROP POLICY "profiles: select own, artists, or staff" ON "public"."profiles";

CREATE TABLE "public"."conversations" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "artist_id"       uuid                     NOT NULL,
  "last_message_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "conversations_pkey" PRIMARY KEY (id),
  "client_id"       uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "conversations_check" CHECK ((client_id <> artist_id)),
  CONSTRAINT "conversations_client_id_artist_id_key" UNIQUE (client_id, artist_id)
);

ALTER TABLE "public"."conversations"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."conversations" FROM "anon";

CREATE TABLE "public"."messages" (
  "id"              bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "conversation_id" uuid                     NOT NULL,
  "body"            text                     NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "messages_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000))),
  CONSTRAINT "messages_pkey" PRIMARY KEY (id),
  "sender_id"       uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."messages"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."messages" FROM "anon";

CREATE TABLE "public"."requests" (
  "id"        uuid                NOT NULL DEFAULT gen_random_uuid(),
  "artist_id" uuid                NOT NULL,
  "category"  public.art_category NOT NULL,
  "brief"     text                NOT NULL,
  "budget"    integer,
  "currency"  text                NOT NULL DEFAULT 'USD'::text,
  "deadline"  date,
  CONSTRAINT "requests_brief_check" CHECK (((char_length(brief) >= 1) AND (char_length(brief) <= 2000))),
  CONSTRAINT "requests_budget_check" CHECK ((budget >= 0)),
  CONSTRAINT "requests_currency_check" CHECK ((currency = ANY (ARRAY['USD'::text, 'KHR'::text]))),
  CONSTRAINT "requests_pkey" PRIMARY KEY (id),
  "client_id" uuid                NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "requests_check" CHECK ((client_id <> artist_id))
);

ALTER TABLE "public"."requests"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."requests" FROM "anon";

CREATE TYPE "public"."request_status" AS ENUM (
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'delivered',
  'completed'
);

ALTER TABLE "public"."requests"
  ADD COLUMN "status" public.request_status NOT NULL DEFAULT 'pending'::public.request_status;

ALTER TABLE "public"."requests"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."requests"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION private.check_request_transition()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  actor uuid := (select auth.uid());
  step text := old.status || '>' || new.status;
begin
  if new.status is distinct from old.status and not (
    (actor = old.artist_id and step in ('pending>accepted', 'pending>declined', 'accepted>delivered', 'accepted>cancelled'))
    or (actor = old.client_id and step in ('pending>cancelled', 'delivered>completed', 'accepted>cancelled'))
  ) then
    raise exception 'Cannot change request from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.touch_conversation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$function$;

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE "public"."requests"
  ADD CONSTRAINT "requests_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX conversations_artist_id_idx ON public.conversations USING btree (artist_id);

CREATE INDEX messages_conversation_id_created_at_idx ON public.messages USING btree (conversation_id, created_at);

CREATE INDEX requests_artist_id_idx ON public.requests USING btree (artist_id);

CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION private.touch_conversation();

CREATE TRIGGER on_request_updated
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION private.check_request_transition();

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."messages";

REVOKE ALL ON FUNCTION "private"."check_request_transition"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."touch_conversation"() FROM PUBLIC;

REVOKE ALL ON TABLE "public"."conversations" FROM "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."conversations" TO "authenticated";

REVOKE ALL ON TABLE "public"."messages" FROM "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."messages" TO "authenticated";

REVOKE ALL ON TABLE "public"."requests" FROM "authenticated";

REVOKE ALL ("status") ON TABLE "public"."requests" FROM "authenticated";

GRANT UPDATE ("status") ON TABLE "public"."requests" TO "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."requests" TO "authenticated";

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "conversations: insert own" ON "public"."conversations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = conversations.artist_id) AND (p.role = 'artist'::public.user_role))))));

CREATE POLICY "conversations: select participant" ON "public"."conversations"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = artist_id)));

CREATE POLICY "messages: select participant" ON "public"."messages"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((( SELECT auth.uid() AS uid) = c.client_id) OR (( SELECT auth.uid() AS uid) = c.artist_id))))));

CREATE POLICY "profiles: select own, artists, partners, or staff" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((ROLE = 'artist'::public.user_role) OR (( SELECT auth.uid() AS uid) = id) OR (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE (((c.client_id = ( SELECT auth.uid() AS uid)) AND (c.artist_id = profiles.id)) OR ((c.artist_id = ( SELECT auth.uid() AS uid)) AND (c.client_id = profiles.id))))) OR
    ( SELECT private.is_admin() AS is_admin)));

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX messages_sender_id_idx ON public.messages USING btree (sender_id);

CREATE POLICY "messages: insert participant" ON "public"."messages"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((( SELECT auth.uid() AS uid) = c.client_id) OR (( SELECT auth.uid() AS uid) = c.artist_id)))))));

ALTER TABLE "public"."requests"
  ADD CONSTRAINT "requests_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX requests_client_id_idx ON public.requests USING btree (client_id);

CREATE POLICY "requests: insert own" ON "public"."requests"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) AND (status = 'pending'::public.request_status) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = requests.artist_id) AND (p.role = 'artist'::public.user_role))))));

CREATE POLICY "requests: select participant" ON "public"."requests"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = artist_id)));

CREATE POLICY "requests: update participant" ON "public"."requests"
  FOR UPDATE
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = artist_id)))
  WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) OR (( SELECT auth.uid() AS uid) = artist_id)));
