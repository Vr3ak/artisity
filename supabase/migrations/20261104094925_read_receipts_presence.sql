SET local check_function_bodies = off;

CREATE TABLE "public"."conversation_reads" (
  "conversation_id" uuid                     NOT NULL,
  "last_read_id"    bigint                   NOT NULL,
  "read_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "user_id"         uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "conversation_reads_pkey" PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE "public"."conversation_reads"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."conversation_reads" FROM "anon";

CREATE OR REPLACE FUNCTION private.guard_conversation_read()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if new.last_read_id <= old.last_read_id then
    return null; -- skip the update: nothing new was read
  end if;
  new.read_at := now();
  return new;
end;
$function$;

ALTER TABLE "public"."conversation_reads"
  ADD CONSTRAINT "conversation_reads_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

CREATE TRIGGER on_conversation_read_updating
  BEFORE UPDATE ON public.conversation_reads
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_conversation_read();

CREATE POLICY "conversation_reads: select participant" ON "public"."conversation_reads"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = conversation_reads.conversation_id) AND ((( SELECT auth.uid() AS uid) = c.client_id) OR (( SELECT auth.uid() AS uid) = c.artist_id))))));

CREATE POLICY "realtime: read online presence" ON "realtime"."messages"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT realtime.topic() AS topic) = 'online'::text) AND (EXTENSION = 'presence'::text)));

CREATE POLICY "realtime: track online presence" ON "realtime"."messages"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT realtime.topic() AS topic) = 'online'::text) AND (extension = 'presence'::text)));

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."conversation_reads";

REVOKE ALL ON FUNCTION "private"."guard_conversation_read"() FROM PUBLIC;

REVOKE ALL ON TABLE "public"."conversation_reads" FROM "authenticated";

GRANT INSERT ("conversation_id") ON TABLE "public"."conversation_reads" TO "authenticated";

GRANT INSERT ("last_read_id"), UPDATE ("last_read_id") ON TABLE "public"."conversation_reads" TO "authenticated";

GRANT SELECT ON TABLE "public"."conversation_reads" TO "authenticated";

ALTER TABLE "public"."conversation_reads"
  ADD CONSTRAINT "conversation_reads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX conversation_reads_user_id_idx ON public.conversation_reads USING btree (user_id);

CREATE POLICY "conversation_reads: insert own" ON "public"."conversation_reads"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = conversation_reads.conversation_id) AND ((( SELECT auth.uid() AS uid) = c.client_id) OR (( SELECT auth.uid() AS uid) = c.artist_id)))))));

CREATE POLICY "conversation_reads: update own" ON "public"."conversation_reads"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
