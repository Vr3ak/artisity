SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.guard_conversation_read()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.conversation_id := old.conversation_id;
  if new.last_read_id <= old.last_read_id then
    return null; -- skip the update: nothing new was read
  end if;
  new.read_at := now();
  return new;
end;
$function$;

REVOKE ALL ("conversation_id") ON TABLE "public"."conversation_reads" FROM "authenticated";

GRANT INSERT ("conversation_id"), UPDATE ("conversation_id") ON TABLE "public"."conversation_reads" TO "authenticated";
