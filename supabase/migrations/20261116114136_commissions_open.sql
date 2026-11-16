SET local check_function_bodies = off;

DROP POLICY "requests: insert own" ON "public"."requests";

ALTER TABLE "public"."profiles"
  ADD COLUMN "commissions_open" boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION private.accepts_requests (
  uid uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (select 1 from public.profiles where id = uid and role = 'artist' and commissions_open);
$function$;

CREATE POLICY "requests: insert own" ON "public"."requests"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    (((( SELECT auth.uid() AS uid) = client_id) AND (status = 'pending'::public.request_status) AND private.accepts_requests(artist_id) AND (NOT private.is_blocked(client_id,
    artist_id))));

REVOKE ALL ON FUNCTION "private"."accepts_requests"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."accepts_requests"(uuid) TO "authenticated";
