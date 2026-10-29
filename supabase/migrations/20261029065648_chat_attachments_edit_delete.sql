SET local check_function_bodies = off;

ALTER TABLE "public"."messages"
  DROP CONSTRAINT "messages_body_check";

ALTER TABLE "public"."messages"
  ADD COLUMN "attachment_path" text;

ALTER TABLE "public"."messages"
  ADD COLUMN "attachment_type" text;

ALTER TABLE "public"."messages"
  ADD COLUMN "attachment_name" text;

ALTER TABLE "public"."messages"
  ADD COLUMN "attachment_size" integer;

ALTER TABLE "public"."messages"
  ADD COLUMN "edited_at" timestamp WITH time zone;

ALTER TABLE "public"."messages"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "public"."messages"
  ALTER COLUMN "body" SET DEFAULT ''::text;

CREATE OR REPLACE FUNCTION private.guard_message_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if old.deleted_at is not null then
    raise exception 'message is deleted' using errcode = '23514';
  end if;
  if new.deleted_at is not null then
    new.deleted_at := now();
    new.edited_at := null;
    new.body := '';
    new.attachment_path := null;
    new.attachment_type := null;
    new.attachment_name := null;
    new.attachment_size := null;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$function$;

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_body_check" CHECK ((char_length(body) <= 2000));

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_check1" CHECK (((deleted_at IS NOT NULL) OR (char_length(body) > 0) OR (attachment_path IS NOT NULL)));

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_check" CHECK ((split_part(attachment_path, '/'::text, 1) = (conversation_id)::text));

CREATE TRIGGER on_message_updating
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_message_update();

CREATE POLICY "messages: update own" ON "public"."messages"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = sender_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = sender_id));

CREATE POLICY "chat-attachments: delete own" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'chat-attachments'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "chat-attachments: insert participant" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    (((bucket_id = 'chat-attachments'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND ((storage.foldername(name))[1] IN ( SELECT
    (conversations.id)::text AS id
   FROM public.conversations))));

CREATE POLICY "chat-attachments: select participant" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'chat-attachments'::text) AND ((storage.foldername(name))[1] IN ( SELECT (conversations.id)::text AS id
   FROM public.conversations))));

REVOKE ALL ON FUNCTION "private"."guard_message_update"() FROM PUBLIC;

REVOKE ALL ("body") ON TABLE "public"."messages" FROM "authenticated";

GRANT UPDATE ("body") ON TABLE "public"."messages" TO "authenticated";

REVOKE ALL ("deleted_at") ON TABLE "public"."messages" FROM "authenticated";

GRANT UPDATE ("deleted_at") ON TABLE "public"."messages" TO "authenticated";
