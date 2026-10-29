SET local check_function_bodies = off;

DROP POLICY "conversations: insert own" ON "public"."conversations";

DROP POLICY "requests: insert own" ON "public"."requests";

CREATE OR REPLACE FUNCTION private.is_artist (
  uid uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (select 1 from public.profiles where id = uid and role = 'artist');
$function$;

CREATE POLICY "conversations: insert own" ON "public"."conversations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) AND private.is_artist(artist_id)));

CREATE POLICY "requests: insert own" ON "public"."requests"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = client_id) AND (status = 'pending'::public.request_status) AND private.is_artist(artist_id)));

REVOKE ALL ON FUNCTION "private"."is_artist"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_artist"(uuid) TO "authenticated";
